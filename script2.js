(() => {
  const CFG = {
    CARDS: [
      { img:"https://gambar.fit/baksototo/mahjong/pgred.webp",   title:"Mahjong Ways Hitam  x1000" },
      { img:"https://gambar.fit/baksototo/mahjong/pggreen.webp", title:"Mahjong Ways 2 Hitam x1000" }
    ],
    WATCH_URL_HINTS: [
      "new-webpages.php?content=slot",
      "new-showprovider.php",
      "new-webdata.php"
    ]
  };

  const MARK_ATTR="data-injected-by";
  const MARK_VAL ="slot-injector-noclick";
  const $=(s,r=document)=>r.querySelector(s);
  const slotArea=()=>$("div.slotarea");

  let adjusting=false, armedKeep=false, armedURL=false;

  /** Hanya jalan di ?content=slot&provider=pg */
  function isPgPage() {
    try {
      const u = new URL(location.href);
      const content  = (u.searchParams.get("content")||"").toLowerCase();
      const provider = (u.searchParams.get("provider")||"").toLowerCase();
      if (content === "slot" && provider === "pg") return true;
    } catch {}
    // Heuristik fallback (kalau param tak ada, mis. SPA):
    const area = slotArea();
    if (area && area.querySelector('img[src*="/pg/"], img[src*="provider=pg"]')) return true;
    return false;
  }

  function isOrderOk(area){
    const firstN=[...area.children].slice(0, CFG.CARDS.length);
    for (let i=0;i<CFG.CARDS.length;i++){
      const want=`figure.gameitem[${MARK_ATTR}="${MARK_VAL}-${i}"]`;
      if (!firstN[i] || !firstN[i].matches?.(want)) return false;
    }
    return true;
  }

  function ensureCard(area, idx){
    const sel=`figure.gameitem[${MARK_ATTR}="${MARK_VAL}-${idx}"]`;
    let fig=$(sel, area);
    if(!fig){
      fig=document.createElement("figure");
      fig.className="gameitem";
      fig.setAttribute(MARK_ATTR, `${MARK_VAL}-${idx}`);
      fig.style.display="inline-block";
      fig.style.position="relative";

      const img=document.createElement("img");
      img.style.width="150px";

      const cap=document.createElement("figcaption");
      cap.style.textAlign="center";
      cap.style.marginTop="5px";

      fig.appendChild(img);
      fig.appendChild(cap);
    }
    const cfg=CFG.CARDS[idx];
    $("img",fig).src=cfg.img;
    $("img",fig).alt=cfg.title||"";
    $("figcaption",fig).textContent=cfg.title||"";
    return fig;
  }

  function placeAll(area){
    if (!area) return false;
    if (isOrderOk(area)) return true;
    adjusting=true;
    for (let i=CFG.CARDS.length-1;i>=0;i--){
      const fig=ensureCard(area,i);
      if (fig && area.firstElementChild!==fig){
        area.insertBefore(fig, area.firstElementChild||null);
      }
    }
    adjusting=false;
    return true;
  }

  // Bersihkan kartu injeksi saat bukan halaman PG
  function cleanup() {
    const area = slotArea();
    if (!area) return;
    [...area.querySelectorAll(`figure.gameitem[${MARK_ATTR}^="${MARK_VAL}-"]`)]
      .forEach(n => n.remove());
  }

  function inject(){
    if (!isPgPage()) { cleanup(); return false; }
    const area=slotArea();
    if(!area || !CFG.CARDS?.length) return false;
    const ok = placeAll(area);
    if (ok && !armedKeep) armKeepAlive();
    return ok;
  }

  // keep order & re-attach jika dihapus, tapi hanya saat PG aktif
  function armKeepAlive(){
    const area=slotArea();
    if(!area || armedKeep) return;
    const obs=new MutationObserver(()=>{
      if(!isPgPage()){ cleanup(); return; }
      if(adjusting) return;
      if(!isOrderOk(area)) placeAll(area);
    });
    obs.observe(area,{childList:true});
    armedKeep=true;
  }

  // Pantau perubahan URL (SPA: pushState/replaceState/popstate)
  function armUrlWatch(){
    if (armedURL) return;
    const fire = () => { inject(); };
    const _ps = history.pushState, _rs = history.replaceState;
    history.pushState = function(...a){ const r=_ps.apply(this,a); queueMicrotask(fire); return r; };
    history.replaceState = function(...a){ const r=_rs.apply(this,a); queueMicrotask(fire); return r; };
    window.addEventListener('popstate', fire);
    armedURL = true;
  }
  armUrlWatch();

  // --- bootstrap pertama
  if(!inject()){
    const bootObs=new MutationObserver(()=>{ if(inject()) bootObs.disconnect(); });
    bootObs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>bootObs.disconnect(),20000);
  }

  // --- observe global: bila .slotarea muncul lagi (mis. setelah klik menu)
  const globalObs=new MutationObserver((muts)=>{
    const touched = muts.some(m =>
      [...(m.addedNodes||[])].some(n=> n.nodeType===1 && (n.matches?.("div.slotarea") || n.querySelector?.("div.slotarea"))) ||
      (m.target && m.target.nodeType===1 && m.target.matches?.("div.slotarea"))
    );
    if (touched) inject();
  });
  globalObs.observe(document.body||document.documentElement,{childList:true,subtree:true});

  // --- hook fetch/XHR untuk reinject setelah AJAX selesai (hanya kalau halaman PG)
  const shouldWatch=(url)=> {
    try{ url=String(url);}catch{}
    return CFG.WATCH_URL_HINTS.some(h=> url && url.indexOf(h)!==-1);
  };
  const reinjectSoon=()=>[0,120,300,800].forEach(t=>setTimeout(inject,t));

  if(!window.__slotNoClickFetchHooked__){
    window.__slotNoClickFetchHooked__=true;
    const _fetch=window.fetch;
    window.fetch=function(...args){
      try{
        const url=args[0] && (args[0].url || args[0]);
        if(shouldWatch(url)){
          return _fetch.apply(this,args).then(res=>{ queueMicrotask(reinjectSoon); return res; });
        }
      }catch{}
      return _fetch.apply(this,args);
    };
  }

  if(!window.__slotNoClickXHRHooked__){
    window.__slotNoClickXHRHooked__=true;
    const _open=XMLHttpRequest.prototype.open;
    const _send=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open=function(method,url,...rest){ this.__watch_url=shouldWatch(url); return _open.call(this,method,url,...rest); };
    XMLHttpRequest.prototype.send=function(...args){ if(this.__watch_url) this.addEventListener("loadend", reinjectSoon, {once:true}); return _send.apply(this,args); };
  }
})();
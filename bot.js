(function(){
  "use strict";

  const CFG = {
    LS_KEY: "kang_ai_cards_state_v1",
    CONNECT_DELAY_MS: 7000,  // ubah kalau mau lebih lama
    CARDS: [
      { key:"bonus_winrate",  title:"AI Winrate 2x",      img:"https://joko4d-official.b-cdn.net/booster-ai.webp" },
      { key:"bonus_mahjong",  title:"AI Booster Mahjong",   img:"https://joko4d-official.b-cdn.net/booster-mahjong.webp"  },
      { key:"bonus_pragmatic",title:"AI Booster Pragmatic", img:"https://joko4d-official.b-cdn.net/booster-pragmatic.webp"  }
    ]
  };

  /* ===== CSS: 3 kolom + clear floats ===== */
  const css = `
  .kang-ai-wrap{
    margin:10px auto 14px;max-width:1200px;padding:0 6px;
    clear:both; width:100%;
  }
  .kang-ai-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
  .kang-ai-card{
    background: #2e3338;border:1px solid #202430;border-radius:14px;color:#eaecef;
    padding:8px;text-align:center;display:flex;flex-direction:column;align-items:center;
    box-shadow:0 3px 10px rgba(0,0,0,.18);
  }
  .kang-ai-logo-top{
    width:120px;height:120px;object-fit:contain;
    border-radius:10px;background:#0d0f15;border:1px solid #252a36;margin-bottom:6px;
  }
  .kang-ai-title{
    font-weight:700;font-size:11.5px;line-height:1.25;margin-bottom:6px;
    white-space:normal;overflow:visible;text-overflow:unset;max-width:100%;
    text-align:center;word-break:break-word;
  }
  .kang-ai-toggle{margin:4px 0 6px}
  .kang-btn-toggle{
    min-width:78px;padding:7px 9px;border-radius:999px;font-weight:800;font-size:11px;
    border:1px solid transparent;background:#2b2f3a;color:#d1d5db;cursor:pointer;transition:.2s;
    box-shadow:0 2px 5px rgba(0,0,0,.25)
  }
  .kang-btn-toggle.on{background:#0a3b29;color:#34d399;border-color:#0f5a41}
  .kang-btn-toggle.off{background:#ac4e4e;color:#fca5a5;border-color:#7f1d1d}
  .kang-btn-toggle:disabled{opacity:.7;cursor:not-allowed}

  .kang-ai-status{padding-top:6px;display:inline-flex;align-items:center;justify-content:center;gap:6px}

  .kang-dot{width:8px;height:8px;border-radius:50%}
  .kang-dot.on{background:#34d399;box-shadow:0 0 8px #34d399}
  .kang-dot.off{background:#ac4e4e;box-shadow:0 0 8px #ef4444}
  .kang-dot.loading{background:#60a5fa;box-shadow:0 0 8px #60a5fa}

  /* === PILL + PROGRESS di belakang teks (warna lama), tanpa bubble === */
  .kang-pill{
    position:relative;font-size:10.5px;font-weight:700;border-radius:999px;
    padding:4px 10px;border:1px solid transparent;white-space:nowrap;overflow:hidden;
  }
  .pill-on{background:#082f1e;color:#34d399;border-color:#065f46}
  .pill-off{background:#ac4e4e;color:#fda4af;border-color:#7f1d1d}
  .pill-loading{background:#0c1b2a;color:#cfe0ff;border-color:#1e3a8a}

  .kang-pill .pill-track{
    position:absolute;left:2px;right:2px;top:2px;bottom:2px;
    border-radius:999px;background:#141d2c;overflow:hidden;z-index:0;
  }
  .kang-pill .pill-fill{
    position:absolute;left:0;top:0;bottom:0;width:0%;
    background:#2d67ff; /* warna bar lama */
  }
  .kang-pill .pill-text{position:relative;z-index:1}
  `;

  function injectStyle(id, cssText){
    if(document.getElementById(id)) return;
    const st=document.createElement("style");st.id=id;st.textContent=cssText;document.head.appendChild(st);
  }
  function isLoggedIn(){
    const us=document.querySelector('.userstatus');
    if(us && (us.value==="1"||us.value===1)) return true;
    const hasLogout=!!document.querySelector('a[href*="logout"],a[href*="signout"],button[id*="logout"]');
    const hasLoginForm=!!(document.querySelector('input[type="password"]') && document.querySelector('input[name*="user"],input[name*="email"]'));
    if(hasLogout) return true; if(hasLoginForm) return false;
    return !!document.querySelector('.user,.username,.user-info,[data-user]');
  }
  const loadState=()=>{try{return JSON.parse(localStorage.getItem(CFG.LS_KEY)||"{}");}catch(_){return{}};};
  const saveState=(s)=>{try{localStorage.setItem(CFG.LS_KEY,JSON.stringify(s));}catch(_){}}; 
  const delKey=(k)=>{const s=loadState();delete s[k];saveState(s);};

  /* progress di dalam pill (tanpa bubble) */
  function animateBarInPill(pillEl, duration){
    let track=pillEl.querySelector('.pill-track');
    if(!track){
      track=document.createElement('div');
      track.className='pill-track';
      track.innerHTML='<div class="pill-fill"></div>';
      pillEl.prepend(track);
    }
    const fill=track.querySelector('.pill-fill');

    let start=null;
    function step(ts){
      if(!start) start=ts;
      const p=Math.min(1,(ts-start)/duration);
      fill.style.width=(p*100)+'%';
      if(p<1) requestAnimationFrame(step);
    }
    fill.style.width='0%';
    requestAnimationFrame(step);
  }
  function clearPillProgress(pillEl){
    const t=pillEl.querySelector('.pill-track'); if(t) t.remove();
  }

  function setStatus(cardEl,mode){
    const dot=cardEl.querySelector('.kang-dot');
    const pill=cardEl.querySelector('.kang-pill');

    pill.classList.remove('pill-on','pill-off','pill-loading');
    dot.classList.remove('on','off','loading');

    // pastikan wrapper teks ada
    let txt=pill.querySelector('.pill-text');
    if(!txt){ txt=document.createElement('span'); txt.className='pill-text'; pill.appendChild(txt); }

    if(mode==='loading'){
      pill.classList.add('pill-loading'); dot.classList.add('loading');
      txt.textContent='Loadingâ€¦';
      animateBarInPill(pill, CFG.CONNECT_DELAY_MS);
    }else if(mode==='on'){
      pill.classList.add('pill-on'); dot.classList.add('on');
      txt.textContent='Aktif';
      clearPillProgress(pill);
    }else{
      pill.classList.add('pill-off'); dot.classList.add('off');
      txt.textContent='Mati';
      clearPillProgress(pill);
    }
  }

  function renderGrid(){
    injectStyle('kang-ai-style-userarea', css);
    const state=loadState();
    const wrap=document.createElement('div');
    wrap.className='kang-ai-wrap';
    wrap.setAttribute('data-injected-by','kang-ai-grid-userarea');
    wrap.innerHTML=`<div class="kang-ai-grid"></div>`;
    const grid=wrap.querySelector('.kang-ai-grid');

    CFG.CARDS.forEach(c=>{
      const on=!!state[c.key];
      const card=document.createElement('div');
      card.className='kang-ai-card';
      card.innerHTML=`
        <img class="kang-ai-logo-top" src="${c.img}" alt="${c.title}">
        <div class="kang-ai-title">${c.title}</div>
        <div class="kang-ai-toggle">
          <button class="kang-btn-toggle ${on?'on':'off'}" type="button">${on?'ON':'OFF'}</button>
        </div>
        <div class="kang-ai-status">
          <span class="kang-dot ${on?'on':'off'}"></span>
          <span class="kang-pill ${on?'pill-on':'pill-off'}">
            <span class="pill-text">${on?'Aktif':'Mati'}</span>
          </span>
        </div>
      `;
      const btn=card.querySelector('.kang-btn-toggle');
      btn.addEventListener('click',()=>{
        btn.disabled=true;
        if(btn.classList.contains('off')){
          setStatus(card,'loading');
          setTimeout(()=>{ 
            btn.classList.remove('off');btn.classList.add('on');btn.textContent='ON';
            setStatus(card,'on');
            const s=loadState();s[c.key]=true;saveState(s);
            btn.disabled=false;
          }, CFG.CONNECT_DELAY_MS);
        }else{
          btn.classList.remove('on');btn.classList.add('off');btn.textContent='OFF';
          setStatus(card,'off');
          if(!isLoggedIn()) delKey(c.key); else { const s=loadState(); s[c.key]=false; saveState(s); }
          btn.disabled=false;
        }
      });
      grid.appendChild(card);
    });
    return wrap;
  }

  function mount(){
    if(document.querySelector('[data-injected-by="kang-ai-grid-userarea"]')) return true;

    // sisipkan SETELAH baris yang memuat #winBet (masih sebelum .clearfix)
    const winBet = document.getElementById('winBet');
    const row = winBet ? winBet.closest('.col-xs-12') : null;

    if(row && row.nextSibling){
      row.parentNode.insertBefore(renderGrid(), row.nextSibling);
      return true;
    }

    // fallback: tepat sebelum .clearfix
    const clearfix=document.querySelector('.clearfix');
    if(clearfix){
      clearfix.parentNode.insertBefore(renderGrid(), clearfix);
      return true;
    }
    return false;
  }

  if(!mount()){
    const obs=new MutationObserver(()=>{ if(mount()) obs.disconnect(); });
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
(function(){
  "use strict";

  // ===== CSS responsif utk kartu promo =====
  (function addStyles(){
    if (document.getElementById('atrio-pg-cards-css')) return;
    const css = `
		div#pgslot {
			display: grid !important;
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			gap: 1px;
		}
		div#pgslot > div {
			height: 200px !important;
			width: 170px !important;
			float: left;
			text-align: center;
			vertical-align: top;
		}
		.atrio-card a img{ width:160px; cursor:pointer; }
		.atrio-card a div{ text-align:center; margin-top:5px; cursor:pointer; }
		`;
    const style = document.createElement('style');
    style.id = 'atrio-pg-cards-css';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ===== Config kartu promo =====
  const CARDS = [
    { key:"mw",  img:"https://gambar.fit/baksototo/mahjong/pgred.webp",
      title:"Mahjong Ways x1000",  imgSel:'img[src*="mahjong-ways."]' },
    { key:"mw2", img:"https://gambar.fit/baksototo/mahjong/pggreen.webp",
      title:"Mahjong Ways 2 Hitam x1000", imgSel:'img[src*="mahjong-ways2."]' }
  ];

  const TARGETS = ["pgslot","pghot"]; // dua tab

  function getRealHref(cfg, gridId){
    const grid = document.querySelector('#games_window_pg #'+gridId);
    if(!grid) return null;
    const im = grid.querySelector(cfg.imgSel);
    const a  = im?.closest('a');
    return a ? (a.getAttribute('href') || a.href) : null;
  }

  function insertCards(gridId){
    const grid = document.querySelector('#games_window_pg #'+gridId);
    if(!grid) return;
    const sample = grid.querySelector('div');
    if(!sample) return;

    CARDS.slice().reverse().forEach(cfg=>{
      if(document.getElementById('atrio-'+gridId+'-'+cfg.key)) return;

      const outer = document.createElement('div');
      outer.id = 'atrio-'+gridId+'-'+cfg.key;
      outer.className = 'atrio-card';

      const a = document.createElement('a');
      a.href = "javascript:void(0)";

      const img = document.createElement('img');
      img.src = cfg.img; img.alt = cfg.title;

      const cap = document.createElement('div');
      cap.textContent = cfg.title;

      a.appendChild(img); a.appendChild(cap);
      outer.appendChild(a);
      grid.insertBefore(outer, sample);

      a.addEventListener('click', function(e){
        e.preventDefault();
        const href = getRealHref(cfg, gridId);
        if(href) window.location.href = href;
        else alert("Link game belum siap");
      });
    });
  }

  function boot(){
    let tries=0;
    const timer = setInterval(()=>{
      TARGETS.forEach(insertCards);
      if(++tries>60) clearInterval(timer); // ~30 detik
    },500);
  }

  if(document.readyState!=="loading") boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();

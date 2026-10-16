/* ROX — shared site behaviour (dependency-free) */
(function () {
  var d = document;

  /* reveal on scroll */
  var rev = [].slice.call(d.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var i = [].indexOf.call(el.parentElement.children, el);
          var delay = el.hasAttribute('data-d') ? +el.getAttribute('data-d') : Math.min(i * 80, 480);
          el.style.transitionDelay = delay + 'ms';
          el.classList.add('revealed');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add('revealed'); });
  }

  /* header shade + floating button reveal */
  var hdr = d.querySelector('.hdr'), fab = d.querySelector('.fab');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (hdr) hdr.classList.toggle('scrolled', y > 40);
    if (fab) fab.classList.toggle('show', y > window.innerHeight * 0.5);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* full-screen menu */
  var btn = d.querySelector('.menu-btn'), menu = d.querySelector('.menu');
  if (btn && menu) {
    var topLinks = [].slice.call(menu.querySelectorAll('.menu-link'));
    var devToggle = menu.querySelector('.dev-toggle');
    var devSub = menu.querySelector('.dev-sub');
    function setDev(o) {
      if (!devToggle || !devSub) return;
      devToggle.setAttribute('aria-expanded', o ? 'true' : 'false');
      devSub.style.maxHeight = o ? devSub.scrollHeight + 'px' : '0';
      devSub.style.opacity = o ? '1' : '0';
    }
    function setMenu(o) {
      btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      menu.classList.toggle('open', o);
      d.body.style.overflow = o ? 'hidden' : '';
      if (o) { topLinks.forEach(function (l, i) { l.style.transitionDelay = (120 + i * 70) + 'ms'; }); }
      else { topLinks.forEach(function (l) { l.style.transitionDelay = '0ms'; }); setDev(false); }
    }
    btn.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    topLinks.forEach(function (a) {
      if (a === devToggle) return;
      var h = a.getAttribute('href') || '';
      if (h.charAt(0) === '#') a.addEventListener('click', function () { setMenu(false); });
    });
    if (devToggle) devToggle.addEventListener('click', function () { setDev(devToggle.getAttribute('aria-expanded') !== 'true'); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false);
    });
  }

  /* countdowns (full) */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var counts = [].slice.call(d.querySelectorAll('.count[data-target]'));
  function tick() {
    var now = Date.now();
    counts.forEach(function (c) {
      var diff = Math.max(0, new Date(c.getAttribute('data-target')).getTime() - now);
      var dd = Math.floor(diff / 86400000); diff -= dd * 86400000;
      var hh = Math.floor(diff / 3600000); diff -= hh * 3600000;
      var mm = Math.floor(diff / 60000); diff -= mm * 60000;
      var ss = Math.floor(diff / 1000);
      var vals = [String(dd), pad(hh), pad(mm), pad(ss)];
      var vs = c.querySelectorAll('.v');
      for (var i = 0; i < vs.length; i++) vs[i].textContent = vals[i];
    });
  }
  if (counts.length) { tick(); setInterval(tick, 1000); }

  /* mini countdowns on cards ("Xd Yh") */
  var minis = [].slice.call(d.querySelectorAll('.mini-count[data-target]'));
  function tickMini() {
    var now = Date.now();
    minis.forEach(function (m) {
      var diff = Math.max(0, new Date(m.getAttribute('data-target')).getTime() - now);
      var dd = Math.floor(diff / 86400000);
      var hh = Math.floor((diff - dd * 86400000) / 3600000);
      var b = m.querySelector('b'); if (b) b.textContent = dd + 'd ' + hh + 'h';
    });
  }
  if (minis.length) { tickMini(); setInterval(tickMini, 60000); }

  /* video hero: muted autoplay + sound + fullscreen */
  var stage = d.querySelector('.vstage');
  if (stage) {
    var v = stage.querySelector('video');
    var sBtn = stage.querySelector('[data-sound]');
    var fBtn = stage.querySelector('[data-full]');
    if (v) {
      var playIcon = stage.querySelector('.vplay');
      v.muted = true;
      var pr = v.play && v.play();
      if (pr && pr.catch) pr.catch(function () { if (playIcon) playIcon.classList.add('show'); });
      v.addEventListener('click', function () {
        if (v.paused) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
        else { v.pause(); }
      });
      v.addEventListener('play', function () { if (playIcon) playIcon.classList.remove('show'); });
      v.addEventListener('pause', function () { if (playIcon) playIcon.classList.add('show'); });
      if (sBtn) {
        var lab = sBtn.querySelector('.slabel');
        sBtn.addEventListener('click', function () {
          v.muted = !v.muted;
          if (!v.muted) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
          sBtn.setAttribute('data-on', v.muted ? '0' : '1');
          if (lab) lab.textContent = v.muted ? 'Sound' : 'Mute';
        });
      }
      function showRotate() {
        if (window.innerWidth >= window.innerHeight) return;   /* already landscape */
        var h = stage.querySelector('.rotate-hint');
        if (!h) { h = document.createElement('div'); h.className = 'rotate-hint'; h.textContent = '↻  Rotate your phone for full view'; stage.appendChild(h); }
        h.classList.add('show');
        clearTimeout(h._t); h._t = setTimeout(function () { h.classList.remove('show'); }, 3500);
      }
      function lockLandscape() {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').then(function () {}).catch(showRotate);
        } else { showRotate(); }
      }
      if (fBtn) {
        fBtn.addEventListener('click', function () {
          v.muted = false;
          var q = v.play(); if (q && q.catch) q.catch(function () {});
          if (stage.requestFullscreen) {
            var p = stage.requestFullscreen();
            if (p && p.then) p.then(lockLandscape).catch(function () {}); else lockLandscape();
          } else if (stage.webkitRequestFullscreen) {
            stage.webkitRequestFullscreen(); lockLandscape();
          } else if (v.webkitEnterFullscreen) {
            v.webkitEnterFullscreen();   /* iOS: native player rotates to landscape, no crop */
          }
        });
        var onFs = function () {
          var fs = document.fullscreenElement || document.webkitFullscreenElement;
          if (!fs) {
            if (screen.orientation && screen.orientation.unlock) { try { screen.orientation.unlock(); } catch (e) {} }
            var h = stage.querySelector('.rotate-hint'); if (h) h.classList.remove('show');
          }
        };
        document.addEventListener('fullscreenchange', onFs);
        document.addEventListener('webkitfullscreenchange', onFs);
      }
    }
  }
})();

/* ===== Cinematic entrance (homepage only) ===== */
(function(){
  var ov = document.querySelector('.enter'); if(!ov) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var seen; try{ seen = sessionStorage.getItem('rox_enter'); }catch(e){}
  function kill(){ if(ov && ov.parentNode){ ov.parentNode.removeChild(ov); } document.body.classList.remove('entering'); }
  if(reduce || seen){ kill(); return; }
  try{ sessionStorage.setItem('rox_enter','1'); }catch(e){}
  document.body.classList.add('entering');
  var lifted=false;
  function lift(){ if(lifted) return; lifted=true; ov.classList.add('done'); setTimeout(kill, 1200); }
  var t = setTimeout(lift, 2900);
  ov.addEventListener('click', function(){ clearTimeout(t); lift(); });
})();

/* ===== Interactive leasing plan (ROX Park) ===== */
(function(){
  var host = document.getElementById('planZones'); if(!host) return;
  var IC = {
    bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M5.5 8h13l-1 12h-11l-1-12Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
    fork:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6a2 2 0 0 0 4 0V3M8 11v10"/><path d="M16.5 3C15 3 14 5 14 7.5s1 3.5 2.5 3.5M16.5 3v18"/></svg>',
    play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M10 8.3l5.2 3.7L10 15.7V8.3Z" fill="currentColor" stroke="none"/></svg>',
    spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17l-1.9-5.1L4.5 10l5.6-1.4L12 3Z"/></svg>'
  };
  var ZONES = [
    {name:'Retail Lane',   ic:IC.bag,   pre:'R', cat:'Fashion · Beauty · Lifestyle',   sz:'45–160 m²', s:'L L L A L L A L S L L A L S A L'},
    {name:'The Food Hall', ic:IC.fork,  pre:'F', cat:'Restaurants · Cafés · Kitchens',  sz:'30–140 m²', s:'L L A L L L A S L A L L'},
    {name:'Entertainment', ic:IC.play,  pre:'E', cat:'Cinema · Padel · Family',         sz:'200–900 m²', s:'L L A S L'},
    {name:'Events Plaza',  ic:IC.spark, pre:'K', cat:'Kiosks · Pop-ups · Seasonal',     sz:'8–24 m²',   s:'A L A S A L'}
  ];
  var MAP = {L:'leased', A:'avail', S:'soon'};
  var LABEL = {leased:'Leased', avail:'Available', soon:'Coming soon'};
  var total=0, leased=0, avail=0;
  var detail = document.getElementById('planDetail');
  var selEl = null;
  function pad(n){ return (n<10?'0':'')+n; }
  function wa(code){ return 'https://wa.me/963991511113?text=' + encodeURIComponent('Hi ROX, I’d like to enquire about unit '+code+' at ROX Park.'); }
  function select(el,d){
    if(selEl) selEl.classList.remove('sel');
    selEl = el; el.classList.add('sel');
    var cls = d.st;
    var cta = cls==='leased' ? '<span class="dhint">This space is leased.</span>'
            : '<a class="btn-gold dcta" href="'+wa(d.code)+'" target="_blank" rel="noopener">Enquire about '+d.code+'</a>';
    detail.className = 'plan-detail on';
    detail.innerHTML = '<span class="du">'+d.code+'</span>'
      + '<span class="dbadge '+cls+'">'+LABEL[cls]+'</span>'
      + '<span class="dmeta">'+d.zone+' · '+d.cat+' · '+d.sz+'</span>'
      + cta;
  }
  ZONES.forEach(function(z){
    var states = z.s.trim().split(/\s+/);
    var wrap = document.createElement('div'); wrap.className='plan-zone';
    var zl=0, za=0;
    var grid = document.createElement('div'); grid.className='plan-grid';
    states.forEach(function(ch,i){
      var st = MAP[ch]||'avail'; total++;
      if(st==='leased'){leased++; zl++;} if(st==='avail'){avail++; za++;}
      var code = z.pre+pad(i+1);
      var u = document.createElement('button');
      u.type='button'; u.className='unit '+st;
      u.innerHTML = code.replace(/^([A-Z])(\d+)$/,'$1<b>$2</b>');
      u.setAttribute('aria-label', code+' — '+LABEL[st]);
      var d = {code:'ROX Park · '+code, zone:z.name, cat:z.cat, sz:z.sz, st:st};
      u.addEventListener('click', function(){ select(u,d); });
      grid.appendChild(u);
    });
    var h = document.createElement('h4');
    h.innerHTML = '<span class="zi">'+z.ic+'</span><span class="zn">'+z.name+'</span>'
      + '<span class="ct"><b>'+za+'</b> available · '+zl+' leased · '+z.sz+'</span>';
    wrap.appendChild(h); wrap.appendChild(grid); host.appendChild(wrap);
  });
  var pct = Math.round(leased/total*100);
  var pctEl = document.getElementById('planPct');
  function setPct(v){ if(pctEl) pctEl.innerHTML = '<b>'+v+'%</b> leased · '+avail+' spaces available'; }
  setPct(0);
  var bar = document.getElementById('planBar');
  var allUnits = host.querySelectorAll('.unit');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function animateIn(){
    if(bar) bar.style.width = pct+'%';
    allUnits.forEach(function(u,i){ u.style.transitionDelay = (reduce?0:Math.min(i*20,640))+'ms'; u.classList.add('in'); });
    if(reduce){ setPct(pct); return; }
    var start=null;
    function step(ts){ if(!start) start=ts; var p=Math.min(1,(ts-start)/950); setPct(Math.round((p<1?(1-Math.pow(1-p,3)):1)*pct)); if(p<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var wrap = document.querySelector('.plan-wrap');
  if('IntersectionObserver' in window && wrap){
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ animateIn(); io.disconnect(); } }); },{threshold:.12});
    io.observe(wrap);
  } else { animateIn(); }
})();

/* ===== icon chips on opportunity tags (home + park) ===== */
(function(){
  var SHOP='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 9l1.2-4h13.6L20 9M5 9v10h14V9M4 9h16M9.5 19v-5h5v5"/></svg>';
  var GLOBE='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>';
  var PEOPLE='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16.5 6.4a2.8 2.8 0 0 1 0 5.2M18.5 19a4.2 4.2 0 0 0-3-4"/></svg>';
  [].forEach.call(document.querySelectorAll('.opp .tag'), function(t){
    var s=(t.textContent||'').toLowerCase(), ic;
    if(s.indexOf('lease')>-1) ic=SHOP;
    else if(s.indexOf('represent')>-1) ic=GLOBE;
    else ic=PEOPLE;
    t.insertAdjacentHTML('afterbegin','<span class="ti">'+ic+'</span>');
  });
})();

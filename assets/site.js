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
    function setMenu(o) {
      btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      menu.classList.toggle('open', o);
      d.body.style.overflow = o ? 'hidden' : '';
    }
    btn.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    [].slice.call(menu.querySelectorAll('a')).forEach(function (a) {
      var h = a.getAttribute('href') || '';
      if (h.charAt(0) === '#') a.addEventListener('click', function () { setMenu(false); });
    });
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
      v.muted = true;
      var pr = v.play && v.play();
      if (pr && pr.catch) pr.catch(function () {});
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

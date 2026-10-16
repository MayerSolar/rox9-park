/* ROX Park — interactive leasing map (real plan data) */
(function () {
  var root = document.getElementById('leasing');
  if (!root) return;

  var BASE = { GF: '/assets/plan-gf.jpg', F1: '/assets/plan-f1.jpg' };
  var FLOOR_NAME = { GF: 'Ground floor', F1: 'First floor' };
  var BLOCK_NAME = {
    A: 'Block A', B: 'Block B', C: 'Block C', D: 'Block D', E: 'Block E',
    F: 'Block F', G: 'Block G', H: 'Block H', I: 'Block I', J: 'Block J',
    K: 'Block K', L: 'Block L', M: 'Block M'
  };
  /* Availability — fill these when the leasing team confirms status.
     STATUS[floor][unitId] = 'leased' | 'soon'   (anything else = available) */
  var STATUS = { GF: {}, F1: {} };
  var LABELS = { available: 'Available', leased: 'Leased', soon: 'Coming soon' };

  var DATA = null, floor = 'GF', selected = null, filter = 'all';
  var stage, world, base, hot, detail, listEl, tallyEl, barEl, hintEl;
  var hotspots = {};              // id -> element (current floor)
  var view = { s: 1, tx: 0, ty: 0 };
  var pointers = {}, dragStart = null, moved = false, pinch = null;

  var WA = function (u) {
    return 'https://wa.me/963991511113?text=' + encodeURIComponent(
      'Hi ROX, I’d like to enquire about space ' + u.id + ' (' + FLOOR_NAME[u.floor] + ') at ROX Park.');
  };
  function statusOf(u) { return (STATUS[u.floor] && STATUS[u.floor][u.id]) || 'available'; }
  function unitsFor(fl) { return DATA.units.filter(function (u) { return u.floor === fl; }); }

  fetch('/assets/plan-data.json').then(function (r) { return r.json(); }).then(function (d) {
    DATA = d; cacheEls(); wireControls(); setFloor('GF');
  }).catch(function () { root.innerHTML = '<p style="color:var(--muted2)">Plan is loading… refresh if it doesn’t appear.</p>'; });

  function cacheEls() {
    stage = root.querySelector('#mapStage');
    world = root.querySelector('#mapWorld');
    base = root.querySelector('#mapBase');
    hot = root.querySelector('#hotLayer');
    detail = root.querySelector('#unitDetail');
    listEl = root.querySelector('#leaseList');
    tallyEl = root.querySelector('#planTally');
    barEl = root.querySelector('#planBar');
    hintEl = root.querySelector('#mapHint');
  }

  /* ---------- floor ---------- */
  function setFloor(fl) {
    floor = fl; selected = null;
    root.querySelectorAll('[data-floor]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-floor') === fl); });
    var tag = root.querySelector('#mapFloorTag'); if (tag) tag.textContent = FLOOR_NAME[fl];
    base.src = BASE[fl];
    base.onload = function () { resetView(); };
    buildHotspots(); buildList(); updateTally(); resetDetail();
  }

  function buildHotspots() {
    hot.innerHTML = ''; hotspots = {};
    unitsFor(floor).forEach(function (u) {
      var st = statusOf(u);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hot s-' + st;
      b.style.left = (u.x * 100) + '%';
      b.style.top = (u.y * 100) + '%';
      b.setAttribute('aria-label', u.id + ' — ' + LABELS[st]);
      b.addEventListener('click', function (e) { if (moved) return; e.stopPropagation(); select(u.id); });
      hot.appendChild(b);
      hotspots[u.id] = b;
    });
    applyFilter();
  }

  /* ---------- list ---------- */
  function buildList() {
    var byBlock = {};
    unitsFor(floor).forEach(function (u) { (byBlock[u.block] = byBlock[u.block] || []).push(u); });
    Object.keys(byBlock).forEach(function (bl) {
      byBlock[bl].sort(function (a, b) { return (parseInt(a.id.slice(1), 10) || 0) - (parseInt(b.id.slice(1), 10) || 0); });
    });
    var html = '';
    Object.keys(byBlock).sort().forEach(function (bl) {
      var us = byBlock[bl];
      var av = us.filter(function (u) { return statusOf(u) === 'available'; }).length;
      html += '<div class="lblock"><div class="lblock-h"><span class="lb-name">' + (BLOCK_NAME[bl] || bl) +
        '</span><span class="lb-ct"><b>' + av + '</b> available · ' + us.length + ' units</span></div><div class="lchips">';
      us.forEach(function (u) {
        html += '<button type="button" class="lchip s-' + statusOf(u) + '" data-id="' + u.id + '">' + u.id + '</button>';
      });
      html += '</div></div>';
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll('.lchip').forEach(function (c) {
      c.addEventListener('click', function () { select(c.getAttribute('data-id'), true); });
    });
  }

  /* ---------- selection + detail ---------- */
  function select(id, focusMap) {
    var u = unitsFor(floor).filter(function (x) { return x.id === id; })[0];
    if (!u) return;
    selected = id;
    Object.keys(hotspots).forEach(function (k) { hotspots[k].classList.toggle('sel', k === id); });
    listEl.querySelectorAll('.lchip').forEach(function (c) { c.classList.toggle('sel', c.getAttribute('data-id') === id); });
    var st = statusOf(u);
    var cta = st === 'leased'
      ? '<span class="dhint">This space is leased.</span>'
      : '<a class="btn-gold dcta" href="' + WA(u) + '" target="_blank" rel="noopener">Enquire about ' + u.id + '</a>';
    detail.className = 'unit-detail on';
    detail.innerHTML =
      '<div class="du-top"><span class="du">' + u.id + '</span><span class="dbadge s-' + st + '">' + LABELS[st] + '</span></div>' +
      '<div class="dmeta">' + (BLOCK_NAME[u.block] || u.block) + ' · ' + FLOOR_NAME[u.floor] + '</div>' +
      '<div class="dmeta2">Size &amp; use confirmed on enquiry.</div>' + cta;
    if (focusMap) centerOn(u);
  }
  function resetDetail() {
    detail.className = 'unit-detail';
    detail.innerHTML = '<span class="dhint">Tap any space on the plan — or pick one from the directory — to see details and enquire.</span>';
  }

  /* ---------- filter ---------- */
  function applyFilter() {
    Object.keys(hotspots).forEach(function (id) {
      var u = unitsFor(floor).filter(function (x) { return x.id === id; })[0];
      var show = filter === 'all' || statusOf(u) === filter;
      hotspots[id].classList.toggle('dim', !show);
    });
  }

  function updateTally() {
    var us = unitsFor(floor);
    var av = us.filter(function (u) { return statusOf(u) === 'available'; }).length;
    var pct = Math.round((us.length - av) / us.length * 100);
    if (tallyEl) tallyEl.innerHTML = '<b>' + av + '</b> of ' + us.length + ' spaces available · ' + FLOOR_NAME[floor];
    if (barEl) { barEl.style.width = '0%'; requestAnimationFrame(function () { barEl.style.width = (av / us.length * 100) + '%'; }); }
  }

  /* ---------- pan / zoom ---------- */
  function clamp() {
    var sw = stage.clientWidth, sh = stage.clientHeight;
    var ww = sw * view.s, wh = sh * view.s;      // world sized to stage then scaled
    var minx = Math.min(0, sw - ww), miny = Math.min(0, sh - wh);
    view.tx = Math.max(minx, Math.min(0, view.tx));
    view.ty = Math.max(miny, Math.min(0, view.ty));
  }
  function apply() { clamp(); world.style.transform = 'translate(' + view.tx + 'px,' + view.ty + 'px) scale(' + view.s + ')'; }
  function resetView() { view.s = 1; view.tx = 0; view.ty = 0; apply(); }
  function zoomAt(cx, cy, ns) {
    ns = Math.max(1, Math.min(6, ns));
    var wx = (cx - view.tx) / view.s, wy = (cy - view.ty) / view.s;
    view.s = ns; view.tx = cx - wx * ns; view.ty = cy - wy * ns; apply();
  }
  function centerOn(u) {
    // u.x,u.y normalized on base; base fills stage at scale 1
    var sw = stage.clientWidth, sh = stage.clientHeight;
    var ns = Math.max(view.s, 2.4);
    var wx = u.x * sw, wy = u.y * sh;
    view.s = ns; view.tx = sw / 2 - wx * ns; view.ty = sh / 2 - wy * ns; apply();
  }

  function wireControls() {
    root.querySelectorAll('[data-floor]').forEach(function (b) {
      b.addEventListener('click', function () { setFloor(b.getAttribute('data-floor')); });
    });
    root.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.getAttribute('data-filter');
        root.querySelectorAll('[data-filter]').forEach(function (x) { x.classList.toggle('on', x === b); });
        applyFilter();
      });
    });
    var zi = root.querySelector('[data-z="in"]'), zo = root.querySelector('[data-z="out"]'), zr = root.querySelector('[data-z="reset"]');
    if (zi) zi.addEventListener('click', function () { zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, view.s * 1.5); });
    if (zo) zo.addEventListener('click', function () { zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, view.s / 1.5); });
    if (zr) zr.addEventListener('click', resetView);

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, view.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    }, { passive: false });

    stage.addEventListener('pointerdown', function (e) {
      stage.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      moved = false;
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
      } else {
        dragStart = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
      }
      if (hintEl) hintEl.classList.add('hide');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2 && pinch) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var nd = Math.hypot(a.x - b.x, a.y - b.y);
        var r = stage.getBoundingClientRect();
        zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, pinch.s * (nd / pinch.d));
        moved = true;
      } else if (dragStart) {
        var dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        view.tx = dragStart.tx + dx; view.ty = dragStart.ty + dy; apply();
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      if (Object.keys(pointers).length === 0) dragStart = null;
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    window.addEventListener('resize', function () { apply(); });
  }
})();

/* =========================================================
   Mohit Prajapat — Portfolio
   Enhancements only. The site works without this file.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  var hasMatchMedia = typeof window.matchMedia === 'function';
  var reduceMotion = hasMatchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Mobile navigation ---------- */
  function initNav() {
    var toggle = $('#nav-toggle');
    var list = $('#nav-list');
    if (!toggle || !list) { return; }
    var label = $('.nav-toggle-label', toggle);

    function setOpen(open) {
      list.classList.toggle('is-open', open);
      root.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) { label.textContent = open ? 'Close' : 'Menu'; }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    $all('a', list).forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (toggle.getAttribute('aria-expanded') !== 'true') { return; }
      if (event.target.closest && event.target.closest('.site-header')) { return; }
      setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 900) { setOpen(false); }
    });
  }

  /* ---------- 2. Header state on scroll ---------- */
  function initHeader() {
    var header = $('#site-header');
    if (!header) { return; }
    function update() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- 3. Scroll reveal ---------- */
  function initReveal() {
    var items = $all('[data-reveal]');
    if (!items.length) { return; }

    function showAll() {
      items.forEach(function (item) { item.classList.add('is-visible'); });
    }

    if (reduceMotion || typeof window.IntersectionObserver !== 'function') {
      showAll();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (item) { observer.observe(item); });
  }

  /* ---------- 4. Highlight current section in nav ---------- */
  function initScrollSpy() {
    if (typeof window.IntersectionObserver !== 'function') { return; }
    var links = $all('#nav-list a[href^="#"]:not(.btn)');
    if (!links.length) { return; }

    var map = {};
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      if (id && document.getElementById(id)) { map[id] = link; }
    });

    var ids = Object.keys(map);
    if (!ids.length) { return; }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (link) { link.classList.remove('is-current'); link.removeAttribute('aria-current'); });
          var active = map[entry.target.id];
          if (active) { active.classList.add('is-current'); active.setAttribute('aria-current', 'location'); }
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    ids.forEach(function (id) { observer.observe(document.getElementById(id)); });
  }

  /* ---------- 5. 3D tilt on the hero (mouse + touch drag) ---------- */
  function initTilt() {
    var zone = $('#hero-visual');
    var tilt = $('#hero-tilt');
    if (!zone || !tilt || reduceMotion) { return; }
    if (typeof window.PointerEvent !== 'function') { return; }

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null, rect = null;
    function measure() { rect = zone.getBoundingClientRect(); }

    function frame() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      tilt.style.setProperty('--ry', cx.toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', cy.toFixed(2) + 'deg');
      if (Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02) {
        raf = window.requestAnimationFrame(frame);
      } else {
        raf = null;
      }
    }
    function kick() {
      if (raf === null && typeof window.requestAnimationFrame === 'function') {
        raf = window.requestAnimationFrame(frame);
      }
    }
    function move(event) {
      if (!rect) { measure(); }
      if (!rect.width || !rect.height) { return; }
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      tx = Math.max(-0.5, Math.min(0.5, x)) * 24;
      ty = -Math.max(-0.5, Math.min(0.5, y)) * 18;
      kick();
    }
    function reset() { tx = 0; ty = 0; kick(); }

    zone.addEventListener('pointerenter', measure);
    zone.addEventListener('pointerdown', measure);
    window.addEventListener('scroll', function () { rect = null; }, { passive: true });
    window.addEventListener('resize', function () { rect = null; });
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerleave', reset);
    zone.addEventListener('pointerup', reset);
    zone.addEventListener('pointercancel', reset);
  }

  /* ---------- 6. Projects: filter, show all, details dialog ---------- */
  function initProjects() {
    var grid = $('#cards');
    var cards = $all('.card[data-category]');
    if (!grid || !cards.length) { return; }

    var chips = $all('[data-filter]');
    var toggle = $('#toggle-projects');
    var results = $('#results');
    /* 3 fills one desktop row; the 2-column tablet layout shows 4 so the last row is never a lone card */
    var twoCol = hasMatchMedia ? window.matchMedia('(min-width: 640px) and (max-width: 899px)') : null;
    function getLimit() { return twoCol && twoCol.matches ? 4 : 3; }
    var filter = 'all';
    var expanded = false;

    function matches(card) {
      var cats = (card.getAttribute('data-category') || '').split(' ');
      return filter === 'all' || cats.indexOf(filter) !== -1;
    }

    function update() {
      var shown = 0;
      var visibleCount = 0;
      cards.forEach(function (card) {
        var ok = matches(card);
        var visible = ok && (expanded || shown < getLimit());
        if (ok) { shown += 1; }
        card.classList.toggle('is-hidden', !visible);
        if (visible) { visibleCount += 1; }
        if (visible) { card.classList.add('is-visible'); }
      });
      if (results) { results.textContent = 'Showing ' + visibleCount + ' of ' + shown + ' projects'; }
      if (toggle) {
        var needsToggle = shown > getLimit();
        toggle.classList.toggle('is-hidden', !needsToggle);
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        var label = expanded ? 'Show Fewer' : 'View All Projects';
        var icon = toggle.querySelector('svg');
        toggle.textContent = label + ' ';
        if (icon) { toggle.appendChild(icon); }
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filter = chip.getAttribute('data-filter') || 'all';
        chips.forEach(function (other) {
          var active = other === chip;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        update();
      });
    });

    if (toggle) {
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        expanded = !expanded;
        update();
      });
    }

    if (twoCol) {
      if (typeof twoCol.addEventListener === 'function') { twoCol.addEventListener('change', update); }
      else if (typeof twoCol.addListener === 'function') { twoCol.addListener(update); }
    }

    update();

    /* Details dialog */
    var dialog = $('#project-modal');
    var title = $('#modal-title');
    var content = $('#modal-content');
    var media = $('#modal-media');
    if (!dialog || !title || !content || !media || typeof dialog.showModal !== 'function') { return; }

    function openProject(card) {
      var detail = $('.project-detail', card);
      if (!detail) { return; }
      title.textContent = detail.getAttribute('data-title') || '';
      content.innerHTML = detail.innerHTML;
      var visual = $('.card-media', card);
      media.innerHTML = visual ? visual.outerHTML : '';
      dialog.showModal();
      root.classList.add('modal-open');
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function (event) {
        if (event.target.closest && event.target.closest('a')) { return; }
        openProject(card);
      });
    });

    $all('[data-open-project]').forEach(function (trigger) {
      trigger.addEventListener('click', function (event) {
        var detail = document.getElementById(trigger.getAttribute('data-open-project'));
        var owner = detail && detail.closest ? detail.closest('.card') : null;
        if (owner) { event.preventDefault(); openProject(owner); }
      });
    });

    dialog.addEventListener('click', function (event) {
      if (event.target === dialog || (event.target.closest && event.target.closest('[data-close]'))) {
        dialog.close();
      }
    });
    dialog.addEventListener('close', function () { root.classList.remove('modal-open'); });
  }

  /* ---------- 7. Back-to-top button ---------- */
  function initToTop() {
    var button = $('#to-top');
    if (!button) { return; }
    function update() { button.classList.toggle('is-shown', window.scrollY > 700); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- 8. Scroll progress bar ---------- */
  function initProgress() {
    var bar = $('#progress-bar');
    if (!bar) { return; }
    var ticking = false;
    function paint() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      ticking = false;
    }
    function onScroll() {
      if (ticking) { return; }
      ticking = true;
      if (typeof window.requestAnimationFrame === 'function') { window.requestAnimationFrame(paint); } else { paint(); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    paint();
  }

  /* ---------- 9. Count-up numbers ---------- */
  function initCounters() {
    var nodes = $all('[data-count]');
    if (!nodes.length || reduceMotion || typeof window.IntersectionObserver !== 'function') { return; }

    function run(node) {
      var target = parseInt(node.getAttribute('data-count'), 10);
      if (isNaN(target)) { return; }
      var start = null;
      var duration = 1100;
      function step(now) {
        if (start === null) { start = now; }
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        node.textContent = String(Math.round(target * eased));
        if (t < 1) { window.requestAnimationFrame(step); }
      }
      node.textContent = '0';
      window.requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (node) { observer.observe(node); });
  }

  /* ---------- 10. Contact form (validates, then opens the email app) ---------- */
  function initForm() {
    var form = $('#contact-form');
    if (!form) { return; }
    form.noValidate = true;
    var status = $('#form-status');
    var to = form.getAttribute('data-email') || '';
    var fields = $all('input[required], textarea[required]', form);

    function errorFor(field) { return field.parentNode ? $('.field-error', field.parentNode) : null; }

    function check(field) {
      var value = (field.value || '').trim();
      var message = '';
      if (!value) {
        message = 'Please fill this in.';
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        message = 'Please enter a valid email address.';
      } else if (field.tagName === 'TEXTAREA' && value.length < 10) {
        message = 'Please write at least a short sentence (10 characters).';
      }
      var err = errorFor(field);
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (err) { err.textContent = message; err.hidden = !message; }
      return !message;
    }

    fields.forEach(function (field) {
      field.addEventListener('blur', function () { if ((field.value || '').length) { check(field); } });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') { check(field); }
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var firstBad = null;
      fields.forEach(function (field) {
        if (!check(field) && !firstBad) { firstBad = field; }
      });
      if (firstBad) {
        if (status) { status.textContent = 'Please fix the highlighted fields.'; }
        firstBad.focus();
        return;
      }

      var get = function (name) { var el = form.elements[name]; return el ? String(el.value).trim() : ''; };
      var subject = 'Project enquiry from ' + get('name');
      var body = 'Name: ' + get('name') + '\nEmail: ' + get('email') + '\nProject type: ' + get('type') + '\n\n' + get('message');
      var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      if (status) { status.textContent = 'Opening your email app… If nothing opens, write to ' + to + '.'; }
      window.location.href = href;
    });
  }

  /* ---------- 12. Rotating role words ---------- */
  function initRotator() {
    var el = $('#rotator');
    if (!el || reduceMotion) { return; }
    var words = (el.getAttribute('data-words') || '').split(',').map(function (w) { return w.trim(); }).filter(Boolean);
    if (words.length < 2) { return; }
    var i = 0;
    window.setInterval(function () {
      el.classList.add('is-out');
      window.setTimeout(function () {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove('is-out');
      }, 260);
    }, 2400);
  }

  /* ---------- 13. Expanding principle panels ---------- */
  function initPanels() {
    var panels = $all('.panel');
    if (!panels.length) { return; }
    function activate(target) {
      panels.forEach(function (panel) { panel.classList.toggle('is-active', panel === target); });
    }
    panels.forEach(function (panel) {
      panel.addEventListener('pointerenter', function (event) { if (event.pointerType === 'mouse') { activate(panel); } });
      panel.addEventListener('focus', function () { activate(panel); });
      panel.addEventListener('click', function () { activate(panel); });
    });
  }

  /* ---------- 14. Timeline fills as you scroll ---------- */
  function initTimeline() {
    var line = $('#timeline');
    if (!line) { return; }
    var ticking = false;
    function paint() {
      var rect = line.getBoundingClientRect();
      var mid = window.innerHeight * 0.6;
      var p = rect.height > 0 ? (mid - rect.top) / rect.height : 0;
      p = Math.max(0.02, Math.min(1, p));
      line.style.setProperty('--fill', p.toFixed(3));
      ticking = false;
    }
    function onScroll() {
      if (ticking) { return; }
      ticking = true;
      if (typeof window.requestAnimationFrame === 'function') { window.requestAnimationFrame(paint); } else { paint(); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    paint();
  }

  /* ---------- 15. Theme picker (remembered on this device) ---------- */
  function initTheme() {
    var section = $('#theme');
    var buttons = $all('.swatch');
    if (!section || !buttons.length) { return; }

    var THEMES = {
      lavender: { name: 'Lavender', a: '#7d5df2', b: '#5b3fdc', main: '#6d4aed', deep: '#5636d6', soft: '#ece8ff', bg: '#f7f6ff', bgSoft: '#efecff', line: '#e4e0f7', g1: '#e6e0ff', g2: '#efeaff', hue: '0deg' },
      ocean:    { name: 'Ocean',    a: '#4f9bff', b: '#2a5bd7', main: '#3b72ec', deep: '#1f4bbd', soft: '#e3edff', bg: '#f5f9ff', bgSoft: '#e9f1ff', line: '#dbe6f8', g1: '#d8e7ff', g2: '#e6f0ff', hue: '-38deg' },
      mint:     { name: 'Mint',     a: '#2dd4bf', b: '#0d8f82', main: '#10a595', deep: '#0b7a70', soft: '#dcf7f3', bg: '#f3fbfa', bgSoft: '#e4f6f3', line: '#d3ece8', g1: '#d0f3ed', g2: '#e1f7f3', hue: '-82deg' },
      rose:     { name: 'Rose',     a: '#f472b6', b: '#c82a7c', main: '#dc3f90', deep: '#ab1f68', soft: '#ffe3f0', bg: '#fff6fa', bgSoft: '#ffeaf3', line: '#f6d9e7', g1: '#ffdcec', g2: '#ffeaf3', hue: '55deg' }
    };

    var label = $('#theme-name');
    var meta = $('meta[name="theme-color"]');

    function apply(key, save) {
      var t = THEMES[key];
      if (!t) { return; }
      var s = root.style;
      if (key === 'lavender') {
        ['--purple', '--purple-deep', '--purple-soft', '--bg', '--bg-soft', '--line', '--glow1', '--glow2', '--hue', '--grad', '--grad-text']
          .forEach(function (name) { s.removeProperty(name); });
        if (meta) { meta.setAttribute('content', t.bg); }
        if (label) { label.textContent = 'Theme: ' + t.name; }
        buttons.forEach(function (button) {
          button.setAttribute('aria-pressed', button.getAttribute('data-theme') === key ? 'true' : 'false');
        });
        if (save) { try { window.localStorage.setItem('mp-theme', key); } catch (e) { /* storage unavailable */ } }
        return;
      }
      s.setProperty('--purple', t.main);
      s.setProperty('--purple-deep', t.deep);
      s.setProperty('--purple-soft', t.soft);
      s.setProperty('--bg', t.bg);
      s.setProperty('--bg-soft', t.bgSoft);
      s.setProperty('--line', t.line);
      s.setProperty('--glow1', t.g1);
      s.setProperty('--glow2', t.g2);
      s.setProperty('--hue', t.hue);
      s.setProperty('--grad', 'linear-gradient(135deg, ' + t.a + ' 0%, ' + t.b + ' 100%)');
      s.setProperty('--grad-text', 'linear-gradient(100deg, ' + t.a + ' 0%, ' + t.b + ' 100%)');
      if (meta) { meta.setAttribute('content', t.bg); }
      if (label) { label.textContent = 'Theme: ' + t.name; }
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', button.getAttribute('data-theme') === key ? 'true' : 'false');
      });
      if (save) { try { window.localStorage.setItem('mp-theme', key); } catch (e) { /* storage unavailable */ } }
    }

    section.hidden = false;
    buttons.forEach(function (button) {
      button.addEventListener('click', function () { apply(button.getAttribute('data-theme'), true); });
    });

    var saved = null;
    try { saved = window.localStorage.getItem('mp-theme'); } catch (e) { saved = null; }
    if (saved && THEMES[saved]) { apply(saved, false); }
  }

  /* ---------- 16. Custom cursor ring + magnetic buttons (mouse only) ---------- */
  function initPointerFx() {
    if (reduceMotion || !hasMatchMedia) { return; }
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) { return; }

    var ring = document.createElement('div');
    ring.className = 'cursor';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);

    var x = 0, y = 0, rx = 0, ry = 0, running = false;
    function loop() {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) {
        window.requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    document.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse') { return; }
      x = event.clientX; y = event.clientY;
      ring.classList.add('is-on');
      var target = event.target;
      var link = target && target.closest ? target.closest('a, button, .card, .panel, summary, input, select, textarea') : null;
      ring.classList.toggle('is-link', !!link);
      if (!running) { running = true; window.requestAnimationFrame(loop); }
    });
    document.addEventListener('pointerleave', function () { ring.classList.remove('is-on'); });

    $all('.btn').forEach(function (button) {
      button.addEventListener('pointermove', function (event) {
        var rect = button.getBoundingClientRect();
        var dx = (event.clientX - (rect.left + rect.width / 2)) * 0.18;
        var dy = (event.clientY - (rect.top + rect.height / 2)) * 0.28;
        button.style.setProperty('--mx', dx.toFixed(1) + 'px');
        button.style.setProperty('--my', dy.toFixed(1) + 'px');
      });
      button.addEventListener('pointerleave', function () {
        button.style.setProperty('--mx', '0px');
        button.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- 16b. Pause looping animations that are off-screen ---------- */
  function initOffscreenPause() {
    if (typeof window.IntersectionObserver !== 'function') { return; }
    var targets = $all('.hero-visual, .marquee');
    if (!targets.length) { return; }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-paused', !entry.isIntersecting);
      });
    }, { rootMargin: '80px 0px' });
    targets.forEach(function (target) { observer.observe(target); });
  }

  /* ---------- 17. Footer year ---------- */
  function initYear() {
    var year = $('#year');
    if (year) { year.textContent = String(new Date().getFullYear()); }
  }

  initNav();
  initHeader();
  initReveal();
  initScrollSpy();
  initTilt();
  initProjects();
  initToTop();
  initProgress();
  initCounters();
  initForm();
  initRotator();
  initPanels();
  initTimeline();
  initTheme();
  initPointerFx();
  initOffscreenPause();
  initYear();
})();

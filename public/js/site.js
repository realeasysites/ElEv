/* Elevated Events — front-end behavior */
(function () {
  'use strict';

  // Fallback copy of the catalog (the server's /api/catalog is the source of truth).
  var FALLBACK = {
    items: [
      { id: 'tent20x20', group: 'tents', name: '20′ × 20′ Pole Tent', price: 250, unit: 'each', seats: 48, note: 'Seats up to 48 guests', max: 4 },
      { id: 'tent20x30', group: 'tents', name: '20′ × 30′ Pole Tent', price: 275, unit: 'each', seats: 64, note: 'Seats up to 64 guests', max: 4 },
      { id: 'sidewall', group: 'tents', name: 'Sidewall (20′ section)', price: 15, unit: 'per section', note: 'Wind, rain & chill protection', max: 20 },
      { id: 'banquet', group: 'seating', name: '8′ Banquet Table', price: 10, unit: 'each', note: 'Seats 8', max: 60 },
      { id: 'round', group: 'seating', name: '60″ Round Table', price: 10, unit: 'each', note: 'Seats 8', max: 60 },
      { id: 'chair', group: 'seating', name: 'Folding Chair', price: 2, unit: 'each', note: 'White folding chair', max: 400 },
      { id: 'connect4', group: 'games', name: 'Giant Connect 4', price: 25, unit: 'each', note: 'Yard-size four-in-a-row', max: 1 },
      { id: 'jenga', group: 'games', name: 'Giant Jenga', price: 25, unit: 'each', note: 'Giant stacking-block game', max: 1 },
      { id: 'buckets', group: 'games', name: 'Battle Buckets', price: 25, unit: 'each', note: 'Giant bucket-pong basketball', max: 1 }
    ],
    packages: [
      { id: 'backyard', name: 'Backyard Party', price: 399, guests: 48, items: { tent20x20: 1, banquet: 6, chair: 48 } },
      { id: 'celebration', name: 'Big Celebration', price: 475, guests: 64, items: { tent20x30: 1, banquet: 8, chair: 64 } }
    ]
  };

  var GROUPS = [
    { id: 'tents', title: 'Tents & sidewalls' },
    { id: 'seating', title: 'Tables & chairs' },
    { id: 'games', title: 'Lawn games' }
  ];

  var catalog = FALLBACK;
  var qty = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return '$' + n.toLocaleString('en-US'); };
  var byId = function (id) { return catalog.items.filter(function (i) { return i.id === id; })[0]; };

  /* ---------- Header / nav ---------- */
  var toggle = $('#menuToggle');
  var nav = $('#nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
  var yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Quote builder ---------- */
  var groupsEl = $('#itemGroups');

  function render() {
    groupsEl.innerHTML = GROUPS.map(function (g) {
      var rows = catalog.items.filter(function (i) { return i.group === g.id; }).map(function (i) {
        var control = i.max === 1
          ? '<button type="button" class="toggle" data-toggle="' + i.id + '" aria-pressed="false" aria-label="Add ' + i.name + '"></button>'
          : '<div class="stepper" role="group" aria-label="' + i.name + ' quantity">' +
              '<button type="button" data-step="-1" data-id="' + i.id + '" aria-label="Fewer">−</button>' +
              '<input type="number" inputmode="numeric" min="0" max="' + i.max + '" value="0" data-qty="' + i.id + '" aria-label="' + i.name + ' quantity">' +
              '<button type="button" data-step="1" data-id="' + i.id + '" aria-label="More">+</button>' +
            '</div>';
        return '<div class="item-row" data-row="' + i.id + '">' +
          '<div class="item-name">' + i.name + '<small>' + i.note + '</small></div>' +
          '<div class="item-price">' + money(i.price) + ' <small>' + (i.unit === 'each' ? 'ea' : i.unit) + '</small></div>' +
          control +
        '</div>';
      }).join('');
      return '<div class="item-group"><h3>' + g.title + '</h3>' + rows + '</div>';
    }).join('');
  }

  function setQty(id, n, silent) {
    var item = byId(id);
    if (!item) return;
    n = Math.max(0, Math.min(item.max, Math.floor(Number(n) || 0)));
    qty[id] = n;
    if (!silent) update();
  }

  function applyItems(items) {
    catalog.items.forEach(function (i) {
      if (i.group === 'games' || i.id === 'sidewall') return; // keep add-ons
      qty[i.id] = 0;
    });
    Object.keys(items).forEach(function (k) { setQty(k, items[k], true); });
    update();
  }

  function matchedPackage() {
    return catalog.packages.filter(function (p) {
      return catalog.items.every(function (i) {
        if (i.group === 'games' || i.id === 'sidewall') return true;
        return (qty[i.id] || 0) === (p.items[i.id] || 0);
      });
    })[0] || null;
  }

  function capacity() {
    return catalog.items.reduce(function (s, i) { return s + (i.seats ? (qty[i.id] || 0) * i.seats : 0); }, 0);
  }

  // Mirrors lib/catalog.js bestPrice(): package pricing kicks in automatically.
  function isAddon(i) { return i.group === 'games' || i.id === 'sidewall'; }
  function bestPrice() {
    var alaCarte = catalog.items.reduce(function (s, i) { return s + (qty[i.id] || 0) * i.price; }, 0);
    var best = { total: alaCarte, pkg: null };
    catalog.packages.forEach(function (p) {
      var tentId = Object.keys(p.items).filter(function (k) { var it = byId(k); return it && it.group === 'tents'; })[0];
      if (!qty[tentId]) return;
      var total = p.price;
      catalog.items.forEach(function (i) {
        var n = qty[i.id] || 0;
        var extra = isAddon(i) ? n : Math.max(0, n - (p.items[i.id] || 0));
        total += extra * i.price;
      });
      if (total < best.total) best = { total: total, pkg: p };
    });
    best.savings = alaCarte - best.total;
    return best;
  }

  var lastTotal = 0;
  function update() {
    var lines = [];
    var total = 0;
    catalog.items.forEach(function (i) {
      var q = qty[i.id] || 0;
      var row = $('[data-row="' + i.id + '"]');
      if (row) row.classList.toggle('has-qty', q > 0);
      var input = $('[data-qty="' + i.id + '"]');
      if (input && document.activeElement !== input) input.value = q;
      var tg = $('[data-toggle="' + i.id + '"]');
      if (tg) tg.setAttribute('aria-pressed', String(q > 0));
      if (q > 0) {
        total += q * i.price;
        lines.push('<li><span>' + (i.max === 1 ? '' : q + ' × ') + i.name + '</span><span>' + money(q * i.price) + '</span></li>');
      }
    });

    var best = bestPrice();
    if (best.pkg && best.savings > 0) {
      lines.push('<li class="pkg-line"><span>' + best.pkg.name + ' package pricing</span><span>−' + money(best.savings) + '</span></li>');
    }
    total = best.total;
    $('#summaryLines').innerHTML = lines.length ? lines.join('') : '<li class="empty">Add items to see your price.</li>';
    var totalEl = $('#summaryTotal');
    totalEl.textContent = money(total);
    if (total !== lastTotal) {
      var box = totalEl.parentElement;
      box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
      lastTotal = total;
    }

    // Seating guidance
    var cap = capacity();
    var chairs = qty.chair || 0;
    var capEl = $('#summaryCap');
    capEl.className = 'summary-cap';
    if (cap && chairs > cap) {
      capEl.classList.add('warn');
      capEl.textContent = 'Heads up: ' + chairs + ' chairs is more than your tent seats (up to ' + cap + '). Add a tent or we can talk it through.';
    } else if (cap) {
      capEl.textContent = 'Tent seating: up to ' + cap + ' guests.';
    } else {
      capEl.textContent = '';
    }

    // Package chips
    var pkg = matchedPackage();
    $$('.chip[data-package]').forEach(function (c) { c.classList.toggle('active', !!pkg && c.dataset.package === pkg.id); });

    // Mobile bar
    var mb = $('#mbLabel');
    if (mb) mb.textContent = total ? 'My Quote · ' + money(total) : 'Get My Quote';
  }

  function suggest(guests) {
    var g = Math.max(1, Math.min(500, Math.floor(guests)));
    var items = { banquet: Math.ceil(g / 8), chair: g };
    if (g <= 48) items.tent20x20 = 1;
    else if (g <= 64) items.tent20x30 = 1;
    else if (g <= 112) { items.tent20x20 = 1; items.tent20x30 = 1; }
    else items.tent20x30 = Math.min(4, Math.ceil(g / 64));
    applyItems(items);

    var tents = [];
    if (items.tent20x20) tents.push(items.tent20x20 + ' × 20′×20′');
    if (items.tent20x30) tents.push(items.tent20x30 + ' × 20′×30′');
    var msg = 'For ' + g + ' guests: ' + tents.join(' + ') + ' tent' + ((items.tent20x20 || 0) + (items.tent20x30 || 0) > 1 ? 's' : '') +
      ', ' + items.banquet + ' banquet tables and ' + g + ' chairs. Adjust anything below.';
    if (g > 256) msg = 'For ' + g + ' guests, give us a call at (585) 566-0900 and we’ll plan a layout together. We’ve started you with our largest setup.';
    var help = $('#helperMsg');
    if (help) help.textContent = msg;
    var bg = $('#builderGuests');
    if (bg) bg.value = g;
  }

  function wireBuilder() {
    groupsEl.addEventListener('click', function (e) {
      var step = e.target.closest('[data-step]');
      if (step) { var id = step.dataset.id; setQty(id, (qty[id] || 0) + Number(step.dataset.step)); return; }
      var tg = e.target.closest('[data-toggle]');
      if (tg) { var tid = tg.dataset.toggle; setQty(tid, qty[tid] ? 0 : 1); }
    });
    groupsEl.addEventListener('input', function (e) {
      if (e.target.dataset.qty) setQty(e.target.dataset.qty, e.target.value);
    });
    groupsEl.addEventListener('focusout', function (e) {
      if (e.target.dataset.qty) e.target.value = qty[e.target.dataset.qty] || 0;
    });

    $$('[data-package]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = catalog.packages.filter(function (x) { return x.id === btn.dataset.package; })[0];
        if (!p) return;
        applyItems(p.items);
        var bg = $('#builderGuests'); if (bg) bg.value = p.guests;
        var help = $('#helperMsg'); if (help) help.textContent = p.name + ' added. Want lawn games or sidewalls? Add them below.';
        if (!btn.classList.contains('chip')) $('#quote').scrollIntoView({ behavior: 'smooth' });
      });
    });

    $('#clearAll').addEventListener('click', function () {
      catalog.items.forEach(function (i) { qty[i.id] = 0; });
      var help = $('#helperMsg'); if (help) help.textContent = '';
      update();
    });

    $('#builderPlan').addEventListener('click', function () {
      var v = Number($('#builderGuests').value);
      if (v > 0) suggest(v); else $('#builderGuests').focus();
    });
    $('#builderGuests').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('#builderPlan').click(); }
    });

    var hero = $('#heroPlanner');
    hero.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = Number($('#heroGuests').value);
      if (!(v > 0)) { $('#heroGuests').focus(); return; }
      suggest(v);
      $('#quote').scrollIntoView({ behavior: 'smooth' });
    });

    // Anything pointing at #quote with sidewalls intent
    $$('a[href="#quote"]').forEach(function (a) {
      if (/sidewall/i.test(a.textContent) ) {
        a.addEventListener('click', function () { if (!qty.sidewall) setQty('sidewall', 4); });
      }
    });
  }

  /* ---------- Quote form ---------- */
  function wireForm() {
    var form = $('#quoteForm');
    var dateEl = $('#qDate');
    var today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateEl.min = today.toISOString().slice(0, 10);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.field.invalid', form).forEach(function (f) { f.classList.remove('invalid'); var m = $('.err', f); if (m) m.remove(); });
      var errBox = $('#formError');
      errBox.textContent = '';

      var data = Object.fromEntries(new FormData(form).entries());
      var local = {};
      if (!data.name || data.name.trim().length < 2) local.name = 'Please enter your name.';
      if ((data.phone || '').replace(/\D/g, '').length < 10) local.phone = 'Please enter a valid phone number.';
      if (Object.keys(local).length) return showErrors(local);

      var items = {};
      Object.keys(qty).forEach(function (k) { if (qty[k]) items[k] = qty[k]; });
      var pkg = matchedPackage();
      data.items = items;
      data.package_id = pkg ? pkg.id : null;
      data.guests = $('#builderGuests').value || null;

      var btn = $('#quoteSubmit');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            if (res.body.fields) showErrors(res.body.fields);
            errBox.textContent = res.body.error || 'Something went wrong. Please call us at (585) 566-0900.';
            return;
          }
          form.hidden = true;
          $('#successName').textContent = data.name.split(' ')[0];
          var s = $('#quoteSuccess');
          s.hidden = false;
          s.focus();
        })
        .catch(function () {
          errBox.textContent = 'We couldn’t send that. Please call or text (585) 566-0900.';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Request My Date';
        });
    });

    function showErrors(fields) {
      Object.keys(fields).forEach(function (name) {
        var input = form.querySelector('[name="' + name + '"]');
        if (!input) return;
        var f = input.closest('.field');
        f.classList.add('invalid');
        var m = document.createElement('div');
        m.className = 'err';
        m.textContent = fields[name];
        f.appendChild(m);
      });
      var first = form.querySelector('.field.invalid input');
      if (first) first.focus();
    }
  }

  /* ---------- Gallery lightbox ---------- */
  function wireGallery() {
    var items = $$('.g-item');
    var lb = $('#lightbox');
    if (!items.length || !lb || typeof lb.showModal !== 'function') return;
    var idx = 0;
    function show(i) {
      idx = (i + items.length) % items.length;
      var it = items[idx];
      $('#lbImg').src = it.dataset.full;
      $('#lbImg').alt = it.querySelector('img').alt;
      $('#lbCap').textContent = it.dataset.cap || '';
    }
    items.forEach(function (it, i) {
      it.addEventListener('click', function () { show(i); lb.showModal(); });
    });
    $('#lbClose').addEventListener('click', function () { lb.close(); });
    $('#lbPrev').addEventListener('click', function () { show(idx - 1); });
    $('#lbNext').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- Init ---------- */
  function init() {
    catalog.items.forEach(function (i) { qty[i.id] = 0; });
    render();
    wireBuilder();
    wireForm();
    wireGallery();
    update();

    fetch('/api/catalog').then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
      if (!c || !c.items) return;
      var saved = qty;
      catalog = c;
      qty = {};
      catalog.items.forEach(function (i) { qty[i.id] = saved[i.id] || 0; });
      render();
      update();
    }).catch(function () { /* fallback catalog stays */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* K-T — логика сайта. Данные — в js/data.js */
(function () {
  'use strict';
  var K = window.KT;
  var ITEMS = {};
  K.menu.forEach(function (c) { c.items.forEach(function (it) { it.only = c.only; ITEMS[it.id] = it; }); });

  /* ---------- хранилище (только на устройстве посетителя) ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  var S = {
    branch: load('kt.branch', null),
    cart: load('kt.cart', {}),
    view: 'home',
    cat: 'first'
  };
  if (!K.branches.some(function (b) { return b.id === S.branch; })) S.branch = null;

  /* ---------- помощники ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rub(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; }
  function branch() { return K.branches.filter(function (b) { return b.id === S.branch; })[0] || K.branches[0]; }
  function isRad() { return branch().menu === 'rad'; }
  function img(it) { return 'img/dishes/' + (it.img || it.id) + '.webp'; }
  function priceOf(it, oi) {
    var rad = isRad(); var o = it.opts ? it.opts[oi || 0] : null;
    if (o && o.p != null) return rad && o.rp != null ? o.rp : o.p;
    return rad && it.r ? it.r[0] : it.p;
  }
  function unitOf(it, oi) {
    var o = it.opts ? it.opts[oi || 0] : null;
    if (o && o.u) return o.u;
    return isRad() && it.r && it.r[1] ? it.r[1] : (it.u || '');
  }
  function nameOf(it) { return isRad() && it.rn ? it.rn : it.name; }
  function descOf(it) { return isRad() && it.rd ? it.rd : it.desc; }
  function available(it) { return !it.only || (it.only === 'rad' && isRad()); }
  function priceLabel(it) {
    if (it.opts && it.opts[0].p != null) {
      var ps = it.opts.map(function (o, i) { return priceOf(it, i); });
      var mn = Math.min.apply(null, ps), mx = Math.max.apply(null, ps);
      return mn === mx ? rub(mn) : 'от ' + rub(mn);
    }
    return rub(priceOf(it, 0));
  }
  function unitLabel(it) {
    if (it.opts && it.opts[0].u && it.opts[0].p != null) {
      return it.opts.map(function (o) { return o.u; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' / ');
    }
    return unitOf(it, 0);
  }
  function status() {
    var d = new Date(); var h = (d.getUTCHours() + K.utcOffset + 24) % 24 + d.getUTCMinutes() / 60;
    var open = h >= K.open && h < K.close;
    return { open: open, text: open ? 'Открыто до ' + K.close + ':00' : 'Закрыто · откроется в ' + K.open + ':00' };
  }
  function qtyOf(id) { var q = 0; Object.keys(S.cart).forEach(function (k) { if (k.split('|')[0] === id) q += S.cart[k]; }); return q; }
  function cartLines() {
    var lines = [], total = 0, count = 0;
    Object.keys(S.cart).forEach(function (k) {
      var p = k.split('|'), it = ITEMS[p[0]], oi = +p[1], q = S.cart[k];
      if (!it || !q) return;
      var ok = available(it), price = priceOf(it, oi), sum = price * q;
      if (ok) { total += sum; count += q; }
      lines.push({ key: k, it: it, oi: oi, q: q, ok: ok, price: price, sum: sum, opt: it.opts ? it.opts[oi].l : '' });
    });
    return { lines: lines, total: total, count: count };
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function copy(text, msg) {
    var done = function () { toast(msg); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(text); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- иконки ---------- */
  var I = {
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    copy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    bike: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-2-7h4l2 4M6 14l3-6h3"/></svg>',
    star: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2461B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    pinW: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    chev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2C14E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    dl: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2C14E" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    fire: '<svg width="18" height="18" viewBox="0 0 24 24" role="img" aria-label="Острое"><title>Острое</title><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" fill="#E4572E"/><path d="M12 13c1 1.5 2 2.5 2 4a2 2 0 0 1-4 0c0-1 .6-1.8 1.2-2.4.1 1 .4 1.4.8 1.4z" fill="#F2C14E"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>',
    phone: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    route: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>'
  };
  function lantern(color, rim, cls, w) {
    return '<svg class="lantern ' + cls + '" width="' + w + '" height="' + Math.round(w * 2.3) + '" viewBox="0 0 40 92" aria-hidden="true"><line x1="20" y1="0" x2="20" y2="22" stroke="#C9A36A" stroke-width="1.5"/><rect x="13" y="20" width="14" height="5" rx="1.5" fill="#F2C14E"/><ellipse cx="20" cy="45" rx="18" ry="21" fill="' + color + '"/><path d="M20 24 C9 32 9 58 20 66 M20 24 C31 32 31 58 20 66" stroke="' + rim + '" stroke-width="1.5" fill="none"/><rect x="13" y="64" width="14" height="5" rx="1.5" fill="#F2C14E"/><line x1="20" y1="69" x2="20" y2="88" stroke="#F2C14E" stroke-width="2.5"/></svg>';
  }
  var RED = ['#E4572E', '#A8360F'], GREEN = ['#8CC63F', '#4F7F1E'];

  /* Логотип: жёлтая тарелка, палочки складываются в «К», вилка — в «Т» */
  function logo(anim) {
    var band = function (d) { return '<path d="' + d + '" stroke="#FFF6EA" stroke-width="2.4" stroke-linecap="butt"/>'; };
    var letters =
      '<g class="lg-k1"><path d="M32 32v58" stroke-width="10"/>' + band('M27 38h10') + '</g>' +
      '<g class="lg-k2"><path d="M60 31L37 62" stroke-width="8"/>' + band('M54.2 31.3l7.2 5.4') + '</g>' +
      '<g class="lg-k3"><path d="M38 58l24 33" stroke-width="8"/>' + band('M56 90.3l7.2-5.2') + '</g>' +
      '<g class="lg-t"><path d="M86 45v46" stroke-width="9"/><path d="M70 44h32" stroke-width="8"/><path d="M72 44V31M80.7 44V31M89.3 44V31M98 44V31" stroke-width="4"/></g>';
    return '<svg class="logo' + (anim ? ' anim' : '') + '" viewBox="0 0 120 120" fill="none" stroke-linecap="round" role="img" aria-label="Логотип K-T">' +
      '<circle class="lg-disc" cx="60" cy="60" r="57" fill="#F2C14E"/>' +
      '<circle class="lg-rim" cx="60" cy="60" r="49" stroke="#E3A628" stroke-width="3"/>' +
      '<g class="lg-steam" stroke="#FFF6EA" stroke-width="2.5"><path d="M48 21c-3-4 3-6 0-10"/><path d="M60 19c-3-4 3-6 0-10"/><path d="M72 21c-3-4 3-6 0-10"/></g>' +
      '<g class="lg-letters" stroke="#C9331D">' + letters + '</g>' +
      '</svg>';
  }

  /* ---------- шапка, тема, нижнее меню ---------- */
  function theme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function renderChrome() {
    var dark = theme() === 'dark';
    var tb = $('#themeBtn');
    tb.innerHTML = dark ? I.sun : I.moon;
    tb.setAttribute('aria-label', dark ? 'Светлая тема' : 'Тёмная тема');
    tb.title = tb.getAttribute('aria-label');
    $('#branchBtn').innerHTML = I.pin + esc(branch().name) + I.down;
    $('#branchBtn').setAttribute('aria-label', 'Кафе: ' + branch().name + '. Сменить');
    document.querySelectorAll('.tab').forEach(function (t) {
      if (t.getAttribute('data-tab') === S.view) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    var c = cartLines().count;
    $('#badge').innerHTML = c ? '<span class="badge">' + c + '</span>' : '';
    var bar = $('#cartbar');
    if (S.view === 'menu' && c) {
      bar.hidden = false;
      bar.innerHTML = '<a class="press" href="#cart"><span><span class="count">' + c + '</span>Корзина</span><span>' + rub(cartLines().total) + ' →</span></a>';
    } else { bar.hidden = true; bar.innerHTML = ''; }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#2B1A10' : '#FFF6EA');
  }

  /* ---------- экраны ---------- */
  function homeHTML() {
    var st = status(), b = branch();
    var hits = K.hits.map(function (id) {
      var it = ITEMS[id];
      return '<div class="card hit"><div class="plate"><img src="' + img(it) + '" alt="' + esc(nameOf(it)) + '" loading="lazy"></div>' +
        '<div class="hit-name">' + esc(nameOf(it)) + '</div>' +
        '<div class="hit-foot"><span>' + priceLabel(it) + '</span><button class="btn-plus press" data-add="' + id + '" aria-label="Добавить ' + esc(nameOf(it)) + '" style="color:#fff">' + I.plus + '</button></div></div>';
    }).join('');
    return '<div class="view">' +
      '<section class="hero rise">' +
        '<div class="lanterns">' + lantern(RED[0], RED[1], '', 26) + lantern(GREEN[0], GREEN[1], 'l2', 20) + '</div>' +
        '<span class="pill ' + (st.open ? 'open' : 'closed') + '"><span class="dot ' + (st.open ? 'open' : 'closed') + '"></span>' + st.text + '</span>' +
        '<h1>Вкус Вьетнама в&nbsp;Ульяновске</h1>' +
        '<p>Фо, бун ча, нем, рамен, бабл ти — около 80 блюд и напитков.</p>' +
        '<div class="hero-art"><div class="steam">' +
          '<svg width="14" height="40" viewBox="0 0 14 40" aria-hidden="true"><path d="M7 38 C1 30 13 24 7 16 C2 10 11 5 7 0" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'.repeat(3) +
        '</div><img src="img/dishes/f01.webp" alt="Фо Бо"></div>' +
        '<div class="hero-actions"><a class="btn btn-primary press" href="#menu">Смотреть меню</a><a class="btn btn-outline-hero press" href="#cafe">Как добраться</a></div>' +
      '</section>' +
      '<div class="quick rise-2">' +
        '<button class="press" data-copy-phone><span class="qi o">' + I.copy + '</span>Номер кафе</button>' +
        '<a class="press" href="' + K.eda + '" target="_blank" rel="noopener"><span class="qi g">' + I.bike + '</span>Доставка</a>' +
        '<a class="press" href="' + b.org + 'reviews/" target="_blank" rel="noopener"><span class="qi y">' + I.star + '</span>Отзывы</a>' +
      '</div>' +
      '<section class="rise-3" style="display:flex;flex-direction:column;gap:12px">' +
        '<div class="section-title"><h2>Хиты</h2><a class="btn-link" href="#menu" style="text-decoration:none;display:flex;align-items:center">Всё меню →</a></div>' +
        '<div class="hits">' + hits + '</div>' +
      '</section>' +
      '<section class="card steps"><h2>Заказ навынос — просто</h2>' +
        '<div class="step"><b>1</b><span>Соберите заказ в корзине — сразу видно сумму.</span></div>' +
        '<div class="step"><b>2</b><span>Позвоните в кафе и продиктуйте заказ — номер копируется в одно касание.</span></div>' +
        '<div class="step"><b>3</b><span>Заберите заказ в кафе. Оплата на месте.</span></div>' +
      '</section>' +
      pdfLink('pdf-dl press', 'Скачать меню в PDF · ' + K.pdf[b.menu].size) +
    '</div>';
  }
  function pdfLink(cls, label) {
    var p = K.pdf[branch().menu];
    return '<a class="' + cls + '" href="' + p.url + '" download target="_blank" rel="noopener">' + I.dl + label + '</a>';
  }

  function cats() { return K.menu.filter(function (c) { return !c.only || (c.only === 'rad' && isRad()); }); }
  function actHTML(it) {
    var q = qtyOf(it.id);
    if (!it.opts && q > 0) {
      return '<div class="stepper"><button class="press" data-dec="' + it.id + '" aria-label="Убрать одну порцию">' + I.minus + '</button>' +
        '<output aria-live="polite">' + q + '</output>' +
        '<button class="press plus" data-add="' + it.id + '" aria-label="Добавить ещё">' + I.plus + '</button></div>';
    }
    var label = it.opts ? (q > 0 ? 'Ещё · ' + q : 'Выбрать') : 'В корзину';
    return '<button class="add-btn press" data-add="' + it.id + '">' + I.plus + label + '</button>';
  }
  function menuHTML() {
    var list = cats();
    if (!list.some(function (c) { return c.id === S.cat; })) S.cat = 'first';
    var chips = list.map(function (c) {
      return '<button class="chip" data-chip="' + c.id + '"' + (c.id === S.cat ? ' aria-current="true"' : '') + '>' + esc(c.title) + '</button>';
    }).join('');
    var secs = list.map(function (c) {
      var items = c.items.map(function (it) {
        return '<article class="card dish">' +
          '<div class="plate"><img src="' + img(it) + '" alt="' + esc(nameOf(it)) + '" loading="lazy" width="100" height="96" style="object-fit:contain"></div>' +
          '<div class="dish-body"><div class="dish-top">' + (it.no ? '<span class="dish-no">№' + esc(it.no) + '</span>' : '') +
            '<h4 class="dish-name">' + esc(nameOf(it)) + '</h4>' + (it.hot ? I.fire : '') + '</div>' +
            (descOf(it) ? '<p class="dish-desc">' + esc(descOf(it)) + '</p>' : '') +
            '<div class="dish-foot"><div><span class="price">' + priceLabel(it) + '</span><span class="unit">' + esc(unitLabel(it)) + '</span></div>' +
            '<div data-act="' + it.id + '">' + actHTML(it) + '</div></div>' +
          '</div></article>';
      }).join('');
      return '<section class="sec" id="sec-' + c.id + '" data-sec="' + c.id + '" aria-label="' + esc(c.title) + '">' +
        '<div class="sec-head"><h3>' + esc(c.title) + '</h3><i></i><span>' + c.items.length + ' поз.</span></div>' +
        (c.note ? '<div class="note">' + esc(c.note) + '</div>' : '') +
        '<div class="dish-grid">' + items + '</div></section>';
    }).join('');
    var cur = list.filter(function (c) { return c.id === S.cat; })[0];
    return '<div class="menu-sticky"><div class="chips" id="chips" role="tablist" aria-label="Разделы меню">' + chips + '</div>' +
      '<div class="cat-bar"><div><h2 id="catTitle">' + esc(cur.title) + '</h2><small>Цены кафе «' + esc(branch().name) + '»</small></div>' +
      pdfLink('pdf-btn press', 'PDF') + '</div></div>' +
      '<div class="menu-list">' + secs + '<div class="menu-end">Конец меню · приятного аппетита!</div></div>';
  }

  function cartHTML() {
    var c = cartLines(), b = branch();
    var head = '<div class="page-title rise"><h1>Ваш заказ</h1><p>Самовывоз · ' + esc(b.addr) + '</p></div>';
    if (!c.lines.length) {
      return '<div class="view">' + head + '<div class="card empty rise-2">' +
        '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#C2461B" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5"/></svg>' +
        '<b>Пока пусто</b><p>Добавьте блюда из меню — посчитаем сумму.</p><a class="btn btn-primary press" href="#menu">Открыть меню</a></div></div>';
    }
    var lines = c.lines.map(function (l) {
      var sub = l.ok ? [l.opt, unitOf(l.it, l.oi), rub(l.price) + ' / шт'].filter(Boolean).join(' · ') : 'Нет в этом кафе — не входит в сумму';
      return '<div class="line' + (l.ok ? '' : ' off') + '"><div class="plate"><img src="' + img(l.it) + '" alt=""></div>' +
        '<div class="line-body"><span class="line-name">' + esc(nameOf(l.it)) + '</span><span class="line-sub">' + esc(sub) + '</span>' +
        '<span class="line-sum">' + (l.ok ? rub(l.sum) : '—') + '</span></div>' +
        '<div class="stepper"><button class="press" data-line-dec="' + l.key + '" aria-label="Убрать">' + I.minus + '</button><output>' + l.q + '</output>' +
        '<button class="press plus" data-line-inc="' + l.key + '" aria-label="Добавить">' + I.plus + '</button></div></div>';
    }).join('');
    return '<div class="view" style="gap:14px">' + head +
      '<div class="card cart-list rise-2">' + lines + '<div class="total"><span>Итого · ' + c.count + ' поз.</span><strong>' + rub(c.total) + '</strong></div></div>' +
      '<div class="info rise-3">' + I.info + '<span>Онлайн-оплаты нет. Позвоните в кафе и продиктуйте заказ — мы подтвердим и скажем, когда забрать. Оплата на месте.</span></div>' +
      '<button class="btn btn-primary call-btn press" data-copy-phone><span style="display:flex;align-items:center;gap:8px">' + I.copy + 'Скопировать номер кафе</span><small>' + K.phone + '</small></button>' +
      '<div class="row-between"><button class="btn-link" data-copy-order>Скопировать текст заказа</button><button class="btn-link" data-clear style="color:var(--muted)">Очистить</button></div>' +
    '</div>';
  }
  function orderText() {
    var c = cartLines(), b = branch();
    var t = 'Заказ навынос · K-T, ' + b.addr + '\n';
    c.lines.filter(function (l) { return l.ok; }).forEach(function (l, i) {
      t += (i + 1) + '. ' + nameOf(l.it) + (l.opt ? ' (' + l.opt + ')' : '') + ' × ' + l.q + ' — ' + rub(l.sum) + '\n';
    });
    return t + 'Итого: ' + rub(c.total);
  }

  function cafeHTML() {
    var st = status(), sel = branch();
    var cards = K.branches.map(function (b) {
      var on = b.id === sel.id;
      return '<article class="card cafe' + (on ? ' sel' : '') + '"><div class="cafe-head"><div><h2>' + esc(b.name) + '</h2><p>' + esc(b.addr) + '</p></div>' +
        (on ? '<span class="tag">ВЫБРАНО</span>' : (b.menu === 'rad' ? '<span class="tag green">+ РАМЕН</span>' : '')) + '</div>' +
        '<div class="status"><span class="s ' + (st.open ? 'open' : 'closed') + '"><span class="dot ' + (st.open ? 'open' : 'closed') + '"></span>' + st.text + '</span></div>' +
        '<div class="cafe-actions">' +
          '<a class="a-map press" href="' + b.org + '" target="_blank" rel="noopener">' + I.route + 'Маршрут</a>' +
          '<a class="a-eda press" href="' + K.eda + '" target="_blank" rel="noopener">' + I.bike.replace('width="20" height="20"', 'width="18" height="18"') + 'Яндекс Еда</a>' +
          '<a class="a-rev press" href="' + b.org + 'reviews/" target="_blank" rel="noopener">' + I.star.replace('width="20" height="20"', 'width="18" height="18"') + 'Отзывы</a>' +
        '</div>' +
        (on ? '' : '<button class="choose press" data-choose="' + b.id + '">Выбрать это кафе</button>') +
      '</article>';
    }).join('');
    return '<div class="view" style="gap:14px"><div class="page-title rise"><h1>Наши кафе</h1><p>Ульяновск · три адреса</p></div>' +
      '<div class="map rise-2"><iframe src="' + sel.widget + '" title="Карта: K-T, ' + esc(sel.addr) + '" loading="lazy" allowfullscreen></iframe></div>' +
      '<button class="card phone-card press rise-3" data-copy-phone><span class="qi o">' + I.phone + '</span>' +
        '<span class="grow"><small>Единый номер · ежедневно ' + K.open + ':00–' + K.close + ':00</small><strong>' + K.phone + '</strong></span><em>Копировать</em></button>' +
      cards + '</div>';
  }

  /* ---------- заставка выбора кафе ---------- */
  function openSplash() {
    var st = status();
    var items = K.branches.map(function (b) {
      return '<button class="splash-item press" data-pick="' + b.id + '"><span class="pin">' + I.pinW + '</span>' +
        '<span class="txt"><span class="nm">' + esc(b.name) + (b.menu === 'rad' ? ' <span class="tag green">+ РАМЕН</span>' : '') + '</span>' +
        '<span class="ad">' + esc(b.addr) + '</span>' +
        '<span class="st ' + (st.open ? 'open' : 'closed') + '"><span class="dot ' + (st.open ? 'open' : 'closed') + '"></span>' + st.text + '</span></span>' + I.chev + '</button>';
    }).join('');
    var el = $('#splash');
    el.innerHTML = '<div class="wrap">' +
      '<div class="splash-lanterns">' + lantern(RED[0], RED[1], '', 34) + lantern(GREEN[0], GREEN[1], 'l3', 34) + '</div>' +
      '<div class="splash-logo">' + logo(true) + '</div>' +
      '<div class="splash-text"><small>Вьетнамская кухня · Ульяновск</small><h1>Выберите кафе</h1><p>Покажем меню и цены именно этого кафе. Сменить можно в любой момент.</p></div>' +
      '<div class="splash-list">' + items + '</div>' +
      '<p class="splash-foot">Без регистрации и онлайн-оплаты — только меню, адреса и самовывоз.</p></div>';
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = el.querySelector('[data-pick]'); if (first) first.focus({ preventScroll: true });
  }
  function closeSplash() { $('#splash').hidden = true; document.body.style.overflow = ''; }

  /* ---------- шторка вариантов ---------- */
  var sheet = null;
  function openSheet(id) {
    sheet = { id: id, oi: 0 };
    renderSheet();
  }
  function renderSheet() {
    var root = $('#sheetRoot');
    if (!sheet) { root.innerHTML = ''; return; }
    var it = ITEMS[sheet.id];
    var opts = it.opts.map(function (o, i) {
      return '<button class="opt press" role="radio" aria-checked="' + (i === sheet.oi) + '" data-opt="' + i + '"><span class="radio"></span>' +
        '<span class="l">' + esc(o.l) + '</span><span class="u">' + esc(unitOf(it, i)) + '</span><span class="p">' + rub(priceOf(it, i)) + '</span></button>';
    }).join('');
    root.innerHTML = '<div class="sheet-back" data-close-sheet></div>' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(nameOf(it)) + '"><div class="grip"></div>' +
      '<div class="sheet-head"><div class="plate"><img src="' + img(it) + '" alt=""></div><div style="flex-grow:1"><h2>' + esc(nameOf(it)) + '</h2><p>' + esc(descOf(it)) + '</p></div>' +
      '<button class="icon-btn" data-close-sheet aria-label="Закрыть">' + I.close + '</button></div>' +
      '<div class="opt-title">' + esc(it.optTitle || 'Вариант') + '</div><div class="opts" role="radiogroup">' + opts + '</div>' +
      '<button class="btn btn-primary press" data-sheet-add style="min-height:54px;font-size:16px">Добавить · ' + rub(priceOf(it, sheet.oi)) + '</button></div>';
    var cur = root.querySelector('[aria-checked="true"]'); if (cur) cur.focus({ preventScroll: true });
  }

  /* ---------- корзина ---------- */
  function change(key, delta) {
    S.cart[key] = (S.cart[key] || 0) + delta;
    if (S.cart[key] <= 0) delete S.cart[key];
    save('kt.cart', S.cart);
    var id = key.split('|')[0];
    if (S.view === 'menu' || S.view === 'home') {
      document.querySelectorAll('[data-act="' + id + '"]').forEach(function (el) { el.innerHTML = actHTML(ITEMS[id]); });
    } else if (S.view === 'cart') {
      $('#view').innerHTML = cartHTML();
    }
    renderChrome();
  }
  function tapAdd(id) {
    var it = ITEMS[id];
    if (it.opts) { openSheet(id); return; }
    change(id + '|0', 1);
    if (S.view === 'home') toast('Добавлено: ' + nameOf(it));
  }

  /* ---------- меню: лента, липкая шапка, «карусель» разделов ---------- */
  var spyLock = false, spyTimer = 0, rafId = 0;
  function stickyOffset() {
    var st = $('.menu-sticky'); var h = $('.topbar').offsetHeight;
    return h + (st ? st.offsetHeight : 0);
  }
  function setActive(id, animate) {
    if (id === S.cat && !animate) return;
    var changed = id !== S.cat;
    S.cat = id;
    document.querySelectorAll('.chip').forEach(function (c) {
      if (c.getAttribute('data-chip') === id) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
    });
    var c = cats().filter(function (x) { return x.id === id; })[0];
    var t = $('#catTitle');
    if (t && c && changed) { t.textContent = c.title; t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap'); }
    centerChip(id);
  }
  function centerChip(id) {
    var bar = $('#chips'); if (!bar) return;
    var el = bar.querySelector('[data-chip="' + id + '"]'); if (!el) return;
    var left = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
  function spy() {
    rafId = 0;
    if (S.view !== 'menu' || spyLock) return;
    var off = stickyOffset() + 24, cur = null;
    document.querySelectorAll('.sec').forEach(function (s) { if (s.getBoundingClientRect().top <= off) cur = s.getAttribute('data-sec'); });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      var all = document.querySelectorAll('.sec'); if (all.length) cur = all[all.length - 1].getAttribute('data-sec');
    }
    setActive(cur || cats()[0].id);
  }
  window.addEventListener('scroll', function () { if (!rafId) rafId = requestAnimationFrame(spy); }, { passive: true });
  function jumpTo(id) {
    var sec = document.getElementById('sec-' + id); if (!sec) return;
    setActive(id, true);
    spyLock = true; clearTimeout(spyTimer);
    var top = sec.getBoundingClientRect().top + window.scrollY - stickyOffset() + 2;
    window.scrollTo({ top: top, behavior: 'smooth' });
    spyTimer = setTimeout(function () { spyLock = false; }, 900);
  }

  /* ---------- навигация ---------- */
  function render(enter) {
    var v = $('#view');
    var html = S.view === 'menu' ? menuHTML() : S.view === 'cart' ? cartHTML() : S.view === 'cafe' ? cafeHTML() : homeHTML();
    v.innerHTML = html;
    if (enter) {
      v.classList.add('entering'); clearTimeout(render._t);
      render._t = setTimeout(function () { v.classList.remove('entering'); }, 700);
    }
    renderChrome();
    if (S.view === 'menu') requestAnimationFrame(function () { centerChip(S.cat); });
  }
  function route() {
    var h = (location.hash || '#home').slice(1);
    S.view = ['home', 'menu', 'cart', 'cafe'].indexOf(h) >= 0 ? h : 'home';
    if (S.view === 'menu') S.cat = cats()[0].id;
    sheet = null; renderSheet();
    render(true);
    window.scrollTo(0, 0);
    var titles = { home: 'K-T — вьетнамская кухня в Ульяновске', menu: 'Меню — K-T', cart: 'Корзина — K-T', cafe: 'Адреса кафе — K-T' };
    document.title = titles[S.view];
  }
  window.addEventListener('hashchange', route);

  /* ---------- клики ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-close-sheet]'); if (!t) return;
    var d = t.dataset;
    if (t.id === 'themeBtn') {
      var next = theme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('kt.theme', next); } catch (err) {}
      renderChrome(); return;
    }
    if (t.id === 'branchBtn') { openSplash(); return; }
    if (d.pick) {
      var changed = S.branch !== d.pick;
      S.branch = d.pick; save('kt.branch', S.branch); closeSplash();
      if (changed || !$('#view').innerHTML) render(true); else renderChrome();
      if (changed) toast('Кафе «' + branch().name + '» — меню и цены обновлены');
      return;
    }
    if (d.chip) { jumpTo(d.chip); return; }
    if (d.add) { tapAdd(d.add); return; }
    if (d.dec) { change(d.dec + '|0', -1); return; }
    if (d.lineInc) { change(d.lineInc, 1); return; }
    if (d.lineDec) { change(d.lineDec, -1); return; }
    if (d.opt != null && sheet) { sheet.oi = +d.opt; renderSheet(); return; }
    if ('sheetAdd' in d && sheet) {
      var key = sheet.id + '|' + sheet.oi; sheet = null; renderSheet();
      change(key, 1); toast('Добавлено в корзину'); return;
    }
    if ('closeSheet' in d) { sheet = null; renderSheet(); return; }
    if ('copyPhone' in d) { copy(K.phone, 'Номер скопирован: ' + K.phone); return; }
    if ('copyOrder' in d) { copy(orderText(), 'Текст заказа скопирован'); return; }
    if ('clear' in d) { S.cart = {}; save('kt.cart', S.cart); render(false); return; }
    if (d.choose) { S.branch = d.choose; save('kt.branch', S.branch); render(false); toast('Выбрано кафе «' + branch().name + '»'); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheet) { sheet = null; renderSheet(); }
  });

  /* ---------- старт ---------- */
  $('#headerLogo').innerHTML = logo(true);
  route();
  if (!S.branch) openSplash();
  // обновлять статус «Открыто/Закрыто» раз в минуту
  setInterval(function () { if (S.view === 'home' || S.view === 'cafe') { var y = window.scrollY; render(false); window.scrollTo(0, y); } }, 60000);
})();

/* =====================================================================
   LEGADO BARBER — servicos.js
   Página de serviços: categorias, busca e seleção.
     - "Agendar" no cartão  -> vai direto para agendar.html com aquele serviço
     - "+" no cartão        -> junta vários serviços; a barra inferior leva ao agendamento
   A categoria pode vir na URL: servicos.html?cat=Barba
   ===================================================================== */
(function () {
  'use strict';
  var LB = window.LB, $ = LB.$, esc = LB.esc, icon = LB.icon, money = LB.money, norm = LB.norm;

  var params = new URLSearchParams(window.location.search);
  var view = { category: params.get('cat') || 'Todos', query: '', selected: [] };

  // Retoma serviços escolhidos antes (rascunho do agendamento).
  var draft = LB.draft.get();
  if (Array.isArray(draft.serviceIds)) {
    view.selected = draft.serviceIds.filter(function (id) { return LB.isBookable(LB.getService(id)); });
  }

  function categoriesWithServices() {
    var all = LB.activeServices();
    return LB.CATEGORIES.filter(function (c) { return all.some(function (s) { return s.category === c.id; }); });
  }

  /* ---------- Categorias ---------- */
  function renderTiles() {
    var all = LB.activeServices();
    var cats = categoriesWithServices();
    if (view.category !== 'Todos' && !cats.some(function (c) { return c.id === view.category; })) view.category = 'Todos';
    var tile = function (id, ic, label, n) {
      var on = view.category === id;
      return '<button type="button" class="cat-tile ' + (on ? 'active' : '') + '" data-action="pick-cat" data-cat="' + esc(id) + '" aria-pressed="' + on + '">' +
        '<span class="ct-ic">' + icon(ic) + '</span><strong>' + esc(label) + '</strong><small>' + n + (n === 1 ? ' serviço' : ' serviços') + '</small></button>';
    };
    $('#catTiles').innerHTML = tile('Todos', 'list', 'Todos os serviços', all.length) +
      cats.map(function (c) { return tile(c.id, c.icon, c.id, all.filter(function (s) { return s.category === c.id; }).length); }).join('');
  }

  /* ---------- Lista agrupada por categoria ---------- */
  function card(s) {
    var ok = LB.isBookable(s);
    var picked = view.selected.indexOf(s.id) >= 0;
    return '<article class="card svc ' + (picked ? 'is-selected' : '') + ' ' + (ok ? '' : 'is-disabled') + '">' +
      '<div class="svc-top"><span class="tag">' + esc(s.category) + '</span>' + (picked ? '<span class="sel-mark">' + icon('check') + '</span>' : '') + '</div>' +
      '<h3>' + esc(s.name) + '</h3>' +
      '<div class="svc-meta"><span class="price">' + money(s.price) + '</span>' +
      '<span class="dur ' + (s.duration ? '' : 'dur-tbd') + '">' + icon('clock') + ' ' + LB.fmtDuration(s.duration) + '</span></div>' +
      (ok
        ? '<div class="svc-actions"><a class="btn btn-gold" href="' + LB.href('agendar', '?servicos=' + encodeURIComponent(s.id)) + '">Agendar</a>' +
          '<button type="button" class="add-btn" data-action="toggle-service" data-id="' + esc(s.id) + '" aria-pressed="' + picked + '" aria-label="' + (picked ? 'Remover ' : 'Adicionar ') + esc(s.name) + (picked ? ' da reserva' : ' à reserva') + '">' + icon(picked ? 'check' : 'plus') + '</button></div>'
        : '<div class="svc-actions"><button type="button" class="btn btn-ghost" disabled>Indisponível para agendar</button></div><p class="svc-note">Disponível após a barbearia definir a duração.</p>') +
      '</article>';
  }

  function renderList() {
    var q = norm(view.query);
    var all = LB.activeServices().filter(function (s) { return !q || norm(s.name).indexOf(q) >= 0; });
    var cats = categoriesWithServices().filter(function (c) { return view.category === 'Todos' || c.id === view.category; });
    var shown = 0, html = '';
    cats.forEach(function (c) {
      var list = all.filter(function (s) { return s.category === c.id; });
      if (!list.length) return;
      shown += list.length;
      html += '<section class="svc-group" id="cat-' + esc(LB.norm(c.id).replace(/[^a-z0-9]+/g, '-')) + '">' +
        '<div class="svc-group-head"><span class="ct-ic">' + icon(c.icon) + '</span><div><h2>' + esc(c.id) + '</h2><p>' + esc(c.desc) + '</p></div></div>' +
        '<div class="svc-grid">' + list.map(card).join('') + '</div></section>';
    });
    $('#svcCount').textContent = shown + (shown === 1 ? ' serviço encontrado' : ' serviços encontrados');
    $('#svcList').innerHTML = html || LB.emptyState('search', 'Nenhum serviço encontrado para essa busca. Tente outro nome ou categoria.');
    renderBar();
  }

  /* ---------- Barra de seleção (vários serviços) ---------- */
  function renderBar() {
    var bar = $('#selectBar');
    var sum = LB.summarize(view.selected);
    var n = sum.items.length;
    bar.hidden = !n;
    if (!n) { bar.innerHTML = ''; return; }
    bar.innerHTML =
      '<div class="sel-info"><strong>' + n + (n === 1 ? ' serviço selecionado' : ' serviços selecionados') + '</strong>' +
      '<span>Total ' + money(sum.total) + ' · ' + LB.fmtDuration(sum.duration) + '</span></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="clear-selection">Limpar</button>' +
      '<a class="btn btn-gold" href="' + LB.href('agendar', '?servicos=' + view.selected.map(encodeURIComponent).join(',')) + '">Agendar horário ' + icon('arrow-right') + '</a>';
  }

  function syncUrl() {
    try {
      var p = new URLSearchParams();
      if (view.category !== 'Todos') p.set('cat', view.category);
      window.history.replaceState(null, '', window.location.pathname + (p.toString() ? '?' + p.toString() : ''));
    } catch (e) { /* alguns navegadores bloqueiam em file:// — sem problema */ }
  }

  /* ---------- Eventos ---------- */
  Object.assign(LB.actions, {
    'pick-cat': function (el) {
      view.category = el.getAttribute('data-cat');
      syncUrl();
      renderTiles();
      renderList();
      var list = $('#svcList');
      if (list && list.getBoundingClientRect().top > window.innerHeight * 0.7) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    'toggle-service': function (el) {
      var id = el.getAttribute('data-id');
      var i = view.selected.indexOf(id);
      if (i >= 0) view.selected.splice(i, 1); else view.selected.push(id);
      LB.draft.set(Object.assign(LB.draft.get(), { serviceIds: view.selected, time: null }));
      renderList();
    },
    'clear-selection': function () {
      view.selected = [];
      LB.draft.set(Object.assign(LB.draft.get(), { serviceIds: [], time: null }));
      renderList();
    }
  });
  LB.inputs['svc-search'] = function (el) { view.query = el.value; renderList(); };

  renderTiles();
  renderList();
})();

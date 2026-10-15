/* =====================================================================
   LEGADO BARBER — home.js
   Página inicial: pontos de destaque, categorias, serviços em destaque
   e o profissional. Tudo é montado a partir dos dados salvos.
   ===================================================================== */
(function () {
  'use strict';
  var LB = window.LB, $ = LB.$, esc = LB.esc, icon = LB.icon, money = LB.money;

  var settings = LB.state.settings;
  var services = LB.activeServices();
  var barbers = LB.activeBarbers();

  // Pontos de destaque no topo
  $('#heroPoints').innerHTML = [
    ['scissors', services.length + (services.length === 1 ? ' serviço' : ' serviços')],
    ['user', barbers.length === 1 ? 'Atendimento com ' + esc(barbers[0].name) : barbers.length + ' profissionais'],
    ['clock', 'Das ' + LB.fmtHour(settings.open) + ' às ' + LB.fmtHour(settings.close)]
  ].map(function (r) { return '<li>' + icon(r[0]) + '<span>' + r[1] + '</span></li>'; }).join('');

  // Categorias: cada uma leva para servicos.html?cat=...
  $('#catTiles').innerHTML = LB.CATEGORIES.map(function (c) {
    var n = services.filter(function (s) { return s.category === c.id; }).length;
    if (!n) return '';
    return '<a class="cat-tile" href="' + LB.href('servicos', '?cat=' + encodeURIComponent(c.id)) + '">' +
      '<span class="ct-ic">' + icon(c.icon) + '</span><strong>' + esc(c.id) + '</strong>' +
      '<small>' + n + (n === 1 ? ' serviço' : ' serviços') + '</small></a>';
  }).join('');

  // Serviços em destaque
  var featured = ['s01', 's13', 's04', 's03'].map(LB.getService).filter(function (s) { return s && s.active; });
  $('#featured').innerHTML = featured.length ? featured.map(function (s) {
    var ok = LB.isBookable(s);
    return '<article class="card svc hoverable">' +
      '<div class="svc-top"><span class="tag">' + esc(s.category) + '</span></div>' +
      '<h3>' + esc(s.name) + '</h3>' +
      '<div class="svc-meta"><span class="price">' + money(s.price) + '</span>' +
      '<span class="dur ' + (s.duration ? '' : 'dur-tbd') + '">' + icon('clock') + ' ' + LB.fmtDuration(s.duration) + '</span></div>' +
      (ok ? '<a class="btn btn-ghost btn-block" href="' + LB.href('agendar', '?servicos=' + encodeURIComponent(s.id)) + '">Agendar</a>'
          : '<button type="button" class="btn btn-ghost btn-block" disabled>Indisponível</button>') +
      '</article>';
  }).join('') : LB.emptyState('scissors', 'Nenhum serviço em destaque disponível no momento.');

  // Profissional
  $('#homePro').innerHTML = barbers.length ? barbers.map(function (b) {
    return '<article class="card pro-card"><span class="avatar">' + esc(LB.initials(b.name)) + '</span>' +
      '<div class="grow"><h3>' + esc(b.name) + '</h3><p class="muted">' + esc(b.specialty || 'Barbeiro') + '</p></div>' +
      '<a class="btn btn-gold" href="' + LB.href('agendar') + '">Agendar com ' + esc(b.name) + '</a></article>';
  }).join('') : LB.emptyState('user', 'Nenhum profissional ativo no momento.');
})();

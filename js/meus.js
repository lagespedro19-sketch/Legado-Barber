/* =====================================================================
   LEGADO BARBER — meus.js
   "Meus agendamentos": consulta por telefone ou código e cancelamento
   com confirmação. (Demonstração: não há login de verdade.)
   ===================================================================== */
(function () {
  'use strict';
  var LB = window.LB, $ = LB.$, esc = LB.esc, icon = LB.icon, money = LB.money, digits = LB.digits;

  var query = LB.store.get(LB.PHONE_KEY) || ''; // último telefone usado em um agendamento

  function find(q) {
    q = q.trim();
    if (/[a-z]/i.test(q)) { // tem letras => código da reserva
      var code = q.toUpperCase().replace(/\s/g, '');
      return { list: LB.state.appointments.filter(function (a) { return a.code === code; }) };
    }
    var d = digits(q);
    if (d.length < 8) return { error: 'Informe ao menos 8 dígitos do telefone ou o código da reserva (ex.: LB-XXXXX).' };
    return { list: LB.state.appointments.filter(function (a) { return digits(a.phone).slice(-d.length) === d; }) };
  }

  function card(a) {
    var canCancel = a.status === 'pendente' || a.status === 'confirmado';
    return '<article class="card appt"><header><span class="code">' + esc(a.code) + '</span>' + LB.badge(a.status) + '</header>' +
      '<h3>' + LB.itemsLabel(a) + '</h3>' +
      '<ul class="appt-meta"><li>' + icon('calendar') + ' ' + esc(LB.fmtDateLong(a.date)) + '</li>' +
      '<li>' + icon('clock') + ' ' + a.start + ' – ' + LB.fromMin(LB.apptEnd(a)) + ' (' + LB.fmtDuration(a.duration) + ')</li>' +
      '<li>' + icon('user') + ' ' + esc(LB.barberName(a.barberId)) + '</li></ul>' +
      '<footer><span class="price">' + money(a.total) + '</span>' +
      (canCancel ? '<button type="button" class="btn btn-danger btn-sm" data-action="client-cancel" data-id="' + esc(a.id) + '">' + icon('x') + ' Cancelar agendamento</button>' : '') +
      '</footer></article>';
  }

  function renderResults() {
    var box = $('#mineResults');
    var q = query.trim();
    if (!q) { box.innerHTML = LB.emptyState('calendar', 'Informe seu telefone ou o código da reserva para consultar seus agendamentos.'); return; }
    var r = find(q);
    if (r.error) { box.innerHTML = '<div class="alert alert-error">' + icon('alert') + '<span>' + esc(r.error) + '</span></div>'; return; }
    if (!r.list.length) { box.innerHTML = LB.emptyState('search', 'Nenhum agendamento encontrado para essa busca.'); return; }
    var today = LB.todayISO();
    var upcoming = r.list.filter(function (a) { return (a.status === 'pendente' || a.status === 'confirmado') && a.date >= today; }).sort(LB.byDateTime);
    var history = r.list.filter(function (a) { return upcoming.indexOf(a) < 0; }).sort(function (a, b) { return LB.byDateTime(b, a); });
    box.innerHTML =
      (upcoming.length ? '<h3 class="list-title">Próximos agendamentos</h3><div class="appt-list">' + upcoming.map(card).join('') + '</div>' : '') +
      (history.length ? '<h3 class="list-title">Histórico</h3><div class="appt-list">' + history.map(card).join('') + '</div>' : '');
  }

  // Cancelamento pelo cliente — sempre pede confirmação.
  function cancel(id) {
    LB.reloadState();
    var a = LB.state.appointments.filter(function (x) { return x.id === id; })[0];
    if (!a) return LB.toast('error', 'Agendamento não encontrado.');
    if (a.status !== 'pendente' && a.status !== 'confirmado') return LB.toast('error', 'Este agendamento não pode mais ser cancelado.');
    LB.confirm({
      title: 'Cancelar agendamento?',
      message: a.items.map(function (i) { return i.name; }).join(' + ') + ' — ' + LB.fmtDateShort(a.date) + ' às ' + a.start + ' com ' + LB.barberName(a.barberId) + '. Esta ação não pode ser desfeita.',
      confirmText: 'Sim, cancelar', cancelText: 'Manter agendamento', danger: true
    }, function () {
      LB.setApptStatus(id, 'cancelado');
      LB.toast('success', 'Agendamento ' + a.code + ' cancelado.');
      renderResults();
    });
  }

  Object.assign(LB.actions, {
    'client-cancel': function (el) { cancel(el.getAttribute('data-id')); },
    'mine-demo': function () {
      query = LB.DEMO_CLIENTS[0].phone;
      $('#mineQuery').value = query;
      renderResults();
    }
  });
  LB.inputs['mine-query'] = function (el) { query = el.value; };
  LB.forms.mineForm = function () { renderResults(); };

  $('#mineQuery').value = query;
  renderResults();
})();

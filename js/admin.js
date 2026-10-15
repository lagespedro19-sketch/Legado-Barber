/* =====================================================================
   LEGADO BARBER — admin.js
   Painel administrativo (demonstrativo — sem autenticação real).
   Seções (menu lateral, trocadas por #/secao na URL):
     Visão geral · Agenda · Serviços · Profissionais · Funcionamento
     · Clientes · Financeiro
   Todos os números vêm dos dados salvos no navegador (localStorage).
   ===================================================================== */
(function () {
  'use strict';
  var LB = window.LB, $ = LB.$, $$ = LB.$$, esc = LB.esc, icon = LB.icon, money = LB.money, norm = LB.norm, digits = LB.digits;
  var toMin = LB.toMin, fromMin = LB.fromMin;

  var SECTIONS = [
    { id: 'overview', label: 'Visão geral', short: 'Visão', icon: 'layout' },
    { id: 'agenda', label: 'Agenda', short: 'Agenda', icon: 'calendar' },
    { id: 'services', label: 'Serviços', short: 'Serviços', icon: 'scissors' },
    { id: 'barbers', label: 'Profissionais', short: 'Equipe', icon: 'users' },
    { id: 'hours', label: 'Funcionamento', short: 'Horários', icon: 'clock' },
    { id: 'clients', label: 'Clientes', short: 'Clientes', icon: 'user' },
    { id: 'finance', label: 'Financeiro', short: 'Finanças', icon: 'wallet' }
  ];
  // Filtros de cada tela (não são salvos).
  var f = { agenda: { q: '', status: 'all', barber: 'all', period: 'all' }, svcQuery: '', svcStatus: 'all', clientQuery: '' };

  /* ---------- Navegação ---------- */
  function currentSection() {
    var id = window.location.hash.replace(/^#\/?/, '');
    return SECTIONS.filter(function (s) { return s.id === id; })[0] || SECTIONS[0];
  }
  function buildNav() {
    $('#adminNav').innerHTML = SECTIONS.map(function (s) {
      return '<a class="snav-btn" href="#/' + s.id + '" data-section="' + s.id + '">' + icon(s.icon) +
        '<span class="lbl-long">' + s.label + '</span><span class="lbl-short">' + s.short + '</span></a>';
    }).join('');
  }
  function render() {
    LB.reloadState();
    var sec = currentSection();
    $$('.snav-btn').forEach(function (a) {
      var on = a.getAttribute('data-section') === sec.id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('#adminTitle').textContent = sec.label;
    $('#adminDate').textContent = LB.fmtDateLong(LB.todayISO());
    document.title = sec.label + ' — Painel Administrativo — Legado Barber';
    var views = { overview: overview, agenda: agenda, services: services, barbers: barbers, hours: hours, clients: clients, finance: finance };
    views[sec.id]($('#adminContent'));
  }

  /* ---------- Componentes ---------- */
  function demoBanner(text) { return '<div class="demo-banner">' + icon('info') + '<span>' + text + '</span></div>'; }
  function statCard(ic, label, value, sub, tone) {
    return '<div class="card stat ' + (tone || '') + '"><span class="stat-ic">' + icon(ic) + '</span><div><span class="stat-label">' + label +
      '</span><strong class="stat-value">' + value + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
  }
  function barChart(items) {
    var max = Math.max.apply(null, [1].concat(items.map(function (i) { return i.value; })));
    return '<div class="bars" role="img" aria-label="Gráfico de barras">' + items.map(function (i) {
      return '<div class="bar-col ' + (i.hl ? 'hl' : '') + '"><span class="bar-val">' + i.display + '</span><div class="bar-track"><div class="bar-fill" style="height:' +
        (i.value > 0 ? Math.max(3, Math.round(i.value / max * 100)) : 0) + '%"></div></div><span class="bar-lbl">' + i.label + '</span></div>';
    }).join('') + '</div>';
  }
  function hBars(items) {
    var max = Math.max.apply(null, [1].concat(items.map(function (i) { return i.value; })));
    return items.map(function (i) {
      return '<div class="hbar"><div class="hbar-top"><span>' + esc(i.label) + '</span><b>' + i.display + '</b></div><div class="hbar-track"><div class="hbar-fill" style="width:' + Math.round(i.value / max * 100) + '%"></div></div></div>';
    }).join('');
  }
  function formError(id, msg) {
    var el = $('#' + id);
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function findAppt(id) { return LB.state.appointments.filter(function (a) { return a.id === id; })[0]; }
  function setStatus(id, status, msg) {
    var a = LB.setApptStatus(id, status);
    if (!a) return LB.toast('error', 'Agendamento não encontrado.');
    LB.toast('success', msg.replace('{code}', a.code));
    render();
  }

  /* =====================================================================
     VISÃO GERAL
     ===================================================================== */
  function overview(c) {
    var s = LB.computeStats(), A = LB.state.appointments;
    var now = new Date(), nowISO = LB.toISO(now), nowMin = now.getHours() * 60 + now.getMinutes();
    var upcoming = A.filter(function (a) {
      return (a.status === 'pendente' || a.status === 'confirmado') && (a.date > nowISO || (a.date === nowISO && LB.apptEnd(a) > nowMin));
    }).sort(LB.byDateTime).slice(0, 6);

    var week = [], ws = LB.weekRange()[0];
    for (var i = 0; i < 7; i++) {
      var iso = LB.toISO(LB.addDays(LB.parseISO(ws), i));
      var n = A.filter(function (a) { return a.date === iso && a.status !== 'cancelado'; }).length;
      week.push({ label: LB.fmtWeekdayShort(iso) + '<br>' + iso.slice(8), value: n, display: String(n), hl: iso === LB.todayISO() });
    }
    var counts = {};
    A.filter(function (a) { return a.status !== 'cancelado'; }).forEach(function (a) { a.items.forEach(function (it) { counts[it.name] = (counts[it.name] || 0) + 1; }); });
    var top = Object.keys(counts).map(function (k) { return { label: k, value: counts[k], display: counts[k] + 'x' }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 5);

    c.innerHTML =
      demoBanner('Todos os números são calculados a partir dos <strong>dados demonstrativos</strong> deste navegador. Os valores <strong>não representam movimentações financeiras reais</strong>.') +
      '<div class="stat-grid">' +
        statCard('calendar', 'Agendamentos de hoje', s.today, 'exceto cancelados') +
        statCard('list', 'Agendamentos da semana', s.week, 'segunda a domingo, exceto cancelados') +
        statCard('clock', 'Pendentes', s.pending, 'aguardando confirmação', 't-warn') +
        statCard('check-circle', 'Concluídos', s.done, 'atendimentos finalizados', 't-ok') +
        statCard('ban', 'Cancelados', s.canceled, 'não entram na receita', 't-err') +
        statCard('wallet', 'Faturamento estimado', money(s.revenue), 'somente agendamentos concluídos') +
      '</div>' +
      '<div class="grid-2">' +
        '<section class="card panel"><h3>Próximos agendamentos</h3>' + (upcoming.length ? upcoming.map(function (a) {
          return '<div class="row-item"><div class="when"><b>' + a.start + '</b>' + LB.fmtDateShort(a.date).slice(0, 5) + '</div><div class="grow"><strong>' + esc(a.clientName) + '</strong><small>' + LB.itemsLabel(a) + '</small></div>' + LB.badge(a.status) + '</div>';
        }).join('') : LB.emptyState('calendar', 'Nenhum agendamento futuro pendente ou confirmado.')) + '</section>' +
        '<section class="card panel"><h3>Agendamentos da semana</h3><p class="sub">Por dia, exceto cancelados.</p>' + barChart(week) + '</section>' +
      '</div>' +
      '<section class="card panel"><h3>Serviços mais agendados</h3><p class="sub">Considera todos os agendamentos não cancelados.</p>' + (top.length ? hBars(top) : LB.emptyState('scissors', 'Ainda não há agendamentos.')) + '</section>';
  }

  /* =====================================================================
     AGENDA
     ===================================================================== */
  function agenda(c) {
    var q = f.agenda, multi = LB.state.barbers.length > 1;
    c.innerHTML =
      '<div class="card toolbar">' +
        '<label class="search grow">' + icon('search') + '<input type="search" data-input="ag-q" placeholder="Buscar por cliente, telefone ou código" aria-label="Buscar agendamentos" value="' + esc(q.q) + '" autocomplete="off"></label>' +
        '<select data-input="ag-period" aria-label="Período">' + LB.opt('all', 'Todos os períodos', q.period) + LB.opt('today', 'Hoje', q.period) + LB.opt('week', 'Esta semana', q.period) + LB.opt('future', 'Próximos dias', q.period) + LB.opt('past', 'Passados', q.period) + '</select>' +
        '<select data-input="ag-status" aria-label="Status">' + LB.opt('all', 'Todos os status', q.status) + Object.keys(LB.STATUS).map(function (k) { return LB.opt(k, LB.STATUS[k].label, q.status); }).join('') + '</select>' +
        (multi ? '<select data-input="ag-barber" aria-label="Profissional">' + LB.opt('all', 'Todos os profissionais', q.barber) + LB.state.barbers.map(function (b) { return LB.opt(b.id, b.name, q.barber); }).join('') + '</select>' : '') +
      '</div><p class="result-count" id="agCount" aria-live="polite"></p><div id="agList"></div>';
    agendaList();
  }
  function agendaList() {
    var box = $('#agList');
    if (!box) return;
    var q = f.agenda, nq = norm(q.q), today = LB.todayISO(), wr = LB.weekRange(), multi = LB.state.barbers.length > 1;
    var list = LB.state.appointments.filter(function (a) {
      if (q.status !== 'all' && a.status !== q.status) return false;
      if (q.barber !== 'all' && a.barberId !== q.barber) return false;
      if (q.period === 'today' && a.date !== today) return false;
      if (q.period === 'week' && (a.date < wr[0] || a.date > wr[1])) return false;
      if (q.period === 'future' && a.date <= today) return false;
      if (q.period === 'past' && a.date >= today) return false;
      if (nq && !(norm(a.clientName).indexOf(nq) >= 0 || (digits(q.q) && digits(a.phone).indexOf(digits(q.q)) >= 0) || norm(a.code).indexOf(nq) >= 0)) return false;
      return true;
    }).sort(LB.byDateTime);
    if (q.period === 'past' || q.period === 'all') list.reverse();
    $('#agCount').textContent = list.length + (list.length === 1 ? ' agendamento' : ' agendamentos');
    box.innerHTML = list.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Serviço</th>' + (multi ? '<th>Profissional</th>' : '') + '<th>Data e horário</th><th class="num">Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>' +
      list.map(function (a) {
        var acts = [];
        if (a.status === 'pendente') acts.push('<button type="button" class="btn btn-ok btn-sm" data-action="appt-confirm" data-id="' + esc(a.id) + '">' + icon('check') + ' Confirmar</button>');
        if (a.status === 'pendente' || a.status === 'confirmado') {
          acts.push('<button type="button" class="btn btn-ghost btn-sm" data-action="appt-complete" data-id="' + esc(a.id) + '">' + icon('check-circle') + ' Concluir</button>');
          acts.push('<button type="button" class="btn btn-danger btn-sm" data-action="appt-cancel" data-id="' + esc(a.id) + '">' + icon('x') + ' Cancelar</button>');
        }
        return '<tr><td data-label="Cliente"><div><strong>' + esc(a.clientName) + '</strong><small>' + esc(a.phone) + ' · ' + esc(a.code) + '</small></div></td>' +
          '<td data-label="Serviço"><div>' + LB.itemsLabel(a) + '<small>' + LB.fmtDuration(a.duration) + '</small></div></td>' +
          (multi ? '<td data-label="Profissional">' + esc(LB.barberName(a.barberId)) + '</td>' : '') +
          '<td data-label="Data e horário"><div>' + LB.fmtDateShort(a.date) + ' <small style="display:inline">(' + LB.fmtWeekdayShort(a.date) + ')</small><small>' + a.start + ' – ' + fromMin(LB.apptEnd(a)) + '</small></div></td>' +
          '<td data-label="Valor" class="num">' + money(a.total) + '</td>' +
          '<td data-label="Status">' + LB.badge(a.status) + '</td>' +
          '<td data-label="Ações" class="actions">' + (acts.join('') || '<small class="muted">—</small>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card">' + LB.emptyState('calendar', 'Nenhum agendamento encontrado com esses filtros.') + '</div>';
  }

  /* =====================================================================
     SERVIÇOS
     ===================================================================== */
  function services(c) {
    var pend = LB.state.services.filter(function (s) { return !(Number(s.duration) > 0); }).length;
    c.innerHTML =
      (pend ? '<div class="alert alert-warn" style="margin-bottom:14px">' + icon('alert') + '<span><strong>' + pend + (pend === 1 ? ' serviço está' : ' serviços estão') + ' com duração a confirmar</strong> e não podem ser agendados. <a class="link-btn" href="#/hours">Definir durações</a></span></div>' : '') +
      '<div class="card toolbar">' +
        '<label class="search grow">' + icon('search') + '<input type="search" data-input="svc-q" placeholder="Buscar serviço pelo nome" aria-label="Buscar serviço" value="' + esc(f.svcQuery) + '" autocomplete="off"></label>' +
        '<select data-input="svc-status" aria-label="Filtrar por situação">' + LB.opt('all', 'Todos', f.svcStatus) + LB.opt('active', 'Ativos', f.svcStatus) + LB.opt('inactive', 'Inativos', f.svcStatus) + '</select>' +
        '<button type="button" class="btn btn-gold btn-sm" data-action="service-new">' + icon('plus') + ' Novo serviço</button>' +
      '</div><p class="result-count" id="svcCount" aria-live="polite"></p><div id="svcList"></div>';
    servicesList();
  }
  function servicesList() {
    var box = $('#svcList');
    if (!box) return;
    var q = norm(f.svcQuery), st = f.svcStatus;
    var list = LB.state.services.filter(function (s) { return (!q || norm(s.name).indexOf(q) >= 0) && (st === 'all' || (st === 'active' ? s.active : !s.active)); });
    $('#svcCount').textContent = list.length + ' de ' + LB.state.services.length + ' serviços';
    box.innerHTML = list.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Serviço</th><th class="num">Preço</th><th>Duração</th><th>Ativo</th><th>Ações</th></tr></thead><tbody>' +
      list.map(function (s) {
        return '<tr><td data-label="Serviço"><div><strong>' + esc(s.name) + '</strong><small>' + esc(s.category) + '</small></div></td>' +
          '<td data-label="Preço" class="num">' + money(s.price) + '</td>' +
          '<td data-label="Duração">' + (s.duration > 0 ? LB.fmtDuration(s.duration) : '<span class="badge st-pending">Duração a confirmar</span>') + '</td>' +
          '<td data-label="Ativo"><button type="button" class="switch" role="switch" aria-checked="' + s.active + '" aria-label="' + (s.active ? 'Desativar' : 'Ativar') + ' ' + esc(s.name) + '" data-action="service-toggle" data-id="' + esc(s.id) + '"></button></td>' +
          '<td data-label="Ações" class="actions"><button type="button" class="btn btn-ghost btn-sm" data-action="service-edit" data-id="' + esc(s.id) + '">' + icon('edit') + ' Editar</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card">' + LB.emptyState('search', 'Nenhum serviço encontrado.') + '</div>';
  }
  function serviceModal(id) {
    var svc = id ? LB.getService(id) : null;
    if (id && !svc) return LB.toast('error', 'Serviço não encontrado.');
    LB.openModal({
      title: svc ? 'Editar serviço' : 'Novo serviço',
      submitText: svc ? 'Salvar alterações' : 'Cadastrar serviço',
      html:
        '<div class="field"><label for="fName">Nome do serviço</label><input id="fName" name="name" maxlength="70" data-autofocus value="' + esc(svc ? svc.name : '') + '"></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="fPrice">Preço (R$)</label><input id="fPrice" name="price" inputmode="decimal" placeholder="0,00" value="' + (svc ? svc.price.toFixed(2).replace('.', ',') : '') + '"></div>' +
          '<div class="field"><label for="fDur">Duração (minutos)</label><input id="fDur" name="duration" type="number" min="0" max="480" step="1" placeholder="0" value="' + (svc ? svc.duration : '') + '"><small>Use 0 para “Duração a confirmar”.</small></div>' +
        '</div>' +
        '<div class="field"><label for="fCat">Categoria</label><select id="fCat" name="category">' + LB.CATEGORIES.map(function (k) { return LB.opt(k.id, k.id, svc ? svc.category : LB.CATEGORIES[0].id); }).join('') + '</select></div>' +
        '<label class="check"><input type="checkbox" name="active"' + (!svc || svc.active ? ' checked' : '') + '> Serviço ativo (visível para clientes)</label>',
      onSubmit: function (form) {
        var fd = new FormData(form);
        var name = String(fd.get('name') || '').trim().replace(/\s+/g, ' ');
        var price = LB.parsePrice(fd.get('price'));
        var durRaw = String(fd.get('duration') || '').trim();
        var duration = durRaw === '' ? 0 : Number(durRaw);
        if (name.length < 2) return 'Informe o nome do serviço (mínimo de 2 caracteres).';
        if (LB.state.services.some(function (s) { return s.id !== (svc && svc.id) && norm(s.name) === norm(name); })) return 'Já existe um serviço com esse nome.';
        if (!isFinite(price) || price <= 0 || price > 9999.99) return 'Informe um preço válido maior que zero. Ex.: 30,00.';
        if (!Number.isInteger(duration) || duration < 0 || duration > 480) return 'Informe a duração em minutos (número inteiro de 0 a 480).';
        var data = { name: name, price: price, duration: duration, category: String(fd.get('category')), active: fd.get('active') === 'on' };
        if (svc) Object.assign(svc, data); else LB.state.services.push(Object.assign({ id: LB.uid('s') }, data));
        LB.save();
        LB.toast('success', svc ? 'Serviço atualizado.' : 'Serviço cadastrado.');
        render();
        return true;
      }
    });
  }

  /* =====================================================================
     PROFISSIONAIS
     ===================================================================== */
  function barbers(c) {
    c.innerHTML = demoBanner('Profissional da barbearia. Desativar o profissional o remove da agenda do cliente; reservas existentes não são alteradas. É preciso manter ao menos um profissional ativo.') +
      '<div class="grid-2" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">' + LB.state.barbers.map(function (b) {
        return '<div class="card barber-admin ' + (b.active ? '' : 'off') + '"><span class="avatar sm">' + esc(LB.initials(b.name)) + '</span>' +
          '<div class="grow"><strong>' + esc(b.name) + '</strong><small class="muted">' + esc(b.specialty || 'Sem descrição') + '</small></div>' +
          '<button type="button" class="switch" role="switch" aria-checked="' + b.active + '" aria-label="' + (b.active ? 'Desativar' : 'Ativar') + ' ' + esc(b.name) + '" data-action="barber-toggle" data-id="' + esc(b.id) + '"></button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="barber-edit" data-id="' + esc(b.id) + '">' + icon('edit') + ' Editar</button></div>';
      }).join('') + '</div>';
  }
  function barberModal(id) {
    var b = LB.getBarber(id);
    if (!b) return LB.toast('error', 'Profissional não encontrado.');
    LB.openModal({
      title: 'Editar profissional', submitText: 'Salvar alterações',
      html:
        '<div class="field"><label for="bName">Nome</label><input id="bName" name="name" maxlength="30" data-autofocus value="' + esc(b.name) + '"></div>' +
        '<div class="field"><label for="bSpec">Descrição (ex.: Barbeiro)</label><input id="bSpec" name="specialty" maxlength="60" value="' + esc(b.specialty || '') + '"></div>',
      onSubmit: function (form) {
        var fd = new FormData(form);
        var name = String(fd.get('name') || '').trim().replace(/\s+/g, ' ');
        if (name.length < 2) return 'Informe o nome (mínimo de 2 caracteres).';
        if (LB.state.barbers.some(function (x) { return x.id !== b.id && norm(x.name) === norm(name); })) return 'Já existe um profissional com esse nome.';
        b.name = name;
        b.specialty = String(fd.get('specialty') || '').trim();
        LB.save();
        LB.toast('success', 'Profissional atualizado.');
        render();
        return true;
      }
    });
  }

  /* =====================================================================
     FUNCIONAMENTO (horário, bloqueios e durações indefinidas)
     ===================================================================== */
  function hours(c) {
    var s = LB.state.settings, today = LB.todayISO();
    var blocks = LB.state.blocks.filter(function (k) { return k.date >= today; }).sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); });
    var pending = LB.state.services.filter(function (x) { return !(Number(x.duration) > 0); });
    c.innerHTML =
      '<form id="hoursForm" class="card panel" novalidate><h3>Horário de funcionamento</h3><p class="sub">Valores demonstrativos. Reservas já existentes não são alteradas.</p>' +
        '<div class="field-row">' +
          '<div class="field"><label for="hOpen">Abertura</label><input type="time" id="hOpen" name="open" value="' + esc(s.open) + '"></div>' +
          '<div class="field"><label for="hClose">Fechamento</label><input type="time" id="hClose" name="close" value="' + esc(s.close) + '"></div>' +
          '<div class="field"><label for="hStep">Intervalo entre horários</label><select id="hStep" name="step">' + [15, 20, 30, 45, 60].map(function (m) { return LB.opt(m, m + ' minutos', s.slotStep); }).join('') + '</select></div>' +
        '</div>' +
        '<fieldset class="days"><legend class="muted" style="font-size:.82rem">Dias de atendimento</legend><div class="day-list">' +
          LB.WEEKDAYS.map(function (d, i) { return '<label class="day-pill"><input type="checkbox" name="day" value="' + i + '"' + (s.openDays.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('') + '</div></fieldset>' +
        '<p class="form-error" id="hoursError" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-gold">' + icon('check') + ' Salvar horário</button></form>' +

      '<div class="grid-2" style="align-items:start">' +
      '<form id="blockForm" class="card panel" novalidate><h3>Bloqueio de horários</h3><p class="sub">Impede novas reservas no período indicado.</p>' +
        '<div class="field"><label for="kBarber">Profissional</label><select id="kBarber" name="barber">' + LB.opt('all', 'Todos os profissionais', 'all') + LB.state.barbers.map(function (b) { return LB.opt(b.id, b.name, 'all'); }).join('') + '</select></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="kDate">Data</label><input type="date" id="kDate" name="date" min="' + today + '" value="' + today + '"></div>' +
          '<div class="field"><label for="kStart">Início</label><input type="time" id="kStart" name="start" value="12:00"></div>' +
          '<div class="field"><label for="kEnd">Fim</label><input type="time" id="kEnd" name="end" value="13:00"></div>' +
        '</div>' +
        '<div class="field"><label for="kReason">Motivo (opcional)</label><input id="kReason" name="reason" maxlength="60" placeholder="Ex.: intervalo, manutenção"></div>' +
        '<p class="form-error" id="blockError" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-gold">' + icon('lock') + ' Bloquear horário</button></form>' +
      '<section class="card panel"><h3>Bloqueios ativos</h3>' + (blocks.length ? blocks.map(function (k) {
        return '<div class="row-item"><div class="when"><b>' + k.start + '</b>' + LB.fmtDateShort(k.date).slice(0, 5) + '</div><div class="grow"><strong>' + (k.barberId === 'all' ? 'Todos os profissionais' : esc(LB.barberName(k.barberId))) + '</strong><small>' + k.start + ' – ' + k.end + (k.reason ? ' · ' + esc(k.reason) : '') + '</small></div>' +
          '<button type="button" class="btn btn-danger btn-sm" data-action="remove-block" data-id="' + esc(k.id) + '" aria-label="Remover bloqueio">' + icon('trash') + ' Remover</button></div>';
      }).join('') : LB.emptyState('lock', 'Nenhum bloqueio a partir de hoje.')) + '</section></div>' +

      '<section class="card panel"><h3>Serviços com duração indefinida</h3><p class="sub">Defina a duração para liberar o agendamento online destes serviços.</p>' +
        (pending.length ? pending.map(function (x) {
          return '<div class="row-item"><div class="grow"><strong>' + esc(x.name) + '</strong><small>' + money(x.price) + (x.active ? '' : ' · inativo') + '</small></div>' +
            '<label class="sr-only" for="dur-' + esc(x.id) + '">Duração em minutos de ' + esc(x.name) + '</label>' +
            '<input id="dur-' + esc(x.id) + '" type="number" min="5" max="480" step="1" placeholder="min" style="width:92px;padding:.55rem .7rem;border-radius:10px;background:#0f0f0f;border:1px solid var(--line-soft);color:#fff;color-scheme:dark">' +
            '<button type="button" class="btn btn-gold btn-sm" data-action="set-duration" data-id="' + esc(x.id) + '">Definir</button></div>';
        }).join('') : LB.emptyState('check-circle', 'Todos os serviços já têm duração definida.')) + '</section>';
  }
  function submitHours(form) {
    var fd = new FormData(form);
    var open = String(fd.get('open') || ''), close = String(fd.get('close') || '');
    var days = fd.getAll('day').map(Number);
    if (!open || !close) return formError('hoursError', 'Informe os horários de abertura e fechamento.');
    if (toMin(close) - toMin(open) < 30) return formError('hoursError', 'O fechamento deve ser ao menos 30 minutos após a abertura.');
    if (!days.length) return formError('hoursError', 'Selecione ao menos um dia de atendimento.');
    LB.state.settings = { open: open, close: close, slotStep: Number(fd.get('step')) || 30, openDays: days.sort(function (a, b) { return a - b; }) };
    LB.save();
    LB.toast('success', 'Horário de funcionamento atualizado.');
    render();
  }
  function submitBlock(form) {
    var fd = new FormData(form);
    var barber = String(fd.get('barber') || 'all'), date = String(fd.get('date') || ''), start = String(fd.get('start') || ''), end = String(fd.get('end') || '');
    var reason = String(fd.get('reason') || '').trim().slice(0, 60);
    if (!date) return formError('blockError', 'Informe a data do bloqueio.');
    if (date < LB.todayISO()) return formError('blockError', 'A data do bloqueio não pode estar no passado.');
    if (!start || !end) return formError('blockError', 'Informe o início e o fim do bloqueio.');
    if (toMin(end) <= toMin(start)) return formError('blockError', 'O horário final deve ser maior que o inicial.');
    var sMin = toMin(start), eMin = toMin(end);
    var clash = LB.state.appointments.filter(function (a) {
      return a.status !== 'cancelado' && a.date === date && (barber === 'all' || a.barberId === barber) && LB.overlaps(sMin, eMin, toMin(a.start), LB.apptEnd(a));
    }).length;
    LB.state.blocks.push({ id: LB.uid('k'), barberId: barber, date: date, start: start, end: end, reason: reason });
    LB.save();
    LB.toast('success', 'Horário bloqueado.');
    if (clash) LB.toast('info', 'Atenção: ' + clash + (clash === 1 ? ' agendamento existente coincide' : ' agendamentos existentes coincidem') + ' com o bloqueio e não foram alterados.', 7000);
    render();
  }
  function setDuration(id) {
    var svc = LB.getService(id), input = $('#dur-' + id);
    if (!svc || !input) return;
    var v = Number(input.value);
    if (input.value.trim() === '' || !Number.isInteger(v) || v < 5 || v > 480) return LB.toast('error', 'Informe a duração em minutos (número inteiro de 5 a 480).');
    svc.duration = v;
    LB.save();
    LB.toast('success', '“' + svc.name + '” agora dura ' + LB.fmtDuration(v) + (svc.active ? ' e já pode ser agendado.' : '. Ative o serviço para liberá-lo ao cliente.'));
    render();
  }

  /* =====================================================================
     CLIENTES
     ===================================================================== */
  function buildClients() {
    var map = {}, order = [];
    LB.state.appointments.slice().sort(LB.byDateTime).forEach(function (a) {
      var key = digits(a.phone) || norm(a.clientName);
      if (!map[key]) { map[key] = { name: a.clientName, phone: a.phone, appts: [] }; order.push(key); }
      map[key].name = a.clientName;
      map[key].appts.push(a);
    });
    return order.map(function (k) {
      var cl = map[k];
      var done = cl.appts.filter(function (a) { return a.status === 'concluido'; });
      cl.total = cl.appts.length;
      cl.done = done.length;
      cl.spent = LB.sumMoney(done.map(function (a) { return a.total; }));
      cl.last = cl.appts[cl.appts.length - 1].date;
      return cl;
    }).sort(function (a, b) { return b.last.localeCompare(a.last); });
  }
  function clients(c) {
    c.innerHTML = demoBanner('Lista <strong>demonstrativa</strong> montada a partir dos agendamentos salvos (clientes identificados pelo telefone). “Total gasto” considera apenas atendimentos concluídos.') +
      '<div class="card toolbar"><label class="search grow">' + icon('search') + '<input type="search" data-input="cli-q" placeholder="Buscar cliente por nome ou telefone" aria-label="Buscar cliente" value="' + esc(f.clientQuery) + '" autocomplete="off"></label></div>' +
      '<p class="result-count" id="cliCount" aria-live="polite"></p><div id="cliList"></div>';
    clientsList();
  }
  function clientsList() {
    var box = $('#cliList');
    if (!box) return;
    var q = norm(f.clientQuery), qd = digits(f.clientQuery);
    var list = buildClients().filter(function (cl) { return !q || norm(cl.name).indexOf(q) >= 0 || (qd && digits(cl.phone).indexOf(qd) >= 0); });
    $('#cliCount').textContent = list.length + (list.length === 1 ? ' cliente' : ' clientes');
    box.innerHTML = list.length ? list.map(function (cl) {
      return '<details class="client"><summary><span class="avatar sm">' + esc(LB.initials(cl.name)) + '</span><div class="grow"><strong>' + esc(cl.name) + '</strong><small>' + esc(cl.phone) + '</small></div>' +
        '<div class="client-stats"><span><b>' + cl.total + '</b>reservas</span><span><b>' + cl.done + '</b>concluídas</span><span><b>' + money(cl.spent) + '</b>total gasto</span></div></summary>' +
        '<div class="client-body"><div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Serviço</th><th class="num">Valor</th><th>Status</th></tr></thead><tbody>' +
        cl.appts.slice().reverse().map(function (a) {
          return '<tr><td data-label="Data"><div>' + LB.fmtDateShort(a.date) + '<small>' + a.start + '</small></div></td><td data-label="Serviço">' + LB.itemsLabel(a) + '</td><td data-label="Valor" class="num">' + money(a.total) + '</td><td data-label="Status">' + LB.badge(a.status) + '</td></tr>';
        }).join('') + '</tbody></table></div></div></details>';
    }).join('') : '<div class="card">' + LB.emptyState('user', 'Nenhum cliente encontrado.') + '</div>';
  }

  /* =====================================================================
     FINANCEIRO (demonstrativo)
     Receita estimada = SOMENTE atendimentos concluídos.
     Cancelados não são receita; pendentes/confirmados ainda não são dinheiro recebido.
     ===================================================================== */
  function finance(c) {
    var A = LB.state.appointments;
    var by = function (st) { return A.filter(function (x) { return x.status === st; }); };
    var done = by('concluido'), conf = by('confirmado'), pend = by('pendente'), canc = by('cancelado');
    var sum = function (l) { return LB.sumMoney(l.map(function (x) { return x.total; })); };
    var rev = sum(done), ticket = done.length ? rev / done.length : 0;

    var days = [];
    for (var i = 6; i >= 0; i--) {
      var iso = LB.toISO(LB.addDays(new Date(), -i));
      var v = sum(done.filter(function (x) { return x.date === iso; }));
      days.push({ label: LB.fmtWeekdayShort(iso) + '<br>' + iso.slice(8), value: v, display: v ? money(v).replace(/ /g, ' ').replace(',00', '') : '—', hl: i === 0 });
    }
    var bySvc = {};
    done.forEach(function (x) { x.items.forEach(function (it) { var r = bySvc[it.name] || (bySvc[it.name] = { n: 0, cents: 0 }); r.n++; r.cents += Math.round(it.price * 100); }); });
    var svcRows = Object.keys(bySvc).map(function (k) { return { name: k, n: bySvc[k].n, v: bySvc[k].cents / 100 }; }).sort(function (x, y) { return y.v - x.v; });
    var byBarber = LB.state.barbers.map(function (b) { var l = done.filter(function (x) { return x.barberId === b.id; }); return { b: b, n: l.length, v: sum(l) }; });

    c.innerHTML =
      demoBanner('<strong>Resumo demonstrativo.</strong> Os valores abaixo vêm dos agendamentos fictícios deste navegador e <strong>não representam movimentações financeiras reais</strong>. A receita estimada considera <strong>apenas agendamentos concluídos</strong>: cancelamentos não são receita e reservas pendentes não são dinheiro recebido.') +
      '<div class="fin-grid">' +
        statCard('wallet', 'Receita estimada (concluídos)', money(rev), done.length + (done.length === 1 ? ' atendimento concluído' : ' atendimentos concluídos'), 't-ok') +
        statCard('star', 'Ticket médio', money(ticket), 'receita ÷ concluídos') +
        statCard('check-circle', 'Confirmados a realizar', money(sum(conf)), conf.length + ' reservas · ainda não é receita') +
        statCard('clock', 'Pendentes (em análise)', money(sum(pend)), pend.length + ' reservas · não é dinheiro recebido', 't-warn') +
        statCard('ban', 'Cancelados (não contabilizado)', money(sum(canc)), canc.length + ' reservas · fora da receita', 't-err') +
        statCard('list', 'Total de reservas', A.length, 'todas as situações') +
      '</div>' +
      '<section class="card panel"><h3>Receita estimada — últimos 7 dias</h3><p class="sub">Somente atendimentos concluídos.</p>' + barChart(days) + '</section>' +
      '<div class="grid-2" style="align-items:start">' +
        '<section class="card panel"><h3>Por profissional</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Profissional</th><th class="num">Concluídos</th><th class="num">Receita</th></tr></thead><tbody>' +
          byBarber.map(function (r) { return '<tr><td data-label="Profissional">' + esc(r.b.name) + (r.b.active ? '' : ' <small>inativo</small>') + '</td><td data-label="Concluídos" class="num">' + r.n + '</td><td data-label="Receita" class="num">' + money(r.v) + '</td></tr>'; }).join('') + '</tbody></table></div></section>' +
        '<section class="card panel"><h3>Por serviço</h3>' + (svcRows.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Serviço</th><th class="num">Qtd.</th><th class="num">Receita</th></tr></thead><tbody>' +
          svcRows.map(function (r) { return '<tr><td data-label="Serviço">' + esc(r.name) + '</td><td data-label="Qtd." class="num">' + r.n + '</td><td data-label="Receita" class="num">' + money(r.v) + '</td></tr>'; }).join('') + '</tbody></table></div>' : LB.emptyState('wallet', 'Ainda não há atendimentos concluídos.')) + '</section>' +
      '</div>';
  }

  /* =====================================================================
     EVENTOS
     ===================================================================== */
  Object.assign(LB.actions, {
    'appt-confirm': function (el) { setStatus(el.getAttribute('data-id'), 'confirmado', 'Agendamento {code} confirmado.'); },
    'appt-complete': function (el) { setStatus(el.getAttribute('data-id'), 'concluido', 'Agendamento {code} concluído.'); },
    'appt-cancel': function (el) {
      var id = el.getAttribute('data-id'), a = findAppt(id);
      if (!a) return LB.toast('error', 'Agendamento não encontrado.');
      LB.confirm({
        title: 'Cancelar agendamento?',
        message: a.clientName + ' — ' + a.items.map(function (i) { return i.name; }).join(' + ') + ' em ' + LB.fmtDateShort(a.date) + ' às ' + a.start + '. Esta ação não pode ser desfeita.',
        confirmText: 'Sim, cancelar', cancelText: 'Manter', danger: true
      }, function () { setStatus(id, 'cancelado', 'Agendamento {code} cancelado.'); });
    },
    'service-new': function () { serviceModal(null); },
    'service-edit': function (el) { serviceModal(el.getAttribute('data-id')); },
    'service-toggle': function (el) {
      var s = LB.getService(el.getAttribute('data-id'));
      if (!s) return;
      s.active = !s.active;
      LB.save();
      LB.toast('success', '“' + s.name + '” ' + (s.active ? 'ativado.' : 'desativado.'));
      render();
    },
    'barber-edit': function (el) { barberModal(el.getAttribute('data-id')); },
    'barber-toggle': function (el) {
      var b = LB.getBarber(el.getAttribute('data-id'));
      if (!b) return;
      if (b.active && LB.activeBarbers().length <= 1) return LB.toast('error', 'Mantenha ao menos um profissional ativo.');
      b.active = !b.active;
      LB.save();
      LB.toast('success', b.name + (b.active ? ' ativado.' : ' desativado.'));
      render();
    },
    'remove-block': function (el) {
      LB.state.blocks = LB.state.blocks.filter(function (k) { return k.id !== el.getAttribute('data-id'); });
      LB.save();
      LB.toast('success', 'Bloqueio removido.');
      render();
    },
    'set-duration': function (el) { setDuration(el.getAttribute('data-id')); }
  });

  // Campos de busca/filtro atualizam só a lista (o campo mantém o foco).
  Object.assign(LB.inputs, {
    'ag-q': function (el) { f.agenda.q = el.value; agendaList(); },
    'ag-period': function (el) { f.agenda.period = el.value; agendaList(); },
    'ag-status': function (el) { f.agenda.status = el.value; agendaList(); },
    'ag-barber': function (el) { f.agenda.barber = el.value; agendaList(); },
    'svc-q': function (el) { f.svcQuery = el.value; servicesList(); },
    'svc-status': function (el) { f.svcStatus = el.value; servicesList(); },
    'cli-q': function (el) { f.clientQuery = el.value; clientsList(); }
  });
  LB.forms.hoursForm = function (form) { formError('hoursError', ''); submitHours(form); };
  LB.forms.blockForm = function (form) { formError('blockError', ''); submitBlock(form); };

  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  buildNav();
  render();
})();

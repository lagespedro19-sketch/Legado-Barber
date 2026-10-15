/* =====================================================================
   LEGADO BARBER — agendar.js
   Agendamento em etapas (tudo nesta página):
     1 Serviços  ->  2 Data e hora  ->  3 Seus dados  ->  4 Revisão  ->  5 Confirmação
   - Chega de outras páginas com  agendar.html?servicos=s01,s13
   - O progresso fica salvo na sessão (sessionStorage): se recarregar, continua.
   - Existe um único profissional (Layslon): ele é selecionado automaticamente.
     Se o painel ativar mais de um, aparece um seletor na etapa 2.
   ===================================================================== */
(function () {
  'use strict';
  var LB = window.LB, $ = LB.$, $$ = LB.$$, esc = LB.esc, icon = LB.icon, money = LB.money;
  var toMin = LB.toMin, fromMin = LB.fromMin, fmtDuration = LB.fmtDuration;

  var STEPS = ['Serviços', 'Data e hora', 'Seus dados', 'Revisão', 'Confirmação'];
  var catalog = { query: '', category: 'Todos' };
  var b = newBooking();

  function newBooking() {
    var t = new Date();
    return { step: 1, serviceIds: [], barberId: null, date: null, time: null, name: '', phone: '', calMonth: new Date(t.getFullYear(), t.getMonth(), 1), confirmed: null };
  }

  /* ---------- Rascunho (progresso salvo na sessão) ---------- */
  function saveDraft() {
    if (b.step >= 5) return;
    LB.draft.set({ step: b.step, serviceIds: b.serviceIds, barberId: b.barberId, date: b.date, time: b.time, name: b.name, phone: b.phone });
  }
  function findAppt(id) { return LB.state.appointments.filter(function (a) { return a.id === id; })[0]; }

  function init() {
    var d = LB.draft.get();
    ['serviceIds', 'barberId', 'date', 'time', 'name', 'phone'].forEach(function (k) { if (d[k] !== undefined && d[k] !== null) b[k] = d[k]; });
    if (!Array.isArray(b.serviceIds)) b.serviceIds = [];
    b.step = Math.min(4, Math.max(1, Number(d.step) || 1));

    // Serviços vindos da URL (página de serviços ou início)
    var params = new URLSearchParams(window.location.search);
    if (params.has('servicos')) {
      var ids = params.get('servicos').split(',').filter(function (id, i, arr) {
        return arr.indexOf(id) === i && LB.isBookable(LB.getService(id));
      });
      if (ids.length) { b.serviceIds = ids; b.time = null; b.step = 2; }
      try { window.history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) { /* ok */ }
    }

    // Reserva recém-confirmada: agendar.html#reserva-LB-XXXXX
    var m = /^#reserva-(LB-[A-Z0-9-]+)$/i.exec(window.location.hash);
    if (m) {
      var code = m[1].toUpperCase();
      var a = LB.state.appointments.filter(function (x) { return x.code === code; })[0];
      if (a) { b.confirmed = a.id; b.step = 5; }
    }
    if (b.date) { var pd = LB.parseISO(b.date); b.calMonth = new Date(pd.getFullYear(), pd.getMonth(), 1); }
    render();
  }

  // Garante que o que está salvo ainda é válido (serviço inativo, data passada, horário ocupado…).
  function ensureValid() {
    if (b.step === 5) { if (!findAppt(b.confirmed)) b = newBooking(); return; }
    b.serviceIds = b.serviceIds.filter(function (id) { return LB.isBookable(LB.getService(id)); });
    var bs = LB.activeBarbers();
    if (!b.barberId || !bs.some(function (x) { return x.id === b.barberId; })) b.barberId = bs.length ? bs[0].id : null;
    if (b.date && !LB.isDateBookable(b.date)) { b.date = null; b.time = null; }
    if (b.date && b.time && b.barberId) {
      var dur = LB.summarize(b.serviceIds).duration;
      var ok = dur && LB.getSlots(b.date, b.barberId, dur).some(function (s) { return s.time === b.time && s.available; });
      if (!ok) b.time = null;
    }
    if (b.step > 1 && !b.serviceIds.length) b.step = 1;
    if (b.step > 2 && !(b.date && b.time && b.barberId)) b.step = 2;
    if (b.step > 3 && !(LB.isValidName(b.name) && LB.isValidPhone(b.phone))) b.step = 3;
  }

  /* ---------- Estrutura ---------- */
  function render() {
    ensureValid();
    saveDraft();
    renderStepper();
    var c = $('#bookContent');
    if (b.step === 1) stepServices(c);
    else if (b.step === 2) stepDate(c);
    else if (b.step === 3) stepClient(c);
    else if (b.step === 4) stepReview(c);
    else stepDone(c);
  }
  function go(n) { b.step = n; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function renderStepper() {
    $('#stepper').innerHTML = STEPS.map(function (label, i) {
      var n = i + 1;
      var st = n < b.step ? 'done' : n === b.step ? 'current' : 'todo';
      var inner = '<span class="dot">' + (n < b.step ? icon('check') : n) + '</span><span class="lbl">' + label + '</span>';
      var clickable = n < b.step && b.step < 5;
      return '<li class="step ' + st + '"' + (n === b.step ? ' aria-current="step"' : '') + '>' +
        (clickable ? '<button type="button" data-action="goto-step" data-step="' + n + '">' + inner + '</button>' : '<div class="step-in">' + inner + '</div>') + '</li>';
    }).join('');
  }

  function miniSummary() {
    var sum = LB.summarize(b.serviceIds);
    return '<div class="mini-summary">' + icon('scissors') + '<span><b>' + sum.items.map(function (s) { return esc(s.name); }).join(' + ') + '</b> · ' +
      money(sum.total) + ' · ' + fmtDuration(sum.duration) + '</span>' +
      '<button type="button" class="link-btn" data-action="goto-step" data-step="1">Alterar serviços</button></div>';
  }
  function stepNav(backLabel, nextHtml) {
    return '<div class="step-nav">' + (backLabel ? '<button type="button" class="btn btn-ghost" data-action="step-back">' + icon('arrow-left') + ' ' + backLabel + '</button>' : '<span></span>') + (nextHtml || '') + '</div>';
  }

  /* =====================================================================
     ETAPA 1 — Serviços (busca + categorias + seleção)
     ===================================================================== */
  function stepServices(c) {
    c.innerHTML =
      '<div class="step-head"><h2>Escolha seus serviços</h2><p>Selecione um ou mais serviços. Serviços com “Duração a confirmar” ainda não podem ser agendados online.</p></div>' +
      '<div class="catalog-tools"><label class="search grow">' + icon('search') +
        '<input type="search" id="catalogSearch" data-input="catalog-search" placeholder="Buscar serviço pelo nome…" aria-label="Buscar serviço" value="' + esc(catalog.query) + '" autocomplete="off"></label></div>' +
      '<div class="chips" id="catalogChips" role="group" aria-label="Categorias"></div>' +
      '<p class="result-count" id="catalogCount" aria-live="polite"></p>' +
      '<div class="svc-grid" id="catalogList"></div>' +
      '<div class="select-bar" id="selectBar"></div>';
    renderPicker();
  }

  function renderPicker() {
    var list = $('#catalogList');
    if (!list) return;
    var q = LB.norm(catalog.query);
    var all = LB.activeServices();
    var cats = ['Todos'].concat(LB.CATEGORIES.map(function (k) { return k.id; }).filter(function (k) { return all.some(function (s) { return s.category === k; }); }));
    if (cats.indexOf(catalog.category) < 0) catalog.category = 'Todos';
    $('#catalogChips').innerHTML = cats.map(function (k) {
      return '<button type="button" class="chip ' + (k === catalog.category ? 'active' : '') + '" data-action="cat-filter" data-cat="' + esc(k) + '" aria-pressed="' + (k === catalog.category) + '">' + esc(k) + '</button>';
    }).join('');

    var shown = all.filter(function (s) { return (catalog.category === 'Todos' || s.category === catalog.category) && (!q || LB.norm(s.name).indexOf(q) >= 0); });
    $('#catalogCount').textContent = shown.length + (shown.length === 1 ? ' serviço encontrado' : ' serviços encontrados');
    list.innerHTML = shown.length ? shown.map(function (s) {
      var selected = b.serviceIds.indexOf(s.id) >= 0, ok = LB.isBookable(s);
      return '<article class="card svc ' + (selected ? 'is-selected' : '') + ' ' + (ok ? '' : 'is-disabled') + '">' +
        '<div class="svc-top"><span class="tag">' + esc(s.category) + '</span>' + (selected ? '<span class="sel-mark">' + icon('check') + '</span>' : '') + '</div>' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<div class="svc-meta"><span class="price">' + money(s.price) + '</span><span class="dur ' + (s.duration ? '' : 'dur-tbd') + '">' + icon('clock') + ' ' + fmtDuration(s.duration) + '</span></div>' +
        '<button type="button" class="btn ' + (selected ? 'btn-gold' : 'btn-ghost') + ' btn-block" data-action="toggle-service" data-id="' + esc(s.id) + '" aria-pressed="' + selected + '"' + (ok ? '' : ' disabled') + '>' +
          (ok ? (selected ? icon('check') + ' Selecionado' : 'Selecionar') : 'Indisponível para agendar') + '</button>' +
        (ok ? '' : '<p class="svc-note">Disponível após a barbearia definir a duração.</p>') + '</article>';
    }).join('') : '<div style="grid-column:1/-1">' + LB.emptyState('search', 'Nenhum serviço encontrado para essa busca. Tente outro nome ou categoria.') + '</div>';

    var sum = LB.summarize(b.serviceIds), n = sum.items.length;
    $('#selectBar').innerHTML = n
      ? '<div class="sel-info"><strong>' + n + (n === 1 ? ' serviço selecionado' : ' serviços selecionados') + '</strong><span>Total ' + money(sum.total) + ' · ' + fmtDuration(sum.duration) + '</span></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="clear-services">Limpar</button>' +
        '<button type="button" class="btn btn-gold" data-action="step-next">Escolher data e hora ' + icon('arrow-right') + '</button>'
      : '<div class="sel-info"><strong>Nenhum serviço selecionado</strong><span>Escolha ao menos um serviço para continuar.</span></div>' +
        '<button type="button" class="btn btn-gold" data-action="step-next" disabled>Escolher data e hora ' + icon('arrow-right') + '</button>';
  }

  /* =====================================================================
     ETAPA 2 — Data e horário
     ===================================================================== */
  function calendarHTML() {
    var m = b.calMonth, y = m.getFullYear(), mo = m.getMonth();
    var startDow = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
    var today = LB.todayISO(), t = new Date(), maxD = LB.addDays(t, LB.WINDOW_DAYS);
    var prevOff = y === t.getFullYear() && mo === t.getMonth();
    var nextOff = y > maxD.getFullYear() || (y === maxD.getFullYear() && mo >= maxD.getMonth());
    var cells = '';
    for (var i = 0; i < startDow; i++) cells += '<span class="cal-empty"></span>';
    for (var d = 1; d <= days; d++) {
      var iso = LB.toISO(new Date(y, mo, d)), ok = LB.isDateBookable(iso);
      cells += '<button type="button" class="cal-day ' + (iso === today ? 'today ' : '') + (iso === b.date ? 'sel' : '') + '" data-action="pick-date" data-date="' + iso + '"' + (ok ? '' : ' disabled') +
        ' aria-label="' + esc(LB.fmtDateLong(iso)) + '" aria-pressed="' + (iso === b.date) + '">' + d + '</button>';
    }
    return '<div class="card calendar"><div class="cal-head">' +
      '<button type="button" class="btn-icon" data-action="cal-prev" aria-label="Mês anterior"' + (prevOff ? ' disabled' : '') + '>' + icon('chev-left') + '</button>' +
      '<h3>' + LB.MONTHS[mo] + ' ' + y + '</h3>' +
      '<button type="button" class="btn-icon" data-action="cal-next" aria-label="Próximo mês"' + (nextOff ? ' disabled' : '') + '>' + icon('chev-right') + '</button></div>' +
      '<div class="cal-grid">' + ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(function (x) { return '<span class="cal-dow">' + x + '</span>'; }).join('') + cells + '</div>' +
      '<p class="cal-legend"><span>Dias fechados ou passados ficam desabilitados.</span><span>Reservas até ' + LB.WINDOW_DAYS + ' dias à frente.</span></p></div>';
  }

  function slotsHTML() {
    var sum = LB.summarize(b.serviceIds);
    if (!b.date) return LB.emptyState('calendar', 'Selecione uma data no calendário para ver os horários disponíveis.');
    var slots = LB.getSlots(b.date, b.barberId, sum.duration);
    if (!slots.length) return LB.emptyState('clock', 'Nenhum horário comporta a duração total (' + fmtDuration(sum.duration) + ') neste dia. Escolha outra data ou reduza os serviços.');
    var free = slots.filter(function (s) { return s.available; }).length;
    var reasonText = { appointment: 'Horário ocupado', block: 'Horário bloqueado', past: 'Horário já passou' };
    var group = function (title, arr) {
      return arr.length ? '<div class="slot-group"><h4>' + title + '</h4><div class="slot-grid">' + arr.map(function (s) {
        return '<button type="button" class="slot ' + (b.time === s.time ? 'is-selected' : '') + '" data-action="pick-time" data-time="' + s.time + '"' +
          (s.available ? '' : ' disabled title="' + reasonText[s.reason] + '"') + ' aria-pressed="' + (b.time === s.time) + '">' + s.time + '</button>';
      }).join('') + '</div></div>' : '';
    };
    var morning = slots.filter(function (s) { return toMin(s.time) < 720; });
    var afternoon = slots.filter(function (s) { return toMin(s.time) >= 720; });
    return '<p class="muted" style="font-size:.86rem">' + (free ? free + (free === 1 ? ' horário livre' : ' horários livres') + ' com ' + esc(LB.barberName(b.barberId)) + '.' : 'Todos os horários deste dia estão ocupados. Escolha outra data.') + '</p>' +
      group('Manhã', morning) + group('Tarde', afternoon) +
      (b.time ? '<div class="slot-picked">' + icon('check-circle') + ' Horário escolhido: <b>' + b.time + '</b> — término previsto às <b>' + fromMin(toMin(b.time) + sum.duration) + '</b></div>' : '');
  }

  function stepDate(c) {
    var bs = LB.activeBarbers();
    var who = bs.length > 1
      ? '<div class="field" style="max-width:320px"><label for="barberSel">Profissional</label><select id="barberSel" data-input="barber-select">' +
        bs.map(function (x) { return LB.opt(x.id, x.name, b.barberId); }).join('') + '</select></div>'
      : '<p class="who">' + icon('user') + '<span>Atendimento com <strong>' + esc(LB.barberName(b.barberId)) + '</strong></span></p>';
    c.innerHTML =
      '<div class="step-head"><h2>Escolha a data e o horário</h2><p>Os horários já consideram a duração total dos serviços escolhidos.</p></div>' +
      miniSummary() + who +
      '<div class="date-layout">' + calendarHTML() +
      '<div class="card slots-panel"><h3>' + (b.date ? esc(LB.fmtDateLong(b.date)) : 'Horários') + '</h3>' + slotsHTML() + '</div></div>' +
      stepNav('Voltar', '<button type="button" class="btn btn-gold" data-action="step-next"' + (b.date && b.time ? '' : ' disabled') + '>Continuar ' + icon('arrow-right') + '</button>');
  }

  /* =====================================================================
     ETAPA 3 — Dados do cliente
     ===================================================================== */
  function stepClient(c) {
    c.innerHTML =
      '<div class="step-head"><h2>Seus dados</h2><p>Informe nome e telefone para registrar a reserva.</p></div>' + miniSummary() +
      '<form id="clientForm" class="card form-card" novalidate>' +
        '<div class="field"><label for="cName">Nome completo</label><input id="cName" name="name" data-input="client-name" autocomplete="name" maxlength="60" placeholder="Como devemos chamar você?" value="' + esc(b.name) + '" aria-describedby="errName"><small class="field-error" id="errName" role="alert"></small></div>' +
        '<div class="field"><label for="cPhone">Telefone (WhatsApp)</label><input id="cPhone" name="phone" data-input="client-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(11) 91234-5678" value="' + esc(b.phone) + '" aria-describedby="errPhone"><small class="field-error" id="errPhone" role="alert"></small></div>' +
        '<p class="note">' + icon('info') + '<span>Protótipo demonstrativo: use dados fictícios se preferir. As informações ficam salvas apenas neste navegador e nenhuma mensagem de confirmação é enviada.</span></p>' +
        stepNav('Voltar', '<button type="submit" class="btn btn-gold">Revisar agendamento ' + icon('arrow-right') + '</button>') +
      '</form>';
  }
  function setFieldError(key, msg) {
    var err = $('#err' + key), inp = $('#c' + key);
    if (err) err.textContent = msg;
    if (inp) { inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); inp.classList.toggle('invalid', !!msg); }
  }
  function validateClientForm() {
    b.name = b.name.trim().replace(/\s+/g, ' ');
    var nameOk = LB.isValidName(b.name), phoneOk = LB.isValidPhone(b.phone);
    setFieldError('Name', nameOk ? '' : 'Informe seu nome (mínimo de 3 letras, sem números).');
    setFieldError('Phone', phoneOk ? '' : 'Informe um telefone válido com DDD. Ex.: (11) 91234-5678.');
    if (!nameOk || !phoneOk) { var f = nameOk ? $('#cPhone') : $('#cName'); if (f) f.focus(); }
    return nameOk && phoneOk;
  }

  /* =====================================================================
     ETAPAS 4 e 5 — Revisão e confirmação
     ===================================================================== */
  function reviewHTML(items, total, duration, barberId, date, start, name, phone) {
    return '<div class="card review">' +
      '<ul class="rv-services">' + items.map(function (i) { return '<li><span>' + esc(i.name) + '<small>' + fmtDuration(i.duration) + '</small></span><b>' + money(i.price) + '</b></li>'; }).join('') + '</ul>' +
      '<div class="rv-total"><span>Total</span><div><b class="price">' + money(total) + '</b><small>' + fmtDuration(duration) + '</small></div></div>' +
      '<dl class="rv-grid">' +
        '<div><dt>Profissional</dt><dd>' + esc(LB.barberName(barberId)) + '</dd></div>' +
        '<div><dt>Data</dt><dd>' + esc(LB.fmtDateLong(date)) + '</dd></div>' +
        '<div><dt>Horário</dt><dd>' + start + ' – ' + fromMin(toMin(start) + duration) + '</dd></div>' +
        '<div><dt>Cliente</dt><dd>' + esc(name) + '</dd></div>' +
        '<div><dt>Telefone</dt><dd>' + esc(phone) + '</dd></div>' +
      '</dl></div>';
  }
  function stepReview(c) {
    var sum = LB.summarize(b.serviceIds);
    c.innerHTML =
      '<div class="step-head"><h2>Revise seu agendamento</h2><p>Confira os dados antes de confirmar.</p></div>' +
      reviewHTML(sum.items, sum.total, sum.duration, b.barberId, b.date, b.time, b.name, b.phone) +
      '<p class="note" style="max-width:720px">' + icon('info') + '<span>Ao confirmar, a reserva é salva apenas neste navegador, com status “Pendente”. Notificações, pagamento e autenticação não estão implementados neste protótipo.</span></p>' +
      stepNav('Voltar', '<button type="button" class="btn btn-gold btn-lg" data-action="confirm-booking">' + icon('check') + ' Confirmar agendamento</button>');
  }
  function stepDone(c) {
    var a = findAppt(b.confirmed);
    if (!a) { b = newBooking(); render(); return; }
    c.innerHTML =
      '<div class="success-box card">' +
        '<span class="success-ic">' + icon('check') + '</span>' +
        '<h2 style="margin-top:16px;font-size:2rem">Agendamento realizado!</h2>' +
        '<p class="muted" style="margin-top:6px">Sua reserva foi registrada e aguarda confirmação da barbearia (demonstração).</p>' +
        '<div class="code-box"><div><small class="muted" style="display:block;text-align:left">Código da reserva</small><strong id="apptCode">' + esc(a.code) + '</strong></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="copy-code" data-code="' + esc(a.code) + '">' + icon('copy') + ' Copiar</button></div>' +
        '<p style="margin-top:6px">' + LB.badge(a.status) + '</p>' +
        reviewHTML(a.items, a.total, a.duration, a.barberId, a.date, a.start, a.clientName, a.phone) +
        '<div class="step-nav" style="justify-content:center;margin-top:24px"><a class="btn btn-ghost" href="' + LB.href('meus') + '">Ver meus agendamentos</a>' +
        '<button type="button" class="btn btn-gold" data-action="new-booking">Novo agendamento</button></div>' +
        '<p class="muted" style="font-size:.78rem;margin-top:16px">Dados demonstrativos salvos apenas neste navegador.</p>' +
      '</div>';
  }

  /* =====================================================================
     AÇÕES
     ===================================================================== */
  function nextStep() {
    if (b.step === 1 && !b.serviceIds.length) return LB.toast('error', 'Selecione ao menos um serviço para continuar.');
    if (b.step === 2 && !(b.date && b.time)) return LB.toast('error', 'Selecione a data e o horário para continuar.');
    if (b.step === 3 && !validateClientForm()) return;
    go(Math.min(4, b.step + 1));
  }

  function confirmBooking() {
    var r = LB.createAppointment(b);
    if (!r.ok) {
      LB.toast('error', r.msg);
      if (r.step === 'data') b.time = null;
      go(r.step === 'servicos' ? 1 : r.step === 'data' ? 2 : 3);
      return;
    }
    LB.draft.clear();
    b.confirmed = r.appt.id;
    b.step = 5;
    render();
    try { window.location.hash = 'reserva-' + r.appt.code; } catch (e) { /* ok */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    LB.toast('success', 'Agendamento realizado! Código da reserva: ' + r.appt.code);
  }

  Object.assign(LB.actions, {
    'cat-filter': function (el) { catalog.category = el.getAttribute('data-cat'); renderPicker(); },
    'toggle-service': function (el) {
      var svc = LB.getService(el.getAttribute('data-id'));
      if (!LB.isBookable(svc)) return LB.toast('error', 'Este serviço ainda não pode ser agendado (duração a confirmar).');
      var i = b.serviceIds.indexOf(svc.id);
      if (i >= 0) b.serviceIds.splice(i, 1); else b.serviceIds.push(svc.id);
      b.time = null; // a duração total mudou
      saveDraft();
      renderPicker();
    },
    'clear-services': function () { b.serviceIds = []; b.time = null; saveDraft(); renderPicker(); },
    'step-next': nextStep,
    'step-back': function () { if (b.step > 1) go(b.step - 1); },
    'goto-step': function (el) { var n = Number(el.getAttribute('data-step')); if (n >= 1 && n < b.step) go(n); },
    'cal-prev': function () { b.calMonth = new Date(b.calMonth.getFullYear(), b.calMonth.getMonth() - 1, 1); render(); },
    'cal-next': function () { b.calMonth = new Date(b.calMonth.getFullYear(), b.calMonth.getMonth() + 1, 1); render(); },
    'pick-date': function (el) { b.date = el.getAttribute('data-date'); b.time = null; render(); },
    'pick-time': function (el) { b.time = el.getAttribute('data-time'); render(); },
    'confirm-booking': confirmBooking,
    'copy-code': function (el) {
      var code = el.getAttribute('data-code');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { LB.toast('success', 'Código copiado.'); }, function () { LB.toast('info', 'Copie manualmente: ' + code); });
      else LB.toast('info', 'Copie manualmente: ' + code);
    },
    'new-booking': function () { LB.draft.clear(); window.location.href = LB.href('agendar'); }
  });

  Object.assign(LB.inputs, {
    'catalog-search': function (el) { catalog.query = el.value; renderPicker(); },
    'barber-select': function (el) { b.barberId = el.value; b.time = null; render(); },
    'client-name': function (el) { b.name = el.value; saveDraft(); if (el.value) setFieldError('Name', ''); },
    'client-phone': function (el) { var m = LB.maskPhone(el.value); el.value = m; b.phone = m; saveDraft(); if (m) setFieldError('Phone', ''); }
  });
  LB.forms.clientForm = function () { nextStep(); };

  init();
})();

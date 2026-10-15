/* =====================================================================
   LEGADO BARBER — data.js
   Dados, regras de negócio e armazenamento (localStorage).
   É compartilhado por TODAS as páginas e deve ser carregado primeiro
   (depois de icons.js). Tudo fica no objeto global "LB".

   Índice:
     1. Configurações e catálogo (21 serviços, profissional Layslon)
     2. Utilitários (moeda, datas, telefone)
     3. Armazenamento e estado
     4. Regras de agendamento (horários, conflitos, totais)
   ===================================================================== */
(function () {
  'use strict';
  var LB = (window.LB = window.LB || {});

  /* =====================================================================
     1. CONFIGURAÇÕES E CATÁLOGO
     ===================================================================== */
  LB.STORAGE_KEY = 'legadoBarber.v2.dados';        // dados do protótipo (localStorage)
  LB.DRAFT_KEY = 'legadoBarber.v2.rascunho';       // agendamento em andamento (sessionStorage)
  LB.PHONE_KEY = 'legadoBarber.v2.telefone';       // último telefone usado (atalho em "Meus agendamentos")
  LB.SCHEMA = 2;
  LB.WINDOW_DAYS = 60;                             // até quantos dias à frente se pode reservar

  LB.STATUS = {
    pendente:   { label: 'Pendente',   cls: 'st-pending' },
    confirmado: { label: 'Confirmado', cls: 'st-confirmed' },
    concluido:  { label: 'Concluído',  cls: 'st-done' },
    cancelado:  { label: 'Cancelado',  cls: 'st-canceled' }
  };

  // Categorias exibidas na página de serviços (id = valor salvo em cada serviço).
  LB.CATEGORIES = [
    { id: 'Cortes e cabelo', icon: 'scissors', desc: 'Cortes, tratamentos e acabamentos do cabelo' },
    { id: 'Barba', icon: 'user', desc: 'Barboterapia, hidratação e acabamento da barba' },
    { id: 'Combos', icon: 'star', desc: 'Corte e barba juntos' },
    { id: 'Sobrancelha e depilação', icon: 'eye', desc: 'Sobrancelha, nariz e orelha' },
    { id: 'Estética', icon: 'sparkle', desc: 'Cuidados com a pele' }
  ];
  LB.categoryInfo = function (id) {
    return LB.CATEGORIES.filter(function (c) { return c.id === id; })[0] || { id: id, icon: 'scissors', desc: '' };
  };

  LB.WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  LB.MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Os 21 serviços oficiais: [nome, preço (R$), duração (min), categoria].
  // Duração 0 = "Duração a confirmar" (só pode ser agendado depois de definida no painel).
  var SERVICE_SEED = [
    ['Corte', 30, 30, 'Cortes e cabelo'],
    ['Corte 1 Pente', 20, 10, 'Cortes e cabelo'],
    ['Corte & Pezinho da Barba', 40, 40, 'Combos'],
    ['Corte & Barboterapia', 52, 60, 'Combos'],
    ['Luzes', 60, 0, 'Cortes e cabelo'],
    ['Nevou', 100, 0, 'Cortes e cabelo'],
    ['Hidratação no Cabelo', 15, 10, 'Cortes e cabelo'],
    ['Alisamento', 20, 15, 'Cortes e cabelo'],
    ['Pigmentação', 12, 10, 'Cortes e cabelo'],
    ['Camuflagem', 12, 10, 'Cortes e cabelo'],
    ['Pezinho do Cabelo', 10, 5, 'Cortes e cabelo'],
    ['Pezinho da Barba', 15, 15, 'Barba'],
    ['Barboterapia', 25, 30, 'Barba'],
    ['Hidratação na Barba', 20, 10, 'Barba'],
    ['Depilação de Nariz na cera', 20, 10, 'Sobrancelha e depilação'],
    ['Depilação de Orelha na Cera', 20, 10, 'Sobrancelha e depilação'],
    ['Depilação de Nariz + Orelha na cera', 35, 15, 'Sobrancelha e depilação'],
    ['Sombrancelha na Navalha', 10, 5, 'Sobrancelha e depilação'],
    ['Sombrancelha na Pinça', 15, 10, 'Sobrancelha e depilação'],
    ['Remoção de Pelos (Orelha e Sombrancelha)', 9, 0, 'Sobrancelha e depilação'],
    ['Limpeza de Pele', 20, 10, 'Estética']
  ];
  LB.SERVICE_SEED = SERVICE_SEED;

  // Único profissional da barbearia.
  var BARBER_SEED = [{ id: 'b1', name: 'Layslon', specialty: 'Barbeiro', active: true }];

  // Clientes FICTÍCIOS (nenhum dado pessoal real; DDD 00 não existe).
  var DEMO_CLIENTS = [
    { name: 'Marcos Demo', phone: '(00) 90000-0001' },
    { name: 'André Exemplo', phone: '(00) 90000-0002' },
    { name: 'Bruno Teste', phone: '(00) 90000-0003' },
    { name: 'Pedro Fictício', phone: '(00) 90000-0004' },
    { name: 'Thiago Modelo', phone: '(00) 90000-0005' },
    { name: 'Felipe Amostra', phone: '(00) 90000-0006' },
    { name: 'Gustavo Simulado', phone: '(00) 90000-0007' },
    { name: 'Henrique Demo', phone: '(00) 90000-0008' }
  ];
  LB.DEMO_CLIENTS = DEMO_CLIENTS;

  // Agendamentos demonstrativos relativos a "hoje":
  // [deslocamento em dias, horário, [ids dos serviços], índice do cliente, status]
  var APPT_SEED = [
    [-6, '09:00', ['s01'], 0, 'concluido'],
    [-6, '10:00', ['s04'], 1, 'concluido'],
    [-5, '14:00', ['s03'], 2, 'concluido'],
    [-5, '15:30', ['s01', 's13'], 3, 'concluido'],
    [-4, '09:30', ['s13'], 4, 'concluido'],
    [-4, '11:00', ['s02', 's12'], 5, 'cancelado'],
    [-3, '16:00', ['s01'], 0, 'concluido'],
    [-3, '17:00', ['s04'], 6, 'concluido'],
    [-2, '10:00', ['s03'], 1, 'concluido'],
    [-2, '13:00', ['s17', 's19'], 7, 'concluido'],
    [-1, '09:00', ['s01'], 2, 'concluido'],
    [-1, '15:00', ['s21', 's01'], 4, 'concluido'],
    [0, '09:00', ['s01'], 3, 'concluido'],
    [0, '10:30', ['s13'], 5, 'concluido'],
    [0, '14:30', ['s03'], 6, 'confirmado'],
    [0, '17:00', ['s04'], 7, 'pendente'],
    [0, '18:00', ['s02'], 0, 'confirmado'],
    [1, '09:30', ['s01'], 1, 'pendente'],
    [1, '11:00', ['s04'], 2, 'confirmado'],
    [2, '15:00', ['s03'], 3, 'pendente'],
    [2, '16:00', ['s01', 's12'], 4, 'confirmado'],
    [3, '10:00', ['s13'], 5, 'pendente'],
    [4, '14:00', ['s01'], 6, 'cancelado'],
    [5, '09:00', ['s03'], 7, 'pendente']
  ];

  /* =====================================================================
     2. UTILITÁRIOS
     ===================================================================== */
  LB.$ = function (sel, root) { return (root || document).querySelector(sel); };
  LB.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Escapa texto antes de colocar em innerHTML (evita injeção de HTML).
  LB.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  // Minúsculas e sem acento (busca "hidratacao" encontra "Hidratação").
  LB.norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var pad = (LB.pad = function (n) { return String(n).padStart(2, '0'); });
  var digits = (LB.digits = function (s) { return String(s || '').replace(/\D/g, ''); });
  LB.uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  LB.initials = function (name) { return String(name || '?').trim().charAt(0).toUpperCase(); };

  // Moeda brasileira: R$ 1.234,56
  var BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  LB.money = function (n) { return BRL.format(Number(n) || 0); };
  // Soma em centavos (evita erros de ponto flutuante).
  LB.sumMoney = function (arr) {
    return arr.reduce(function (acc, v) { return acc + Math.round((Number(v) || 0) * 100); }, 0) / 100;
  };

  // Datas locais no formato "AAAA-MM-DD" (sem problemas de fuso horário).
  var toISO = (LB.toISO = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); });
  var parseISO = (LB.parseISO = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); });
  var addDays = (LB.addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); });
  var todayISO = (LB.todayISO = function () { return toISO(new Date()); });
  var toMin = (LB.toMin = function (hhmm) { var p = hhmm.split(':').map(Number); return p[0] * 60 + p[1]; });
  var fromMin = (LB.fromMin = function (m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); });
  LB.fmtHour = function (t) { var p = t.split(':'); return p[1] === '00' ? p[0] + 'h' : p[0] + 'h' + p[1]; };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  LB.fmtDateLong = function (iso) {
    return cap(parseISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
  };
  LB.fmtDateShort = function (iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  LB.fmtWeekdayShort = function (iso) { return LB.WEEKDAYS[parseISO(iso).getDay()]; };

  // Duração: 0 => "Duração a confirmar" (nunca inventamos um tempo).
  LB.fmtDuration = function (min) {
    min = Number(min) || 0;
    if (min <= 0) return 'Duração a confirmar';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    if (m === 0) return h === 1 ? '1 hora' : h + ' horas';
    return h + 'h ' + pad(m) + 'min';
  };

  // Telefone brasileiro: máscara e validação (DDD + 8 ou 9 dígitos).
  LB.maskPhone = function (value) {
    var d = digits(value).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  };
  LB.isValidPhone = function (value) {
    var d = digits(value);
    if (d.length !== 10 && d.length !== 11) return false;
    if (Number(d.slice(0, 2)) < 11) return false;
    if (d.length === 11 && d[2] !== '9') return false;
    return true;
  };
  LB.isValidName = function (name) { return /^[\p{L}][\p{L}' .-]{2,59}$/u.test(String(name || '').trim()); };

  // Preço digitado (aceita "30", "30,5", "30.50" e "1.234,56").
  LB.parsePrice = function (str) {
    var s = String(str || '').replace(/R\$|\s/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100) / 100;
  };

  /* =====================================================================
     3. ARMAZENAMENTO E ESTADO
     ===================================================================== */
  // localStorage com proteção (modo privado ou bloqueado não derruba a página).
  LB.store = {
    ok: true,
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { LB.store.ok = false; return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { LB.store.ok = false; return false; } }
  };

  // sessionStorage (com cópia em memória) — usado pelo rascunho do agendamento.
  var mem = {};
  LB.session = {
    get: function (k) { try { var v = window.sessionStorage.getItem(k); return v === null ? (mem[k] || null) : v; } catch (e) { return mem[k] || null; } },
    set: function (k, v) { mem[k] = v; try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignora */ } },
    del: function (k) { delete mem[k]; try { window.sessionStorage.removeItem(k); } catch (e) { /* ignora */ } }
  };
  LB.draft = {
    get: function () { try { var d = JSON.parse(LB.session.get(LB.DRAFT_KEY)); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; } },
    set: function (d) { LB.session.set(LB.DRAFT_KEY, JSON.stringify(d)); },
    clear: function () { LB.session.del(LB.DRAFT_KEY); }
  };

  function defaultServices() {
    return SERVICE_SEED.map(function (r, i) {
      return { id: 's' + pad(i + 1), name: r[0], price: r[1], duration: r[2], category: r[3], active: true };
    });
  }

  // Cria um estado novo com todos os dados demonstrativos.
  LB.buildDemoState = function () {
    var s = {
      version: LB.SCHEMA,
      services: defaultServices(),
      barbers: BARBER_SEED.map(function (b) { return Object.assign({}, b); }),
      settings: { open: '09:00', close: '19:00', slotStep: 30, openDays: [1, 2, 3, 4, 5, 6] },
      blocks: [],
      appointments: []
    };
    seedAppointments(s);
    // Bloqueio de exemplo (intervalo de almoço) no próximo dia útil.
    var d = addDays(new Date(), 1);
    while (s.settings.openDays.indexOf(d.getDay()) < 0) d = addDays(d, 1);
    s.blocks.push({ id: 'k001', barberId: 'all', date: toISO(d), start: '12:00', end: '13:00', reason: 'Intervalo (demonstrativo)' });
    return s;
  };

  function seedAppointments(s) {
    var today = new Date();
    var barber = s.barbers[0];
    APPT_SEED.forEach(function (row, i) {
      var off = row[0], time = row[1], sids = row[2], client = DEMO_CLIENTS[row[3]], status = row[4];
      var date = addDays(today, off);
      // Domingo (fechado): passado vai para trás, futuro vai para frente.
      for (var k = 0; k < 7 && s.settings.openDays.indexOf(date.getDay()) < 0; k++) date = addDays(date, off <= 0 ? -1 : 1);
      var items = sids.map(function (id) { return s.services.filter(function (x) { return x.id === id; })[0]; })
        .filter(Boolean)
        .map(function (x) { return { id: x.id, name: x.name, price: x.price, duration: x.duration }; });
      var duration = items.reduce(function (a, x) { return a + x.duration; }, 0);
      var start = toMin(time);
      if (!barber || !duration) return;
      if (LB.findConflict(barber.id, toISO(date), start, start + duration, null, s)) return; // pula se houver choque
      s.appointments.push({
        id: 'a' + pad(i + 1), code: 'LB-D' + String(i + 1).padStart(3, '0'),
        clientName: client.name, phone: client.phone, items: items,
        barberId: barber.id, date: toISO(date), start: time, duration: duration,
        total: LB.sumMoney(items.map(function (x) { return x.price; })), status: status, demo: true,
        createdAt: new Date().toISOString()
      });
    });
  }

  function isValidState(s) {
    return !!s && s.version === LB.SCHEMA && Array.isArray(s.services) && Array.isArray(s.barbers) &&
      Array.isArray(s.appointments) && Array.isArray(s.blocks) && !!s.settings &&
      typeof s.settings.open === 'string' && typeof s.settings.close === 'string' && Array.isArray(s.settings.openDays);
  }

  LB.recovered = false; // true se os dados salvos estavam corrompidos
  LB.save = function () {
    var ok = LB.store.set(LB.STORAGE_KEY, JSON.stringify(LB.state));
    if (!ok && !LB.saveWarned) {
      LB.saveWarned = true;
      if (LB.toast) LB.toast('error', 'Não foi possível salvar no navegador. As alterações valem apenas enquanto esta página estiver aberta.');
    }
    return ok;
  };
  // Relê o localStorage (outra aba/página pode ter alterado os dados).
  LB.reloadState = function () {
    var raw = LB.store.get(LB.STORAGE_KEY);
    if (!raw) return;
    try { var p = JSON.parse(raw); if (isValidState(p)) LB.state = p; } catch (e) { /* mantém o estado atual */ }
  };
  LB.resetState = function () { LB.state = LB.buildDemoState(); LB.save(); LB.draft.clear(); };

  // Carrega os dados salvos (chamado no FIM do arquivo, quando todas as regras já existem).
  function loadState() {
    var raw = LB.store.get(LB.STORAGE_KEY);
    if (raw) {
      try { var p = JSON.parse(raw); if (isValidState(p)) { LB.state = p; return; } } catch (e) { console.warn('Dados locais ilegíveis; restaurando a demonstração.', e); }
      LB.recovered = true;
    }
    LB.state = LB.buildDemoState();
    LB.save();
  }

  /* =====================================================================
     4. REGRAS DE AGENDAMENTO
     ===================================================================== */
  LB.getService = function (id) { return LB.state.services.filter(function (s) { return s.id === id; })[0]; };
  LB.getBarber = function (id) { return LB.state.barbers.filter(function (b) { return b.id === id; })[0]; };
  LB.barberName = function (id) { var b = LB.getBarber(id); return b ? b.name : 'Profissional removido'; };
  LB.activeServices = function () { return LB.state.services.filter(function (s) { return s.active; }); };
  LB.activeBarbers = function () { return LB.state.barbers.filter(function (b) { return b.active; }); };
  // Só se agenda serviço ativo e com duração definida (> 0).
  LB.isBookable = function (s) { return !!s && s.active && Number(s.duration) > 0; };
  var apptEnd = (LB.apptEnd = function (a) { return toMin(a.start) + a.duration; });
  LB.byDateTime = function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); };
  LB.itemsLabel = function (a) { return a.items.map(function (i) { return LB.esc(i.name); }).join(' + '); };

  // Soma de preços e durações de uma seleção de serviços.
  LB.summarize = function (serviceIds) {
    var items = serviceIds.map(LB.getService).filter(Boolean);
    return {
      items: items,
      total: LB.sumMoney(items.map(function (s) { return s.price; })),
      duration: items.reduce(function (acc, s) { return acc + (Number(s.duration) || 0); }, 0)
    };
  };

  LB.isOpenDay = function (date, st) { return (st || LB.state).settings.openDays.indexOf(date.getDay()) >= 0; };
  var overlaps = (LB.overlaps = function (aS, aE, bS, bE) { return aS < bE && bS < aE; });

  // Procura conflito (agendamento ou bloqueio) para o mesmo profissional/dia/intervalo.
  LB.findConflict = function (barberId, dateISO, startMin, endMin, ignoreId, st) {
    st = st || LB.state;
    for (var i = 0; i < st.appointments.length; i++) {
      var a = st.appointments[i];
      if (a.status === 'cancelado' || a.id === ignoreId) continue;
      if (a.barberId !== barberId || a.date !== dateISO) continue;
      if (overlaps(startMin, endMin, toMin(a.start), toMin(a.start) + a.duration)) return { type: 'appointment', item: a };
    }
    for (var j = 0; j < st.blocks.length; j++) {
      var b = st.blocks[j];
      if (b.date !== dateISO) continue;
      if (b.barberId !== 'all' && b.barberId !== barberId) continue;
      if (overlaps(startMin, endMin, toMin(b.start), toMin(b.end))) return { type: 'block', item: b };
    }
    return null;
  };

  LB.isDateBookable = function (iso) {
    var limit = toISO(addDays(new Date(), LB.WINDOW_DAYS));
    return iso >= todayISO() && iso <= limit && LB.isOpenDay(parseISO(iso));
  };

  // Gera os horários do dia. Só aparecem horários cujo término cabe no expediente.
  LB.getSlots = function (dateISO, barberId, duration) {
    var out = [];
    if (!dateISO || !barberId || !duration || !LB.isOpenDay(parseISO(dateISO))) return out;
    var open = toMin(LB.state.settings.open), close = toMin(LB.state.settings.close), step = LB.state.settings.slotStep;
    var now = new Date(), isToday = dateISO === toISO(now), nowMin = now.getHours() * 60 + now.getMinutes();
    for (var t = open; t + duration <= close; t += step) {
      var reason = null;
      if (isToday && t <= nowMin) reason = 'past';
      else { var c = LB.findConflict(barberId, dateISO, t, t + duration, null); if (c) reason = c.type; }
      out.push({ time: fromMin(t), available: !reason, reason: reason });
    }
    return out;
  };

  // Segunda a domingo da semana atual.
  LB.weekRange = function () {
    var t = new Date();
    var start = addDays(t, -((t.getDay() + 6) % 7));
    return [toISO(start), toISO(addDays(start, 6))];
  };

  // Indicadores do painel (sempre calculados a partir dos dados locais).
  LB.computeStats = function () {
    var t = todayISO(), wr = LB.weekRange(), a = LB.state.appointments;
    var live = function (x) { return x.status !== 'cancelado'; };
    var done = a.filter(function (x) { return x.status === 'concluido'; });
    return {
      today: a.filter(function (x) { return x.date === t && live(x); }).length,
      week: a.filter(function (x) { return x.date >= wr[0] && x.date <= wr[1] && live(x); }).length,
      pending: a.filter(function (x) { return x.status === 'pendente'; }).length,
      done: done.length,
      canceled: a.filter(function (x) { return x.status === 'cancelado'; }).length,
      revenue: LB.sumMoney(done.map(function (x) { return x.total; })) // somente concluídos
    };
  };

  function genCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code;
    do {
      code = 'LB-';
      for (var i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    } while (LB.state.appointments.some(function (a) { return a.code === code; }));
    return code;
  }

  // Cria o agendamento depois de REVALIDAR tudo (serviços, data, conflito, dados).
  // Retorna { ok:true, appt } ou { ok:false, msg, step } (step = 'servicos' | 'data' | 'dados').
  LB.createAppointment = function (b) {
    LB.reloadState(); // pega alterações feitas em outras abas antes de checar conflito
    var fail = function (msg, step) { return { ok: false, msg: msg, step: step }; };
    var sum = LB.summarize(b.serviceIds || []);
    if (!sum.items.length || sum.items.length !== b.serviceIds.length) return fail('Algum serviço selecionado não está mais disponível. Revise a seleção.', 'servicos');
    if (sum.items.some(function (s) { return !LB.isBookable(s); })) return fail('Há serviço inativo ou com duração a confirmar na seleção. Escolha outro serviço.', 'servicos');
    var barber = LB.getBarber(b.barberId);
    if (!barber || !barber.active) return fail('O profissional escolhido não está mais disponível.', 'data');
    if (!b.date || !b.time || !LB.isDateBookable(b.date)) return fail('A data escolhida não está mais disponível.', 'data');
    var start = toMin(b.time), end = start + sum.duration;
    if (start < toMin(LB.state.settings.open) || end > toMin(LB.state.settings.close)) return fail('Esse horário não cabe mais no expediente. Escolha outro.', 'data');
    var now = new Date();
    if (b.date === toISO(now) && start <= now.getHours() * 60 + now.getMinutes()) return fail('Esse horário já passou. Escolha outro.', 'data');
    if (LB.findConflict(b.barberId, b.date, start, end, null)) return fail('Esse horário acabou de ser ocupado. Escolha outro horário.', 'data');
    if (!LB.isValidName(b.name) || !LB.isValidPhone(b.phone)) return fail('Revise seu nome e telefone.', 'dados');

    var appt = {
      id: LB.uid('a'), code: genCode(),
      clientName: String(b.name).trim().replace(/\s+/g, ' '), phone: b.phone,
      // "foto" dos valores no momento da reserva (mudar o preço depois não altera reservas antigas)
      items: sum.items.map(function (s) { return { id: s.id, name: s.name, price: s.price, duration: s.duration }; }),
      barberId: b.barberId, date: b.date, start: b.time, duration: sum.duration, total: sum.total,
      status: 'pendente', createdAt: new Date().toISOString()
    };
    LB.state.appointments.push(appt);
    LB.save();
    LB.store.set(LB.PHONE_KEY, appt.phone);
    return { ok: true, appt: appt };
  };

  // Altera o status de um agendamento (confirmar, concluir, cancelar). Retorna o agendamento ou null.
  LB.setApptStatus = function (id, status) {
    LB.reloadState();
    var a = LB.state.appointments.filter(function (x) { return x.id === id; })[0];
    if (!a) return null;
    a.status = status;
    a.updatedAt = new Date().toISOString();
    LB.save();
    return a;
  };

  loadState();
})();

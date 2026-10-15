/* =====================================================================
   LEGADO BARBER — ui.js
   Interface compartilhada por todas as páginas:
     - ícones, avisos (toast) e janelas de confirmação (modal)
     - cabeçalho com menu e rodapé (montados automaticamente)
     - tratamento central de cliques, campos e formulários
   Carregar depois de icons.js e data.js, e antes do script da página.
   ===================================================================== */
(function () {
  'use strict';
  var LB = window.LB;
  var body = document.body;

  /* ---------- Páginas e caminhos ----------
     O <body> de cada página informa data-page e data-root
     ("" na raiz, "../" dentro da pasta pages/). */
  LB.page = body.getAttribute('data-page') || '';
  LB.root = body.getAttribute('data-root') || '';
  LB.PAGES = {
    home: 'index.html',
    servicos: 'pages/servicos.html',
    agendar: 'pages/agendar.html',
    meus: 'pages/meus-agendamentos.html',
    admin: 'pages/admin.html'
  };
  LB.href = function (key, query) { return LB.root + LB.PAGES[key] + (query || ''); };
  LB.logoSrc = LB.root + 'img/logo.png';

  /* ---------- Ícones ---------- */
  LB.icon = function (name, extra) {
    return '<svg class="ic ' + (extra || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  };
  var icon = LB.icon, esc = LB.esc, $ = LB.$, $$ = LB.$$;

  LB.badge = function (st) {
    var s = LB.STATUS[st] || { label: st, cls: '' };
    return '<span class="badge ' + s.cls + '">' + esc(s.label) + '</span>';
  };
  LB.opt = function (value, label, current) {
    return '<option value="' + esc(value) + '"' + (String(value) === String(current) ? ' selected' : '') + '>' + esc(label) + '</option>';
  };
  LB.emptyState = function (ic, text) { return '<div class="empty">' + icon(ic) + '<p>' + text + '</p></div>'; };

  /* ---------- Registros de eventos (cada página adiciona os seus) ----------
     LB.actions['nome']  -> botões/links com data-action="nome"
     LB.inputs['nome']   -> campos com data-input="nome" (evento "input")
     LB.forms['id']      -> formulários pelo id (evento "submit") */
  LB.actions = {};
  LB.inputs = {};
  LB.forms = {};

  /* ---------- Avisos (toast) ---------- */
  LB.toast = function (type, msg, ms) {
    var root = $('#toasts');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = icon(type === 'success' ? 'check-circle' : type === 'error' ? 'alert' : 'info') +
      '<span>' + esc(msg) + '</span><button type="button" data-action="toast-close" aria-label="Fechar mensagem">' + icon('x') + '</button>';
    root.appendChild(el);
    setTimeout(function () { dismissToast(el); }, ms || 4600);
  };
  function dismissToast(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
  }
  // Mensagem que sobrevive a uma troca/recarga de página.
  LB.flash = function (type, msg) { LB.session.set('legadoBarber.v2.flash', JSON.stringify({ type: type, msg: msg })); };

  /* ---------- Janela (modal) ---------- */
  var modal = { onSubmit: null, lastFocus: null };
  LB.openModal = function (opts) {
    var root = $('#modalRoot');
    var hasForm = typeof opts.onSubmit === 'function';
    root.innerHTML =
      '<div class="modal-backdrop" data-action="modal-close"></div>' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
        '<div class="modal-head"><h3 id="modalTitle">' + esc(opts.title) + '</h3>' +
        '<button type="button" class="btn-icon" data-action="modal-close" aria-label="Fechar">' + icon('x') + '</button></div>' +
        (hasForm ? '<form id="modalForm" novalidate>' : '<div>') +
          '<div class="modal-body">' + (opts.html || '') + '<p class="form-error" id="modalError" role="alert" hidden></p></div>' +
          '<div class="modal-foot">' +
            '<button type="button" class="btn btn-ghost" data-action="modal-close" data-role="cancel">' + esc(opts.cancelText || 'Cancelar') + '</button>' +
            (hasForm ? '<button type="submit" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-gold') + '">' + esc(opts.submitText || 'Salvar') + '</button>' : '') +
          '</div>' +
        (hasForm ? '</form>' : '</div>') +
      '</div>';
    root.hidden = false;
    body.classList.add('modal-open');
    modal.onSubmit = hasForm ? opts.onSubmit : null;
    modal.lastFocus = document.activeElement;
    var first = root.querySelector('[data-autofocus]') || root.querySelector('.modal-body input, .modal-body select') || root.querySelector('.modal-foot .btn:last-child');
    if (first) first.focus();
  };
  LB.closeModal = function () {
    var root = $('#modalRoot');
    if (!root || root.hidden) return;
    root.hidden = true;
    root.innerHTML = '';
    body.classList.remove('modal-open');
    modal.onSubmit = null;
    if (modal.lastFocus && typeof modal.lastFocus.focus === 'function') { try { modal.lastFocus.focus(); } catch (e) { /* ignora */ } }
  };
  LB.modalError = function (msg) {
    var el = $('#modalError');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  };
  // Caixa de confirmação (usada antes de cancelar reservas, restaurar dados etc.).
  LB.confirm = function (opts, onConfirm) {
    LB.openModal({
      title: opts.title,
      html: '<p class="modal-msg">' + esc(opts.message) + '</p>',
      submitText: opts.confirmText || 'Confirmar',
      cancelText: opts.cancelText || 'Voltar',
      danger: !!opts.danger,
      onSubmit: function () { onConfirm(); return true; }
    });
  };

  /* ---------- Ações globais ---------- */
  LB.actions['toast-close'] = function (el) { dismissToast(el.closest('.toast')); };
  LB.actions['modal-close'] = function () { LB.closeModal(); };
  LB.actions['toggle-menu'] = function (el) {
    var open = $('#mainNav').classList.toggle('open');
    el.setAttribute('aria-expanded', String(open));
  };
  LB.actions['restore-demo'] = function () {
    LB.confirm({
      title: 'Restaurar dados demonstrativos?',
      message: 'Todos os agendamentos, serviços, profissional, horários e bloqueios criados ou editados neste navegador serão substituídos pelos dados demonstrativos originais.',
      confirmText: 'Restaurar dados', cancelText: 'Cancelar', danger: true
    }, function () {
      LB.resetState();
      LB.flash('success', 'Dados demonstrativos restaurados.');
      window.location.reload();
    });
  };

  /* ---------- Cabeçalho e rodapé (iguais em todas as páginas do site) ---------- */
  function buildHeader() {
    var links = [
      ['home', 'Início'], ['servicos', 'Serviços'], ['agendar', 'Agendar'], ['meus', 'Meus agendamentos']
    ];
    return '<header class="site-header"><div class="container header-inner">' +
      '<a class="brand" href="' + LB.href('home') + '" aria-label="Legado Barber — início">' +
        '<span class="logo-wrap"><img data-logo alt="Logo da Legado Barber" width="46" height="46"></span>' +
        '<span class="brand-text"><strong>LEGADO BARBER</strong><small>Mais que um corte</small></span></a>' +
      '<nav class="nav" id="mainNav" aria-label="Menu principal">' +
        links.map(function (l) {
          var on = LB.page === l[0];
          return '<a href="' + LB.href(l[0]) + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + l[1] + '</a>';
        }).join('') +
        '<a class="admin-link" href="' + LB.href('admin') + '" title="Abrir o painel administrativo (demonstrativo)">' + icon('lock') + 'Painel Administrativo</a>' +
      '</nav>' +
      '<a class="btn btn-gold btn-sm header-cta" href="' + LB.href('agendar') + '">Agendar horário</a>' +
      '<button type="button" class="btn-icon burger" data-action="toggle-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="mainNav">' + icon('menu') + '</button>' +
    '</div></header>';
  }
  function buildFooter() {
    return '<footer class="site-footer"><div class="container footer-inner">' +
      '<div>' +
        '<div class="footer-brand"><span class="logo-wrap"><img data-logo alt="" width="46" height="46"></span> LEGADO BARBER</div>' +
        '<p style="margin-top:12px">Mais que um corte, é um legado.</p>' +
        '<p><strong>Protótipo demonstrativo.</strong> Clientes, horários e valores são fictícios. Os dados ficam salvos apenas neste navegador (localStorage) e não são sincronizados entre dispositivos.</p>' +
        '<p>A proteção contra horários duplicados vale somente para os dados locais da demonstração; uma versão real exigirá backend. Notificações, pagamentos e autenticação não estão implementados.</p>' +
        '<p id="storageWarn" class="alert alert-warn" hidden></p>' +
        '<nav class="footer-links" aria-label="Rodapé">' +
          '<a href="' + LB.href('home') + '">Início</a><a href="' + LB.href('servicos') + '">Serviços</a>' +
          '<a href="' + LB.href('agendar') + '">Agendar</a><a href="' + LB.href('meus') + '">Meus agendamentos</a>' +
          '<a href="' + LB.href('admin') + '">Painel Administrativo</a></nav>' +
      '</div>' +
      '<div class="footer-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="restore-demo">' + icon('refresh') + ' Restaurar dados demonstrativos</button></div>' +
    '</div></footer>';
  }

  function mount() {
    // Sprite de ícones
    body.insertAdjacentHTML('afterbegin',
      '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' + (LB.SYMBOLS || []).join('') + '</svg>');
    // Áreas de aviso e modal
    if (!$('#toasts')) body.insertAdjacentHTML('beforeend', '<div id="toasts" aria-live="polite" aria-atomic="false"></div>');
    if (!$('#modalRoot')) body.insertAdjacentHTML('beforeend', '<div id="modalRoot" hidden></div>');
    // Cabeçalho e rodapé (somente nas páginas do site)
    var h = $('#siteHeader'), f = $('#siteFooter');
    if (h) h.innerHTML = buildHeader();
    if (f) f.innerHTML = buildFooter();
    // Logo (com alternativa "LB" se a imagem não for encontrada)
    $$('img[data-logo]').forEach(function (img) {
      img.addEventListener('error', function () { var w = img.closest('.logo-wrap'); if (w) w.classList.add('no-logo'); });
      img.src = LB.logoSrc;
    });
    if (!LB.store.ok) {
      var w = $('#storageWarn');
      if (w) {
        w.hidden = false;
        w.innerHTML = icon('alert') + '<span>O armazenamento local do navegador está indisponível: as alterações valem apenas enquanto esta página estiver aberta.</span>';
      }
    }
    // Mensagens pendentes de outra página
    var raw = LB.session.get('legadoBarber.v2.flash');
    if (raw) {
      LB.session.del('legadoBarber.v2.flash');
      try { var m = JSON.parse(raw); LB.toast(m.type, m.msg); } catch (e) { /* ignora */ }
    }
    if (LB.recovered) LB.toast('info', 'Os dados locais estavam inválidos e foram restaurados para a demonstração.', 7000);
  }

  /* ---------- Eventos centrais ---------- */
  function handleError(err) {
    console.error(err);
    LB.toast('error', 'Ocorreu um erro inesperado. Tente novamente ou restaure os dados demonstrativos.');
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var fn = LB.actions[el.getAttribute('data-action')];
    if (!fn) return;
    try { fn(el, e); } catch (err) { handleError(err); }
  });
  document.addEventListener('input', function (e) {
    var el = e.target.closest('[data-input]');
    if (!el) return;
    var fn = LB.inputs[el.getAttribute('data-input')];
    if (fn) { try { fn(el); } catch (err) { handleError(err); } }
  });
  document.addEventListener('submit', function (e) {
    var id = e.target.id;
    if (id === 'modalForm') {
      e.preventDefault();
      if (!modal.onSubmit) return;
      try {
        var r = modal.onSubmit(e.target);
        if (r === true) LB.closeModal();
        else if (typeof r === 'string') LB.modalError(r);
      } catch (err) { handleError(err); }
      return;
    }
    var fn = LB.forms[id];
    if (!fn) return;
    e.preventDefault();
    try { fn(e.target); } catch (err) { handleError(err); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      LB.closeModal();
      var nav = $('#mainNav');
      if (nav) nav.classList.remove('open');
      return;
    }
    // Mantém o foco dentro do modal aberto.
    var root = $('#modalRoot');
    if (e.key === 'Tab' && root && !root.hidden) {
      var f = $$('button, input, select, textarea', root).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Erros não tratados: mensagem amigável (no máximo uma a cada 4 s).
  var lastErr = 0;
  function softError() { if (Date.now() - lastErr > 4000) { lastErr = Date.now(); LB.toast('error', 'Ocorreu um erro inesperado na página.'); } }
  window.addEventListener('error', softError);
  window.addEventListener('unhandledrejection', softError);

  mount();
})();

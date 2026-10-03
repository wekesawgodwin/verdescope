/* Verde-Scope portal: one shell, role-gated views.
 * Roles: stakeholder (client partners), manager (website manager), admin (super admin). */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = VS.esc;
  const src = VS.src;

  let user = VS.currentUser();
  if (!user) { location.replace('login.html'); return; }

  const ROLE_LABEL = { admin: 'Super Admin', manager: 'Website Manager', stakeholder: 'Stakeholder' };
  const CONTENT = [['posts', 'Blog Posts', 'edit'], ['gallery', 'Gallery', 'image'], ['services', 'Services', 'leaf']];
  const NAV = {
    stakeholder: [
      ['Main', [['overview', 'Overview', 'grid'], ['projects', 'My Projects', 'briefcase'], ['documents', 'Reports & Documents', 'file'], ['messages', 'Messages', 'message']]],
      ['Account', [['account', 'My Account', 'user']]],
    ],
    manager: [
      ['Main', [['overview', 'Dashboard', 'grid'], ['mail', 'Company Email', 'mail']]],
      ['Website content', CONTENT],
      ['Account', [['account', 'My Account', 'user']]],
    ],
    admin: [
      ['Main', [['overview', 'Dashboard', 'grid'], ['mail', 'Company Email', 'mail']]],
      ['Website content', CONTENT],
      ['Administration', [['users', 'Users & Roles', 'people'], ['projects', 'Stakeholder Projects', 'briefcase'], ['settings', 'Settings', 'settings'], ['activity', 'Activity Log', 'activity']]],
      ['Account', [['account', 'My Account', 'user']]],
    ],
  };
  const allowed = () => NAV[user.role].flatMap(([, items]) => items.map((i) => i[0]));
  const initials = (n) => n.replace(/^(Dr\.?|Eng\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const fmt = (d) => VS.fmtDate(d);
  const fmtTime = (d) => { const x = new Date(d); return isNaN(x) ? d : x.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  const ago = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago'; return fmt(d);
  };
  const log = (action) => VS.log(user.name, action);
  const STATUS = { new: ['New', 'info'], 'in-progress': ['In progress', 'warn'], replied: ['Replied', 'good'], closed: ['Closed', 'mute'] };
  const stPill = (s) => { const [l, c] = STATUS[s] || [s, 'mute']; return `<span class="st ${c}">${l}</span>`; };

  // ---------- UI helpers ----------
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.innerHTML = icon('check') + `<span>${esc(msg)}</span>`;
    t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function modal({ title, body, wide, saveLabel = 'Save', onSave, footer = true }) {
    const m = document.createElement('div');
    m.className = 'modal open';
    m.innerHTML = `<div class="modal-box ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" data-x aria-label="Close">${icon('close')}</button></div>
      <form class="modal-form"><div class="modal-b">${body}</div>
      ${footer ? `<div class="modal-f"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary" type="submit">${esc(saveLabel)}</button></div>` : ''}</form></div>`;
    document.body.append(m);
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    $$('[data-x]', m).forEach((b) => b.addEventListener('click', close));
    m.addEventListener('mousedown', (e) => { if (e.target === m) close(); });
    $('form', m).addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!onSave) return close();
      const ok = await onSave(Object.fromEntries(new FormData(e.target)), m);
      if (ok !== false) close();
    });
    setTimeout(() => $('input, textarea, select', m)?.focus(), 30);
    return { el: m, close };
  }

  function download(name, content, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Charts (single series, one hue; hover tooltip + table view) ----------
  function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1); }
  const roundTop = (x, y, w, h, r) => { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
  const roundRight = (x, y, w, h, r) => { r = Math.min(r, w, h / 2); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };

  function barChart(el, data, { unit = '', highlightLast = false, label = 'Value' } = {}) {
    const W = 640, H = 240, pl = 40, pr = 8, pt = 14, pb = 26;
    const max = niceMax(Math.max(...data.map((d) => d.value)));
    const cw = (W - pl - pr) / data.length, bw = Math.min(28, cw * 0.62);
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = (max / 4) * i, yy = y(v); g += `<line class="gridline" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="axis-lbl" x="${pl - 8}" y="${yy + 4}" text-anchor="end">${v >= 1000 ? (v / 1000) + 'k' : v}</text>`; }
    data.forEach((d, i) => {
      const x = pl + cw * i + (cw - bw) / 2, yy = y(d.value), h = H - pb - yy;
      g += `<rect class="hit" x="${pl + cw * i}" y="${pt}" width="${cw}" height="${H - pt - pb}" data-i="${i}"/>`;
      g += `<path class="bar" d="${roundTop(x, yy, bw, Math.max(h, 0.5), 4)}" ${highlightLast && i === data.length - 1 ? 'opacity=".45"' : ''}/>`;
      g += `<text class="axis-lbl" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
    });
    mount(el, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} bar chart">${g}</svg>`, data, label, unit, (i) => [((pl + cw * i + cw / 2) / W) * 100, (y(data[i].value) / H) * 100]);
  }

  function hbarChart(el, data, { unit = '', label = 'Value' } = {}) {
    const rowH = 34, W = 640, pl = 230, pr = 40, H = data.length * rowH + 6;
    const max = Math.max(1, ...data.map((d) => d.value));
    let g = '';
    data.forEach((d, i) => {
      const yy = 4 + i * rowH, w = Math.max(2, ((W - pl - pr) * d.value) / max);
      g += `<rect class="hit" x="0" y="${yy}" width="${W}" height="${rowH - 4}" data-i="${i}"/>`;
      g += `<path class="bar" d="${roundRight(pl, yy + 7, w, rowH - 18, 4)}"/>`;
      g += `<text class="axis-lbl" x="${pl - 12}" y="${yy + rowH / 2 + 2}" text-anchor="end">${esc(d.label.length > 34 ? d.label.slice(0, 33) + '…' : d.label)}</text>`;
      g += `<text class="val-lbl" x="${pl + w + 8}" y="${yy + rowH / 2 + 2}">${d.value}</text>`;
    });
    mount(el, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} bar chart">${g}</svg>`, data, label, unit, (i) => [((pl + ((W - pl - pr) * data[i].value) / max) / W) * 100, ((4 + i * rowH + 7) / H) * 100]);
  }

  function mount(el, svg, data, label, unit, pos) {
    el.innerHTML = `<div class="chart">${svg}<div class="tip"></div></div>
      <div style="margin-top:8px;text-align:right"><button class="table-toggle">View as table</button></div>
      <div class="tbl-wrap" hidden><table class="tbl"><thead><tr><th>Category</th><th style="text-align:right">${esc(label)}</th></tr></thead>
      <tbody>${data.map((d) => `<tr><td>${esc(d.full || d.label)}</td><td style="text-align:right">${d.value.toLocaleString()}${unit}</td></tr>`).join('')}</tbody></table></div>`;
    const tip = $('.tip', el), bars = $$('.bar', el);
    $$('.hit', el).forEach((h) => {
      h.addEventListener('mouseenter', () => {
        const i = Number(h.dataset.i), [lx, ty] = pos(i);
        bars.forEach((b, j) => b.classList.toggle('hover', j === i));
        tip.innerHTML = `<b>${data[i].value.toLocaleString()}${unit}</b><span>${esc(data[i].full || data[i].label)}</span>`;
        tip.style.left = lx + '%'; tip.style.top = ty + '%'; tip.style.opacity = 1;
      });
      h.addEventListener('mouseleave', () => { tip.style.opacity = 0; bars.forEach((b) => b.classList.remove('hover')); });
    });
    $('.table-toggle', el).addEventListener('click', (e) => {
      const t = $('.tbl-wrap', el), c = $('.chart', el);
      const show = t.hidden; t.hidden = !show; c.hidden = show;
      e.target.textContent = show ? 'View as chart' : 'View as table';
    });
  }

  // ---------- Media library (all images already used on the site) ----------
  function library() {
    const d = VS.db, set = new Set();
    d.services.forEach((s) => set.add(s.image));
    d.posts.forEach((p) => set.add(p.image));
    d.events.forEach((e) => e.media.forEach((m) => m.type === 'image' && set.add(m.src)));
    return [...set].filter((s) => s && !s.startsWith('data:'));
  }
  const imagePicker = (name, value) => `
    <div class="field"><label>Cover image</label>
      <div style="display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:start">
        <img class="pick-pv" src="${value ? src(value) : ''}" alt="" style="width:120px;aspect-ratio:4/3;object-fit:cover;background:var(--bg-2);border:1px solid var(--line)">
        <div>
          <select class="pick-sel inp" style="margin-bottom:8px"><option value="">Choose from library…</option>${library().map((s) => `<option value="${esc(s)}" ${s === value ? 'selected' : ''}>${esc(s.split('/').pop())}</option>`).join('')}</select>
          <label class="btn sm" style="cursor:pointer">${icon('plus')} Upload image<input type="file" accept="image/*" class="pick-file" hidden></label>
          <input type="hidden" name="${name}" value="${esc(value || '')}">
        </div>
      </div></div>`;
  function bindPicker(root, name) {
    const hidden = $(`input[name="${name}"]`, root), pv = $('.pick-pv', root);
    $('.pick-sel', root).addEventListener('change', (e) => { if (e.target.value) { hidden.value = e.target.value; pv.src = src(e.target.value); } });
    $('.pick-file', root).addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const url = await VS.fileToDataURL(f); hidden.value = url; pv.src = url;
    });
  }

  // ---------- Shell ----------
  function shell() {
    document.body.innerHTML = `
      <div class="app">
        <aside class="side" id="side">
          <a class="side-brand" href="../index.html" title="View website"><img src="../assets/img/brand/logo-emblem-light.png" alt=""><div><b>VERDE-<span>SCOPE</span></b><small>AFRICA LIMITED</small></div></a>
          <div class="role-badge">${ROLE_LABEL[user.role]} Portal</div>
          <nav id="sideNav"></nav>
          <div class="side-foot"><a href="../index.html" target="_blank">${icon('globe')} View public website</a></div>
        </aside>
        <div class="main">
          <header class="top">
            <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu">${icon('menu')}</button>
            <h1 id="viewTitle"></h1>
            <a class="icon-btn bell" id="bell" href="#/${user.role === 'stakeholder' ? 'messages' : 'mail'}" aria-label="Notifications">${icon('bell')}</a>
            <div class="user-chip"><span class="avatar">${esc(initials(user.name))}</span><div><b>${esc(user.name)}</b><small>${ROLE_LABEL[user.role]}</small></div>
              <button class="icon-btn" id="logout" title="Sign out" aria-label="Sign out">${icon('logout')}</button></div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>`;
    $('#logout').onclick = () => { log('Signed out'); VS.logout(); location.href = 'login.html'; };
    $('#menuBtn').onclick = (e) => { e.stopPropagation(); $('#side').classList.toggle('open'); };
    document.addEventListener('click', (e) => { if (!e.target.closest('#side')) $('#side')?.classList.remove('open'); });
  }

  function drawNav(route) {
    const unread = VS.db.inquiries.filter((m) => !m.read && m.folder === 'inbox').length;
    $('#sideNav').innerHTML = NAV[user.role].map(([group, items]) => `<div class="group">${group}</div>` +
      items.map(([k, label, ic]) => `<a href="#/${k}" class="${k === route ? 'active' : ''}">${icon(ic)}<span>${label}</span>${k === 'mail' && unread ? `<span class="count">${unread}</span>` : ''}</a>`).join('')).join('');
    const bell = $('#bell');
    const n = user.role === 'stakeholder' ? 0 : unread;
    bell.innerHTML = icon('bell') + (n ? `<span class="dot">${n}</span>` : '');
  }

  function route() {
    user = VS.currentUser();
    if (!user) { location.replace('login.html'); return; }
    let r = location.hash.replace(/^#\/?/, '') || 'overview';
    if (!allowed().includes(r)) r = 'overview';
    drawNav(r);
    const item = NAV[user.role].flatMap(([, i]) => i).find((i) => i[0] === r);
    $('#viewTitle').textContent = item ? item[1] : '';
    document.title = (item ? item[1] : 'Portal') + ' — Verde-Scope Portal';
    $('#side').classList.remove('open');
    const c = $('#content');
    c.removeAttribute('style');
    c.innerHTML = '';
    views[r](c);
    window.scrollTo(0, 0);
  }

  // =====================================================================
  // Views
  // =====================================================================
  const views = {};

  // ---------- Overview ----------
  views.overview = (c) => (user.role === 'stakeholder' ? stakeholderOverview(c) : staffOverview(c));

  function staffOverview(c) {
    const d = VS.db;
    const m = d.analytics.monthly;
    const lastFull = m[m.length - 2], prev = m[m.length - 3];
    const change = Math.round(((lastFull.v - prev.v) / prev.v) * 100);
    const unread = d.inquiries.filter((x) => !x.read && x.folder === 'inbox').length;
    const open = d.inquiries.filter((x) => x.folder === 'inbox' && (x.status === 'new' || x.status === 'in-progress')).length;
    const pub = d.posts.filter((p) => p.status === 'published').length, drafts = d.posts.length - pub;
    const mediaN = d.events.reduce((a, e) => a + e.media.length, 0);
    const isAdmin = user.role === 'admin';
    const tiles = [
      ['Website visits', 'eye', lastFull.v.toLocaleString(), `${lastFull.m} · <b>${change >= 0 ? '+' : ''}${change}%</b> vs ${prev.m}`],
      ['Inquiries', 'inbox', open, `${unread} unread · ${d.inquiries.length} total`],
      isAdmin ? ['Portal users', 'people', d.users.filter((u) => u.active).length, `${d.users.filter((u) => u.role === 'stakeholder').length} stakeholder accounts`] : ['Blog posts', 'edit', pub, `${drafts} draft${drafts === 1 ? '' : 's'}`],
      isAdmin ? ['Active projects', 'briefcase', d.projects.length, `${Math.round(d.projects.reduce((a, p) => a + p.progress, 0) / d.projects.length)}% average progress`] : ['Gallery media', 'image', mediaN, `${d.events.length} events`],
    ];
    c.innerHTML = `
      <div class="welcome"><div><h2>Welcome back, ${esc(user.name)}</h2><p>${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${unread ? `You have ${unread} unread inquir${unread === 1 ? 'y' : 'ies'}.` : 'Inbox is clear.'}</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn primary" href="#/mail">${icon('mail')} Open email</a><a class="btn" href="#/posts" data-new-post>${icon('plus')} New post</a></div></div>
      <div class="grid g4 mb">${tiles.map(([l, ic, v, s]) => `<div class="tile"><div class="lbl">${icon(ic)}${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join('')}</div>
      <div class="grid g-main mb">
        <div class="card"><div class="card-h"><h3>Website visits</h3><small>Monthly, last 12 months · current month to date shown faded</small></div><div class="card-b" id="visitsChart"></div></div>
        <div class="card"><div class="card-h"><h3>Latest inquiries</h3><a class="btn sm" href="#/mail">Inbox</a></div><div id="latestInq"></div></div>
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>Inquiries by service</h3><small>All time</small></div><div class="card-b" id="svcChart"></div></div>
        <div class="card"><div class="card-h"><h3>${isAdmin ? 'Recent activity' : 'Content at a glance'}</h3>${isAdmin ? '<a class="btn sm" href="#/activity">All activity</a>' : ''}</div><div id="side2"></div></div>
      </div>`;
    $('[data-new-post]', c).addEventListener('click', () => setTimeout(() => editPost(null), 50));
    barChart($('#visitsChart'), m.map((x) => ({ label: x.m, value: x.v })), { highlightLast: true, label: 'Visits' });
    $('#latestInq').innerHTML = d.inquiries.filter((x) => x.folder === 'inbox').slice(0, 5).map((q) => `
      <a class="list-item" href="#/mail" data-open="${q.id}"><span class="avatar" style="width:34px;height:34px;font-size:12px">${esc(initials(q.name))}</span>
        <div class="grow"><div class="t" style="${q.read ? '' : 'font-weight:700'}">${esc(q.name)}</div><div class="s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(q.subject)}</div></div>
        <div style="text-align:right"><time>${ago(q.date)}</time><div style="margin-top:4px">${stPill(q.status)}</div></div></a>`).join('') || '<div class="empty">No inquiries yet.</div>';
    $$('[data-open]', c).forEach((a) => a.addEventListener('click', () => { mailState.sel = a.dataset.open; mailState.folder = 'inbox'; VS.update((d) => { d.inquiries.find((x) => x.id === a.dataset.open).read = true; }); }));
    const by = {};
    d.inquiries.forEach((q) => { const k = q.service || 'General'; by[k] = (by[k] || 0) + 1; });
    const svcData = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, full: k, value: v }));
    hbarChart($('#svcChart'), svcData, { label: 'Inquiries' });
    if (isAdmin) {
      $('#side2').innerHTML = d.activity.slice(0, 7).map((a) => `<div class="list-item"><span class="ic">${icon('activity')}</span><div class="grow"><div class="t">${esc(a.action)}</div><div class="s">${esc(a.user)}</div></div><time>${ago(a.date)}</time></div>`).join('');
    } else {
      $('#side2').innerHTML = [
        ['edit', 'Blog posts', `${pub} published, ${drafts} draft`, '#/posts'],
        ['image', 'Gallery', `${d.events.length} events · ${mediaN} photos & videos`, '#/gallery'],
        ['leaf', 'Services', `${d.services.length} service areas`, '#/services'],
        ['globe', 'Public website', 'Open the live site in a new tab', '../index.html'],
      ].map(([ic, t, s, h]) => `<a class="list-item" href="${h}" ${h.startsWith('..') ? 'target="_blank"' : ''}><span class="ic">${icon(ic)}</span><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div>${icon('arrowR')}</a>`).join('');
      $$('#side2 .list-item > svg').forEach((s) => { s.style.width = '16px'; s.style.color = 'var(--muted)'; });
    }
  }

  function stakeholderOverview(c) {
    const d = VS.db;
    const projects = d.projects.filter((p) => p.org === user.org);
    const docs = d.documents.filter((x) => x.org === user.org);
    const msgs = d.inquiries.filter((q) => q.email === user.email);
    const avg = projects.length ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length) : 0;
    c.innerHTML = `
      <div class="welcome"><div><h2>${esc(user.org)}</h2><p>Track your projects with Verde-Scope Africa, download reports and message our team.</p></div>
        <a class="btn primary" href="#/messages">${icon('message')} Message the team</a></div>
      <div class="grid g4 mb">
        <div class="tile"><div class="lbl">${icon('briefcase')}Active projects</div><div class="val">${projects.length}</div><div class="sub">with Verde-Scope</div></div>
        <div class="tile"><div class="lbl">${icon('chart')}Average progress</div><div class="val">${avg}%</div><div class="prog" style="margin-top:8px"><i style="width:${avg}%"></i></div></div>
        <div class="tile"><div class="lbl">${icon('file')}Documents</div><div class="val">${docs.length}</div><div class="sub">${docs[0] ? 'Latest: ' + fmt(docs.slice().sort((a, b) => b.date.localeCompare(a.date))[0].date) : 'None yet'}</div></div>
        <div class="tile"><div class="lbl">${icon('message')}Messages</div><div class="val">${msgs.length}</div><div class="sub">${msgs.filter((m) => m.thread.length).length} answered</div></div>
      </div>
      <div class="grid g-main">
        <div class="card"><div class="card-h"><h3>Project progress</h3><a class="btn sm" href="#/projects">Details</a></div>${projects.map(projectBlock).join('') || '<div class="empty">No projects assigned yet.</div>'}</div>
        <div>
          <div class="card mb"><div class="card-h"><h3>Announcements</h3></div>${d.announcements.map((a) => `<div class="list-item"><span class="ic">${icon('bell')}</span><div class="grow"><div class="t">${esc(a.title)}</div><div class="s">${esc(a.body)}</div></div><time>${fmt(a.date)}</time></div>`).join('')}</div>
          <div class="card"><div class="card-h"><h3>Recent documents</h3><a class="btn sm" href="#/documents">All</a></div>${docs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((x) => `<div class="list-item"><span class="ic">${icon('file')}</span><div class="grow"><div class="t">${esc(x.name)}</div><div class="s">${x.size} · ${fmt(x.date)}</div></div></div>`).join('') || '<div class="empty">No documents yet.</div>'}</div>
        </div>
      </div>`;
  }

  const projStatus = (s) => ({ 'In progress': 'info', 'Report review': 'warn', Planning: 'mute', Completed: 'good' }[s] || 'mute');
  const projectBlock = (p) => `
    <div class="proj">
      <div class="proj-h"><h4>${esc(p.title)}</h4><span class="st ${projStatus(p.status)}">${esc(p.status)}</span></div>
      <div style="display:flex;align-items:center;gap:12px"><div class="prog" style="flex:1"><i style="width:${p.progress}%"></i></div><b style="font-family:var(--head);font-weight:400">${p.progress}%</b></div>
      <div class="miles">${p.milestones.map((m) => `<span class="mile ${m.done ? 'done' : ''}">${icon(m.done ? 'check' : 'clock')}${esc(m.t)}</span>`).join('')}</div>
      <div class="proj-meta"><span>Start: ${fmt(p.start)}</span><span>Due: ${fmt(p.due)}</span><span>Lead: ${esc(p.lead)}</span></div>
    </div>`;

  // ---------- Stakeholder views ----------
  views.projects = (c) => {
    if (user.role === 'admin') return adminProjects(c);
    const projects = VS.db.projects.filter((p) => p.org === user.org);
    c.innerHTML = `<div class="card">${projects.map(projectBlock).join('') || '<div class="empty">No projects assigned yet.</div>'}</div>`;
  };

  views.documents = (c) => {
    const d = VS.db;
    const docs = d.documents.filter((x) => x.org === user.org).sort((a, b) => b.date.localeCompare(a.date));
    const pname = (id) => (d.projects.find((p) => p.id === id) || {}).title || '—';
    c.innerHTML = `<div class="card"><div class="card-h"><h3>Reports &amp; documents</h3><small>${docs.length} files shared with ${esc(user.org)}</small></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Document</th><th>Project</th><th>Size</th><th>Shared</th><th></th></tr></thead><tbody>
      ${docs.map((x) => `<tr><td><span style="display:flex;gap:10px;align-items:center">${icon('file')}<span class="t-title">${esc(x.name)}</span></span></td><td class="t-sub">${esc(pname(x.project))}</td><td class="t-sub">${x.size}</td><td class="t-sub">${fmt(x.date)}</td>
        <td class="actions"><button class="btn sm" data-dl="${x.id}">${icon('download')} Download</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No documents yet.</td></tr>'}
      </tbody></table></div></div>`;
    $$('td svg', c).forEach((s) => { if (!s.closest('button')) { s.style.width = '18px'; s.style.color = 'var(--accent)'; } });
    $$('[data-dl]', c).forEach((b) => b.addEventListener('click', () => {
      const x = docs.find((y) => y.id === b.dataset.dl);
      download(x.name.replace(/\.\w+$/, '') + ' (demo).txt', `${x.name}\n\nShared with: ${x.org}\nProject: ${pname(x.project)}\nDate: ${x.date}\n\nThis is a placeholder file generated by the Verde-Scope MVP portal. In production, the original document would be served from secure storage.`);
      log(`Downloaded ${x.name}`);
    }));
  };

  views.messages = (c) => {
    const msgs = () => VS.db.inquiries.filter((q) => q.email === user.email);
    c.innerHTML = `<div class="grid g-main">
      <div class="card"><div class="card-h"><h3>Conversation history</h3></div><div id="hist"></div></div>
      <div class="card" style="align-self:start"><div class="card-h"><h3>New message</h3></div><form class="card-b" id="msgForm">
        <div class="field"><label>Related project</label><select name="project">${VS.db.projects.filter((p) => p.org === user.org).map((p) => `<option>${esc(p.title)}</option>`).join('')}<option>General</option></select></div>
        <div class="field"><label>Subject</label><input name="subject" required></div>
        <div class="field"><label>Message</label><textarea name="message" required></textarea></div>
        <button class="btn primary block">${icon('send')} Send to Verde-Scope</button></form></div></div>`;
    const draw = () => {
      $('#hist').innerHTML = msgs().map((q) => `
        <div style="border-bottom:1px solid var(--line)">
          <div class="msg"><div class="msg-h"><b style="color:var(--text)">${esc(q.subject)}</b> · ${fmtTime(q.date)} · ${stPill(q.status)}</div>${esc(q.message)}</div>
          ${q.thread.map((t) => `<div class="msg out"><div class="msg-h">Reply from <b style="color:var(--text)">Verde-Scope Africa</b> · ${fmtTime(t.date)}</div>${esc(t.body)}</div>`).join('')}
        </div>`).join('') || '<div class="empty">No messages yet. Use the form to contact the team.</div>';
    };
    draw();
    $('#msgForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      VS.submitInquiry({ source: 'stakeholder', name: user.org, email: user.email, org: user.org, service: 'Project update', subject: `[${f.project}] ${f.subject}`, message: f.message });
      e.target.reset(); draw(); toast('Message sent to the Verde-Scope team');
    });
  };

  // ---------- Company email ----------
  const mailState = { folder: 'inbox', sel: null, q: '' };
  const TEMPLATES = {
    Acknowledge: (q) => `Dear ${q.name.split(' ')[0]},\n\nThank you for contacting Verde-Scope Africa Limited regarding "${q.subject}". We have received your inquiry and a member of our technical team will get back to you within one business day.`,
    'Request details': (q) => `Dear ${q.name.split(' ')[0]},\n\nThank you for your inquiry. To prepare an accurate proposal, kindly share:\n- Project location and size\n- Expected timelines\n- Any existing studies, drawings or licences\n\nWe look forward to working with you.`,
    'Book a meeting': (q) => `Dear ${q.name.split(' ')[0]},\n\nThank you for reaching out. We would be glad to discuss your requirements in detail. Are you available for a short call or a meeting at our offices at One Africa Place, Westlands this week?`,
  };

  views.mail = (c) => {
    const S = VS.db.settings;
    c.style.paddingBottom = '0';
    c.innerHTML = `
      <div class="mail" id="mail">
        <div class="mail-folders">
          <button class="btn primary" id="compose">${icon('edit')} Compose</button>
          <div id="folders"></div>
          <div class="mail-from"><b>Sending as</b>${esc(S.mailFrom)}</div>
        </div>
        <div class="mail-list"><div class="mail-search">
          <select class="inp mail-folder-select" id="folderSel" style="display:none;margin-bottom:8px"><option value="inbox">Inbox</option><option value="unread">Unread</option><option value="sent">Sent</option><option value="archived">Archived</option></select>
          <div style="display:flex;gap:8px"><input class="inp" id="mq" placeholder="Search mail…" value="${esc(mailState.q)}"><button class="btn sm mail-folder-select" id="compose2" style="display:none" aria-label="Compose">${icon('edit')}</button></div></div>
          <div id="items"></div></div>
        <div class="mail-read" id="reader"></div>
      </div>
      <div class="demo-note" style="margin-top:12px">${icon('globe')}<span>MVP mode: messages are stored in this browser and replies are logged in the portal. Use “Open in email app” to send from your mail client. Connecting Google Workspace or SMTP for ${esc(S.mailFrom)} enables live delivery.</span></div>`;
    $('#compose').onclick = $('#compose2').onclick = () => compose();
    $('#folderSel').onchange = (e) => { mailState.folder = e.target.value; mailState.sel = null; drawMail(); };
    $('#mq').addEventListener('input', (e) => { mailState.q = e.target.value.toLowerCase(); drawList(); });
    drawMail();
  };

  function mailItems() {
    const d = VS.db, f = mailState.folder, q = mailState.q;
    let list;
    if (f === 'sent') list = (d.sent || []).map((s) => ({ ...s, _sent: true }));
    else if (f === 'archived') list = d.inquiries.filter((m) => m.folder === 'archived');
    else if (f === 'unread') list = d.inquiries.filter((m) => m.folder === 'inbox' && !m.read);
    else list = d.inquiries.filter((m) => m.folder === 'inbox');
    if (q) list = list.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  function drawMail() {
    const d = VS.db;
    const counts = { inbox: d.inquiries.filter((m) => m.folder === 'inbox').length, unread: d.inquiries.filter((m) => m.folder === 'inbox' && !m.read).length, sent: (d.sent || []).length, archived: d.inquiries.filter((m) => m.folder === 'archived').length };
    $('#folders').innerHTML = [['inbox', 'Inbox', 'inbox'], ['unread', 'Unread', 'mail'], ['sent', 'Sent', 'send'], ['archived', 'Archived', 'archive']]
      .map(([k, l, ic]) => `<a data-f="${k}" class="${mailState.folder === k ? 'active' : ''}">${icon(ic)}${l}<span class="count">${counts[k] || ''}</span></a>`).join('');
    $$('#folders a').forEach((a) => a.addEventListener('click', () => { mailState.folder = a.dataset.f; mailState.sel = null; drawMail(); }));
    $('#folderSel').value = mailState.folder;
    drawList(); drawReader(); drawNav('mail');
  }

  function drawList() {
    const items = mailItems();
    $('#items').innerHTML = items.map((m) => m._sent
      ? `<div class="mail-item ${mailState.sel === m.id ? 'active' : ''}" data-id="${m.id}"><div class="r1"><b>To: ${esc(m.toName || m.to)}</b><time>${ago(m.date)}</time></div><div class="subj">${esc(m.subject)}</div><div class="prev">${esc(m.body.slice(0, 90))}</div></div>`
      : `<div class="mail-item ${m.read ? '' : 'unread'} ${mailState.sel === m.id ? 'active' : ''}" data-id="${m.id}"><div class="r1"><b>${esc(m.name)}</b><time>${ago(m.date)}</time></div><div class="subj">${esc(m.subject)}</div><div class="prev">${esc(m.message.slice(0, 90))}</div>
          <div class="tags">${stPill(m.status)}${m.source === 'stakeholder' ? '<span class="st info" style="color:var(--water)">Stakeholder</span>' : ''}</div></div>`).join('') || '<div class="empty">No messages here.</div>';
    $$('.mail-item').forEach((el) => el.addEventListener('click', () => {
      mailState.sel = el.dataset.id;
      VS.update((d) => { const m = d.inquiries.find((x) => x.id === mailState.sel); if (m) m.read = true; });
      drawMail();
    }));
  }

  function drawReader() {
    const r = $('#reader'), d = VS.db, S = d.settings;
    $('#mail').classList.toggle('reading', !!mailState.sel);
    const back = `<button class="btn sm mail-back" id="mailBack">${icon('arrowL')} Back</button>`;
    if (mailState.folder === 'sent') {
      const s = (d.sent || []).find((x) => x.id === mailState.sel);
      if (!s) { r.innerHTML = `<div class="empty">${icon('mail')}<br>Select a message to read.</div>`; return; }
      r.innerHTML = `<div class="read-h">${back}<h2>${esc(s.subject)}</h2><div class="read-meta"><span class="avatar">${esc(initials(s.toName || s.to))}</span><div class="who"><b>To: ${esc(s.toName || '')} &lt;${esc(s.to)}&gt;</b><small>From ${esc(S.mailFrom)} · ${fmtTime(s.date)}</small></div></div></div><div class="msg out">${esc(s.body)}</div>`;
      $('#mailBack').onclick = () => { mailState.sel = null; drawMail(); };
      return;
    }
    const m = d.inquiries.find((x) => x.id === mailState.sel);
    if (!m) { r.innerHTML = `<div class="empty" style="margin:auto">Select a message to read.</div>`; $$('.empty svg', r).forEach((s) => (s.style.width = '28px')); return; }
    r.innerHTML = `
      <div class="read-h">${back}<h2>${esc(m.subject)}</h2>
        <div class="read-meta"><span class="avatar">${esc(initials(m.name))}</span><div class="who"><b>${esc(m.name)}</b><small>&lt;${esc(m.email)}&gt; · ${fmtTime(m.date)}</small></div>
          <div class="read-tools">
            <select id="stSel" aria-label="Status">${Object.entries(STATUS).map(([k, [l]]) => `<option value="${k}" ${m.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <button class="icon-btn" id="arch" title="${m.folder === 'archived' ? 'Move to inbox' : 'Archive'}">${icon(m.folder === 'archived' ? 'inbox' : 'archive')}</button>
            <button class="icon-btn danger" id="del" title="Delete">${icon('trash')}</button>
          </div></div></div>
      <div class="read-info">${m.org ? `<span>Organisation: <b>${esc(m.org)}</b></span>` : ''}${m.phone ? `<span>Phone: <b>${esc(m.phone)}</b></span>` : ''}<span>Service: <b>${esc(m.service)}</b></span><span>Source: <b>${m.source === 'stakeholder' ? 'Stakeholder portal' : 'Website contact form'}</b></span></div>
      <div class="msg">${esc(m.message)}</div>
      ${m.thread.map((t) => `<div class="msg out"><div class="msg-h">${icon('reply')} <b style="color:var(--text)">${esc(t.from)}</b> · ${fmtTime(t.date)}${t.by ? ' · sent by ' + esc(t.by) : ''}</div>${esc(t.body)}</div>`).join('')}
      <form class="reply" id="replyForm">
        <div class="templates"><span style="font-size:12px;color:var(--faint);align-self:center">Templates:</span>${Object.keys(TEMPLATES).map((k) => `<button type="button" data-t="${k}">${k}</button>`).join('')}</div>
        <div class="field" style="margin-bottom:10px"><textarea name="body" id="replyBody" required placeholder="Write a reply to ${esc(m.name)}…"></textarea></div>
        <div class="reply-bar"><span style="font-size:12.5px;color:var(--muted)">From: ${esc(S.mailFrom)}</span><span class="sp"></span>
          <a class="btn" id="mailto" target="_blank">${icon('mail')} Open in email app</a>
          <button class="btn primary">${icon('send')} Send reply</button></div>
      </form>`;
    $$('.msg-h svg', r).forEach((s) => { s.style.width = '13px'; s.style.verticalAlign = '-2px'; });
    $('#mailBack').onclick = () => { mailState.sel = null; drawMail(); };
    $('#stSel').onchange = (e) => { VS.update((d) => { d.inquiries.find((x) => x.id === m.id).status = e.target.value; }); log(`Marked “${m.subject}” as ${STATUS[e.target.value][0]}`); drawList(); toast('Status updated'); };
    $('#arch').onclick = () => { VS.update((d) => { const x = d.inquiries.find((y) => y.id === m.id); x.folder = x.folder === 'archived' ? 'inbox' : 'archived'; }); mailState.sel = null; drawMail(); toast(m.folder === 'archived' ? 'Moved to inbox' : 'Archived'); };
    $('#del').onclick = () => { if (!confirm('Delete this message permanently?')) return; VS.update((d) => { d.inquiries = d.inquiries.filter((x) => x.id !== m.id); }); log(`Deleted inquiry “${m.subject}”`); mailState.sel = null; drawMail(); };
    const body = $('#replyBody');
    const sig = '\n\n' + S.mailSignature;
    $$('[data-t]', r).forEach((b) => b.addEventListener('click', () => { body.value = TEMPLATES[b.dataset.t](m) + sig; body.focus(); }));
    const mt = $('#mailto');
    const upd = () => { mt.href = `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent('Re: ' + m.subject)}&body=${encodeURIComponent(body.value)}`; };
    body.addEventListener('input', upd); upd();
    $('#replyForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = body.value.trim(); if (!text) return;
      const now = new Date().toISOString();
      VS.update((d) => {
        const x = d.inquiries.find((y) => y.id === m.id);
        x.thread.push({ from: S.mailFrom, date: now, body: text, by: user.name });
        x.status = 'replied'; x.read = true;
        d.sent = d.sent || [];
        d.sent.unshift({ id: VS.uid('s'), to: m.email, toName: m.name, subject: 'Re: ' + m.subject, body: text, date: now, ref: m.id });
      });
      log(`Replied to ${m.name}`);
      toast(`Reply sent to ${m.email}`);
      drawMail();
    });
  }

  function compose(prefill = {}) {
    const S = VS.db.settings;
    modal({
      title: 'New email', saveLabel: 'Send',
      body: `<div class="field"><label>From</label><input value="${esc(S.mailFrom)}" disabled></div>
        <div class="row2"><div class="field"><label>To (email)</label><input name="to" type="email" required value="${esc(prefill.to || '')}"></div><div class="field"><label>Recipient name</label><input name="toName" value="${esc(prefill.toName || '')}"></div></div>
        <div class="field"><label>Subject</label><input name="subject" required></div>
        <div class="field"><label>Message</label><textarea name="body" required style="min-height:200px">\n\n${esc(S.mailSignature)}</textarea></div>`,
      onSave(f) {
        VS.update((d) => { d.sent = d.sent || []; d.sent.unshift({ id: VS.uid('s'), to: f.to, toName: f.toName, subject: f.subject, body: f.body, date: new Date().toISOString() }); });
        log(`Sent email “${f.subject}” to ${f.to}`);
        toast('Email sent');
        if ($('#mail')) { mailState.folder = 'sent'; mailState.sel = null; drawMail(); }
      },
    });
  }

  // ---------- Blog posts ----------
  views.posts = (c) => {
    const draw = () => {
      const posts = VS.db.posts.slice().sort((a, b) => b.date.localeCompare(a.date));
      c.innerHTML = `<div class="toolbar"><input class="inp" id="pq" placeholder="Search posts…"><span class="sp"></span><button class="btn primary" id="newPost">${icon('plus')} New post</button></div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody id="ptb">
        ${posts.map((p) => `<tr data-q="${esc((p.title + p.category).toLowerCase())}"><td style="width:70px"><img class="thumb-sm" src="${src(p.image)}" alt=""></td><td><div class="t-title">${esc(p.title)}</div><div class="t-sub">${esc(p.author)}</div></td><td class="t-sub">${esc(p.category)}</td>
          <td>${p.status === 'published' ? '<span class="st good">Published</span>' : '<span class="st warn">Draft</span>'}</td><td class="t-sub">${fmt(p.date)}</td>
          <td class="actions">${p.status === 'published' ? `<a class="icon-btn" title="View on site" target="_blank" href="../post.html?slug=${encodeURIComponent(p.slug)}">${icon('eye')}</a>` : ''}<button class="icon-btn" data-edit="${p.id}" title="Edit">${icon('edit')}</button><button class="icon-btn danger" data-del="${p.id}" title="Delete">${icon('trash')}</button></td></tr>`).join('')}
        </tbody></table></div></div>`;
      $('#newPost').onclick = () => editPost(null, draw);
      $('#pq').oninput = (e) => $$('#ptb tr').forEach((tr) => { tr.hidden = !tr.dataset.q.includes(e.target.value.toLowerCase()); });
      $$('[data-edit]', c).forEach((b) => (b.onclick = () => editPost(b.dataset.edit, draw)));
      $$('[data-del]', c).forEach((b) => (b.onclick = () => {
        const p = VS.db.posts.find((x) => x.id === b.dataset.del);
        if (!confirm(`Delete “${p.title}”?`)) return;
        VS.update((d) => { d.posts = d.posts.filter((x) => x.id !== p.id); }); log(`Deleted post “${p.title}”`); toast('Post deleted'); draw();
      }));
    };
    draw();
  };

  function editPost(id, after) {
    const p = id ? VS.db.posts.find((x) => x.id === id) : { title: '', category: '', date: new Date().toISOString().slice(0, 10), status: 'draft', author: user.name, image: 'assets/img/stock/hero-mara.jpg', excerpt: '', body: '' };
    const cats = [...new Set(VS.db.posts.map((x) => x.category))];
    const m = modal({
      title: id ? 'Edit post' : 'New post', wide: true, saveLabel: id ? 'Save changes' : 'Create post',
      body: `<div class="field"><label>Title</label><input name="title" required value="${esc(p.title)}"></div>
        <div class="row3"><div class="field"><label>Category</label><input name="category" list="catList" required value="${esc(p.category)}"><datalist id="catList">${cats.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div>
          <div class="field"><label>Publish date</label><input type="date" name="date" required value="${esc(p.date)}"></div>
          <div class="field"><label>Status</label><select name="status"><option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${p.status === 'published' ? 'selected' : ''}>Published</option></select></div></div>
        <div class="row2"><div class="field"><label>Author</label><input name="author" value="${esc(p.author)}"></div><div></div></div>
        ${imagePicker('image', p.image)}
        <div class="field"><label>Excerpt</label><textarea name="excerpt" style="min-height:70px" required>${esc(p.excerpt)}</textarea></div>
        <div class="field"><label>Body</label><textarea name="body" style="min-height:260px" required>${esc(p.body)}</textarea><div class="hint">Separate paragraphs with a blank line. Start a line with “## ” for a heading and “- ” for bullet points.</div></div>`,
      onSave(f) {
        const slugBase = f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
        VS.update((d) => {
          if (id) Object.assign(d.posts.find((x) => x.id === id), f);
          else {
            let slug = slugBase, n = 2;
            while (d.posts.some((x) => x.slug === slug)) slug = slugBase + '-' + n++;
            d.posts.unshift({ id: VS.uid('p'), slug, ...f });
          }
        });
        log(`${id ? 'Updated' : 'Created'} post “${f.title}”${f.status === 'published' ? ' (published)' : ''}`);
        toast(id ? 'Post updated' : 'Post created');
        after ? after() : route();
      },
    });
    bindPicker(m.el, 'image');
  }

  // ---------- Gallery ----------
  views.gallery = (c) => {
    const draw = () => {
      const evs = VS.db.events.slice().sort((a, b) => b.date.localeCompare(a.date));
      c.innerHTML = `<div class="toolbar"><span style="color:var(--muted)">Photos and videos are grouped by event on the public gallery page.</span><span class="sp"></span><a class="btn" href="../gallery.html" target="_blank">${icon('eye')} View gallery</a><button class="btn primary" id="newEv">${icon('plus')} New event</button></div>
        <div class="grid g3">${evs.map((e) => {
          const cover = e.media.find((m) => m.type === 'image') || e.media[0];
          const nP = e.media.filter((m) => m.type === 'image').length, nV = e.media.length - nP;
          return `<div class="ev-card"><div class="cover">${cover ? `<img src="${src(cover.type === 'video' ? cover.poster || '' : cover.src)}" alt="">` : ''}${e.sample ? '<span class="st warn">Sample imagery</span>' : ''}</div>
            <div class="bd"><h4>${esc(e.title)}</h4><small>${fmt(e.date)} · ${esc(e.location)} · ${esc(e.category)}</small></div>
            <div class="ft"><span>${nP} photo${nP === 1 ? '' : 's'} · ${nV} video${nV === 1 ? '' : 's'}</span><span><button class="icon-btn" data-edit="${e.id}" title="Edit">${icon('edit')}</button><button class="icon-btn danger" data-del="${e.id}" title="Delete">${icon('trash')}</button></span></div></div>`;
        }).join('')}</div>`;
      $('#newEv').onclick = () => editEvent(null, draw);
      $$('[data-edit]', c).forEach((b) => (b.onclick = () => editEvent(b.dataset.edit, draw)));
      $$('[data-del]', c).forEach((b) => (b.onclick = () => {
        const e = VS.db.events.find((x) => x.id === b.dataset.del);
        if (!confirm(`Delete event “${e.title}” and its media?`)) return;
        VS.update((d) => { d.events = d.events.filter((x) => x.id !== e.id); }); log(`Deleted gallery event “${e.title}”`); draw();
      }));
    };
    draw();
  };

  function editEvent(id, after) {
    const e0 = id ? VS.db.events.find((x) => x.id === id) : { title: '', date: new Date().toISOString().slice(0, 10), location: '', category: '', description: '', media: [], sample: false };
    let media = JSON.parse(JSON.stringify(e0.media));
    const cats = [...new Set(VS.db.events.map((x) => x.category))];
    const m = modal({
      title: id ? 'Edit event' : 'New gallery event', wide: true, saveLabel: id ? 'Save event' : 'Create event',
      body: `<div class="field"><label>Event title</label><input name="title" required value="${esc(e0.title)}"></div>
        <div class="row3"><div class="field"><label>Date</label><input type="date" name="date" required value="${esc(e0.date)}"></div>
          <div class="field"><label>Location</label><input name="location" required value="${esc(e0.location)}"></div>
          <div class="field"><label>Category</label><input name="category" list="evCats" required value="${esc(e0.category)}"><datalist id="evCats">${cats.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
        <div class="field"><label>Description</label><textarea name="description" style="min-height:70px">${esc(e0.description)}</textarea></div>
        <div class="field"><label>Photos &amp; videos</label><div class="media-edit" id="medGrid"></div></div>
        <div class="row2">
          <label class="drop">${icon('image')}<b>Upload photos</b><small>JPG/PNG, resized automatically</small><input type="file" accept="image/*" multiple hidden id="upImg"></label>
          <div class="drop" style="cursor:default">${icon('video')}<b>Add a video</b>
            <div style="display:flex;gap:6px;width:100%"><input class="inp" id="vidUrl" placeholder="YouTube link or assets/video/file.mp4"><button type="button" class="btn sm" id="addVid">Add</button></div></div>
        </div>`,
      onSave(f) {
        if (!media.length && !confirm('This event has no photos or videos yet. Save anyway?')) return false;
        const ev = { ...f, media, sample: !!e0.sample };
        let ok;
        if (id) ok = VS.update((d) => { Object.assign(d.events.find((x) => x.id === id), ev); });
        else ok = VS.update((d) => { d.events.unshift({ id: VS.uid('e'), ...ev }); });
        if (!ok) return false;
        log(`${id ? 'Updated' : 'Created'} gallery event “${f.title}”`);
        toast(id ? 'Event updated' : 'Event created');
        after && after();
      },
    });
    const grid = $('#medGrid', m.el);
    const drawMed = () => {
      grid.innerHTML = media.map((x, i) => `<div class="mi"><div class="pv">${x.type === 'video' ? (x.poster ? `<img src="${src(x.poster)}" alt="">` : `<div style="display:grid;place-items:center;height:100%;color:var(--muted)">${icon('video')}</div>`) + '<span class="vt">VIDEO</span>' : `<img src="${src(x.src)}" alt="">`}
        <button type="button" class="icon-btn danger rm" data-rm="${i}" title="Remove">${icon('close')}</button></div><input data-cap="${i}" placeholder="Caption" value="${esc(x.caption || '')}"></div>`).join('') || '<div class="empty" style="grid-column:1/-1;padding:16px">No media yet.</div>';
      $$('[data-rm]', grid).forEach((b) => (b.onclick = () => { media.splice(Number(b.dataset.rm), 1); drawMed(); }));
      $$('[data-cap]', grid).forEach((inp) => (inp.oninput = () => { media[Number(inp.dataset.cap)].caption = inp.value; }));
    };
    drawMed();
    $('#upImg', m.el).addEventListener('change', async (e) => {
      for (const f of e.target.files) media.push({ type: 'image', src: await VS.fileToDataURL(f, 1200), caption: f.name.replace(/\.\w+$/, '').replace(/[-_]/g, ' ') });
      e.target.value = ''; drawMed();
    });
    $('#addVid', m.el).onclick = () => {
      const u = $('#vidUrl', m.el).value.trim(); if (!u) return;
      const yt = u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
      media.push({ type: 'video', src: u, poster: yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : '', caption: 'Video' });
      $('#vidUrl', m.el).value = ''; drawMed();
    };
  }

  // ---------- Services ----------
  views.services = (c) => {
    const draw = () => {
      c.innerHTML = `<div class="toolbar"><span style="color:var(--muted)">Edit the service areas shown on the homepage and Services page.</span><span class="sp"></span><a class="btn" href="../services.html" target="_blank">${icon('eye')} View page</a></div>
        <div class="card">${VS.db.services.map((s) => `<div class="list-item"><img class="thumb-sm" src="${src(s.image)}" alt="" style="width:80px;height:56px"><div class="grow"><div class="t"><span style="color:var(--accent);font-family:var(--head)">${s.num}</span> &nbsp;${esc(s.title)}</div><div class="s">${esc(s.summary)}</div><div class="s" style="margin-top:4px">${s.items.length} sub-services</div></div><button class="btn sm" data-edit="${s.id}">${icon('edit')} Edit</button></div>`).join('')}</div>`;
      $$('[data-edit]', c).forEach((b) => (b.onclick = () => {
        const s = VS.db.services.find((x) => x.id === b.dataset.edit);
        const m = modal({
          title: 'Edit service', wide: true,
          body: `<div class="field"><label>Title</label><input name="title" required value="${esc(s.title)}"></div>
            <div class="field"><label>Summary</label><textarea name="summary" style="min-height:70px" required>${esc(s.summary)}</textarea></div>
            <div class="field"><label>Sub-services (one per line)</label><textarea name="items" style="min-height:140px">${esc(s.items.join('\n'))}</textarea></div>
            ${imagePicker('image', s.image)}`,
          onSave(f) {
            VS.update((d) => { Object.assign(d.services.find((x) => x.id === s.id), { title: f.title, summary: f.summary, image: f.image, items: f.items.split('\n').map((x) => x.trim()).filter(Boolean) }); });
            log(`Updated service “${f.title}”`); toast('Service updated'); draw();
          },
        });
        bindPicker(m.el, 'image');
      }));
    };
    draw();
  };

  // ---------- Users & roles (admin) ----------
  views.users = (c) => {
    const PERMS = [
      ['View own projects, documents & messages', 1, 0, 1], ['Read & reply to company email', 0, 1, 1], ['Manage blog, gallery & services', 0, 1, 1],
      ['Manage stakeholder projects & documents', 0, 0, 1], ['Manage users & roles', 0, 0, 1], ['Site settings, activity log & data export', 0, 0, 1],
    ];
    const draw = () => {
      const users = VS.db.users;
      c.innerHTML = `<div class="toolbar"><input class="inp" id="uq" placeholder="Search users…"><div class="seg" id="roleSeg"><button class="active" data-r="">All</button><button data-r="admin">Super Admin</button><button data-r="manager">Manager</button><button data-r="stakeholder">Stakeholder</button></div><span class="sp"></span><button class="btn primary" id="addUser">${icon('plus')} Add user</button></div>
        <div class="card mb"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Organisation</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody id="utb">
        ${users.map((u) => `<tr data-r="${u.role}" data-q="${esc((u.name + u.email + u.org).toLowerCase())}"><td><div style="display:flex;gap:12px;align-items:center"><span class="avatar">${esc(initials(u.name))}</span><div><div class="t-title">${esc(u.name)}${u.id === user.id ? ' <span class="t-sub">(you)</span>' : ''}</div><div class="t-sub">${esc(u.email)}</div></div></div></td>
          <td>${ROLE_LABEL[u.role]}</td><td class="t-sub">${esc(u.org)}</td><td>${u.active ? '<span class="st good">Active</span>' : '<span class="st bad">Disabled</span>'}</td><td class="t-sub">${u.lastLogin ? ago(u.lastLogin) : 'Never'}</td>
          <td class="actions"><button class="icon-btn" data-edit="${u.id}" title="Edit">${icon('edit')}</button>${u.id !== user.id ? `<button class="icon-btn" data-tog="${u.id}" title="${u.active ? 'Disable' : 'Enable'}">${icon('lock')}</button><button class="icon-btn danger" data-del="${u.id}" title="Delete">${icon('trash')}</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div></div>
        <div class="card"><div class="card-h"><h3>Role permissions</h3><small>What each role can access</small></div><div class="tbl-wrap"><table class="tbl perm"><thead><tr><th>Capability</th><th>Stakeholder</th><th>Website Manager</th><th>Super Admin</th></tr></thead><tbody>
        ${PERMS.map(([t, ...r]) => `<tr><td>${t}</td>${r.map((v) => `<td class="${v ? 'y' : 'n'}">${v ? icon('check') + '<span class="sr-only">Yes</span>' : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
      let roleF = '', q = '';
      const filt = () => $$('#utb tr').forEach((tr) => { tr.hidden = (roleF && tr.dataset.r !== roleF) || !tr.dataset.q.includes(q); });
      $('#uq').oninput = (e) => { q = e.target.value.toLowerCase(); filt(); };
      $$('#roleSeg button').forEach((b) => (b.onclick = () => { roleF = b.dataset.r; $$('#roleSeg button').forEach((x) => x.classList.toggle('active', x === b)); filt(); }));
      $('#addUser').onclick = () => editUser(null, draw);
      $$('[data-edit]', c).forEach((b) => (b.onclick = () => editUser(b.dataset.edit, draw)));
      $$('[data-tog]', c).forEach((b) => (b.onclick = () => { let nm; VS.update((d) => { const u = d.users.find((x) => x.id === b.dataset.tog); u.active = !u.active; nm = `${u.active ? 'Enabled' : 'Disabled'} user ${u.name}`; }); log(nm); toast(nm); draw(); }));
      $$('[data-del]', c).forEach((b) => (b.onclick = () => { const u = VS.db.users.find((x) => x.id === b.dataset.del); if (!confirm(`Delete ${u.name}?`)) return; VS.update((d) => { d.users = d.users.filter((x) => x.id !== u.id); }); log(`Deleted user ${u.name}`); draw(); }));
    };
    draw();
  };

  function editUser(id, after) {
    const u = id ? VS.db.users.find((x) => x.id === id) : { name: '', email: '', role: 'stakeholder', org: '', password: '' };
    modal({
      title: id ? 'Edit user' : 'Add user', saveLabel: id ? 'Save' : 'Create user',
      body: `<div class="row2"><div class="field"><label>Full name / organisation name</label><input name="name" required value="${esc(u.name)}"></div><div class="field"><label>Email</label><input type="email" name="email" required value="${esc(u.email)}"></div></div>
        <div class="row2"><div class="field"><label>Role</label><select name="role" ${id === user.id ? 'disabled' : ''}>${Object.entries(ROLE_LABEL).map(([k, l]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${id === user.id ? `<input type="hidden" name="role" value="${u.role}">` : ''}</div>
          <div class="field"><label>Organisation</label><input name="org" required value="${esc(u.org)}"><div class="hint">Stakeholders see projects and documents for this organisation.</div></div></div>
        <div class="field"><label>${id ? 'New password (leave blank to keep)' : 'Temporary password'}</label><input name="password" ${id ? '' : 'required'} minlength="6"></div>`,
      onSave(f) {
        const d0 = VS.db;
        if (d0.users.some((x) => x.email.toLowerCase() === f.email.toLowerCase() && x.id !== id)) { alert('A user with this email already exists.'); return false; }
        VS.update((d) => {
          if (id) { const x = d.users.find((y) => y.id === id); Object.assign(x, { name: f.name, email: f.email, role: f.role, org: f.org }); if (f.password) x.password = f.password; }
          else d.users.push({ id: VS.uid('u'), name: f.name, email: f.email, role: f.role, org: f.org, password: f.password, active: true, lastLogin: null });
        });
        log(`${id ? 'Updated' : 'Created'} user ${f.name} (${ROLE_LABEL[f.role]})`);
        toast(id ? 'User updated' : 'User created');
        after();
      },
    });
  }

  // ---------- Stakeholder projects (admin) ----------
  function adminProjects(c) {
    const draw = () => {
      const d = VS.db;
      c.innerHTML = `<div class="toolbar"><span style="color:var(--muted)">Projects and documents appear on each stakeholder's dashboard.</span><span class="sp"></span><button class="btn" id="addDoc">${icon('file')} Share document</button><button class="btn primary" id="addProj">${icon('plus')} New project</button></div>
        <div class="card mb"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Project</th><th>Stakeholder</th><th>Status</th><th style="min-width:160px">Progress</th><th>Due</th><th></th></tr></thead><tbody>
        ${d.projects.map((p) => `<tr><td class="t-title">${esc(p.title)}</td><td class="t-sub">${esc(p.org)}</td><td><span class="st ${projStatus(p.status)}">${esc(p.status)}</span></td>
          <td><div style="display:flex;align-items:center;gap:10px"><div class="prog" style="flex:1"><i style="width:${p.progress}%"></i></div><span class="t-sub">${p.progress}%</span></div></td><td class="t-sub">${fmt(p.due)}</td>
          <td class="actions"><button class="icon-btn" data-edit="${p.id}" title="Edit">${icon('edit')}</button><button class="icon-btn danger" data-del="${p.id}" title="Delete">${icon('trash')}</button></td></tr>`).join('')}
        </tbody></table></div></div>
        <div class="card"><div class="card-h"><h3>Shared documents</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Document</th><th>Stakeholder</th><th>Size</th><th>Shared</th><th></th></tr></thead><tbody>
        ${d.documents.slice().sort((a, b) => b.date.localeCompare(a.date)).map((x) => `<tr><td class="t-title">${esc(x.name)}</td><td class="t-sub">${esc(x.org)}</td><td class="t-sub">${x.size}</td><td class="t-sub">${fmt(x.date)}</td><td class="actions"><button class="icon-btn danger" data-ddel="${x.id}" title="Remove">${icon('trash')}</button></td></tr>`).join('')}
        </tbody></table></div></div>`;
      $('#addProj').onclick = () => editProject(null, draw);
      $('#addDoc').onclick = () => shareDoc(draw);
      $$('[data-edit]', c).forEach((b) => (b.onclick = () => editProject(b.dataset.edit, draw)));
      $$('[data-del]', c).forEach((b) => (b.onclick = () => { const p = VS.db.projects.find((x) => x.id === b.dataset.del); if (!confirm(`Delete “${p.title}”?`)) return; VS.update((d) => { d.projects = d.projects.filter((x) => x.id !== p.id); }); log(`Deleted project “${p.title}”`); draw(); }));
      $$('[data-ddel]', c).forEach((b) => (b.onclick = () => { VS.update((d) => { d.documents = d.documents.filter((x) => x.id !== b.dataset.ddel); }); toast('Document removed'); draw(); }));
    };
    draw();
  }
  const orgs = () => [...new Set(VS.db.users.filter((u) => u.role === 'stakeholder').map((u) => u.org))];

  function editProject(id, after) {
    const p = id ? VS.db.projects.find((x) => x.id === id) : { title: '', org: orgs()[0] || '', status: 'Planning', progress: 0, start: new Date().toISOString().slice(0, 10), due: '', lead: '', milestones: [] };
    const m = modal({
      title: id ? 'Edit project' : 'New project', wide: true,
      body: `<div class="field"><label>Project title</label><input name="title" required value="${esc(p.title)}"></div>
        <div class="row3"><div class="field"><label>Stakeholder</label><select name="org">${orgs().map((o) => `<option ${o === p.org ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
          <div class="field"><label>Status</label><select name="status">${['Planning', 'In progress', 'Report review', 'Completed'].map((s) => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label>Lead expert</label><input name="lead" value="${esc(p.lead)}"></div></div>
        <div class="row3"><div class="field"><label>Start</label><input type="date" name="start" value="${esc(p.start)}"></div><div class="field"><label>Due</label><input type="date" name="due" value="${esc(p.due)}"></div>
          <div class="field"><label>Progress: <span id="pv">${p.progress}</span>%</label><input type="range" name="progress" min="0" max="100" step="5" value="${p.progress}" style="padding:0;accent-color:var(--accent)"></div></div>
        <div class="field"><label>Milestones (one per line; prefix with [x] when done)</label><textarea name="milestones" style="min-height:130px">${esc(p.milestones.map((x) => (x.done ? '[x] ' : '') + x.t).join('\n'))}</textarea></div>`,
      onSave(f) {
        const rec = { ...f, progress: Number(f.progress), milestones: f.milestones.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ t: l.replace(/^\[x\]\s*/i, ''), done: /^\[x\]/i.test(l) })) };
        VS.update((d) => { if (id) Object.assign(d.projects.find((x) => x.id === id), rec); else d.projects.push({ id: VS.uid('pr'), ...rec }); });
        log(`${id ? 'Updated' : 'Created'} project “${f.title}”`); toast('Project saved'); after();
      },
    });
    $('input[type=range]', m.el).oninput = (e) => { $('#pv', m.el).textContent = e.target.value; };
  }

  function shareDoc(after) {
    const ps = VS.db.projects;
    modal({
      title: 'Share a document', saveLabel: 'Share',
      body: `<div class="field"><label>Project</label><select name="project" required>${ps.map((p) => `<option value="${p.id}">${esc(p.title)} — ${esc(p.org)}</option>`).join('')}</select></div>
        <div class="field"><label>File</label><input type="file" name="file" required><div class="hint">MVP: the file name and size are recorded; storage is connected in production.</div></div>`,
      onSave(f) {
        const file = f.file, p = ps.find((x) => x.id === f.project);
        const kb = file.size / 1024, size = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB';
        VS.update((d) => { d.documents.push({ id: VS.uid('d'), org: p.org, project: p.id, name: file.name, size, date: new Date().toISOString().slice(0, 10) }); });
        log(`Shared ${file.name} with ${p.org}`); toast('Document shared'); after();
      },
    });
  }

  // ---------- Settings (admin) ----------
  views.settings = (c) => {
    const S = VS.db.settings;
    c.innerHTML = `<div class="grid g-main">
      <form class="card" id="setForm"><div class="card-h"><h3>Company &amp; contact details</h3></div><div class="card-b">
        <div class="row2"><div class="field"><label>Company name</label><input name="companyName" value="${esc(S.companyName)}"></div><div class="field"><label>Tagline</label><input name="tagline" value="${esc(S.tagline)}"></div></div>
        <div class="row2"><div class="field"><label>Phone 1</label><input name="phone1" value="${esc(S.phone1)}"></div><div class="field"><label>Phone 2</label><input name="phone2" value="${esc(S.phone2)}"></div></div>
        <div class="field"><label>Office address</label><input name="address" value="${esc(S.address)}"></div>
        <div class="field"><label>Postal address</label><input name="postal" value="${esc(S.postal)}"></div>
        <div class="row2"><div class="field"><label>Public email (shown on website)</label><input type="email" name="publicEmail" value="${esc(S.publicEmail)}"></div>
          <div class="field"><label>Company email (send-as address)</label><input type="email" name="mailFrom" value="${esc(S.mailFrom)}"><div class="hint">Used for replies from the portal mailbox.</div></div></div>
        <div class="field"><label>Email signature</label><textarea name="mailSignature">${esc(S.mailSignature)}</textarea></div>
        <label class="switch" style="margin:6px 0 18px"><input type="checkbox" name="maintenance" ${S.maintenance ? 'checked' : ''}> Show maintenance banner on public site</label>
        <div><button class="btn primary">${icon('check')} Save settings</button></div></div></form>
      <div>
        <div class="card mb"><div class="card-h"><h3>Data</h3></div><div class="card-b">
          <p style="color:var(--muted);margin-top:0">Export all website and portal data as JSON, for backup or for migrating into the production database.</p>
          <button class="btn" id="exp">${icon('download')} Export data</button>
          <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">
          <p style="color:var(--muted);margin-top:0">Restore the original demo content. This removes all changes made in this browser.</p>
          <button class="btn danger" id="reset">${icon('trash')} Reset demo data</button></div></div>
        <div class="card"><div class="card-h"><h3>Email delivery</h3></div><div class="card-b">
          <div class="demo-note">${icon('mail')}<span>Inbox receives website inquiries and stakeholder messages automatically. To deliver replies to external mailboxes, connect a provider (Google Workspace, Microsoft 365 or SMTP) for <b>${esc(S.mailFrom)}</b>.</span></div></div></div>
      </div></div>`;
    $('#setForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      f.maintenance = !!f.maintenance;
      VS.update((d) => Object.assign(d.settings, f));
      log('Updated site settings'); toast('Settings saved');
    });
    $('#exp').onclick = () => { download(`verdescope-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(VS.db, null, 2), 'application/json'); log('Exported data'); };
    $('#reset').onclick = () => {
      if (!confirm('Reset all demo data? Changes made in this browser will be lost.')) return;
      const uidKeep = user.id; VS.reset();
      if (!VS.db.users.some((u) => u.id === uidKeep)) { VS.logout(); location.href = 'login.html'; return; }
      toast('Demo data restored'); route();
    };
  };

  // ---------- Activity log (admin) ----------
  views.activity = (c) => {
    const a = VS.db.activity;
    c.innerHTML = `<div class="toolbar"><input class="inp" id="aq" placeholder="Filter activity…"><span class="sp"></span><span style="color:var(--muted);font-size:13px">${a.length} entries</span></div>
      <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>User</th><th>Action</th></tr></thead><tbody id="atb">
      ${a.map((x) => `<tr data-q="${esc((x.user + x.action).toLowerCase())}"><td class="t-sub" style="white-space:nowrap">${fmtTime(x.date)}</td><td>${esc(x.user)}</td><td class="t-sub">${esc(x.action)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    $('#aq').oninput = (e) => $$('#atb tr').forEach((tr) => { tr.hidden = !tr.dataset.q.includes(e.target.value.toLowerCase()); });
  };

  // ---------- Account ----------
  views.account = (c) => {
    c.innerHTML = `<div class="grid g2"><form class="card" id="accForm"><div class="card-h"><h3>Profile</h3></div><div class="card-b">
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px"><span class="avatar" style="width:60px;height:60px;font-size:22px">${esc(initials(user.name))}</span><div><b style="font-weight:400;font-size:17px">${esc(user.name)}</b><div style="color:var(--muted)">${ROLE_LABEL[user.role]} · ${esc(user.org)}</div></div></div>
        <div class="field"><label>Display name</label><input name="name" value="${esc(user.name)}" required></div>
        <div class="field"><label>Email</label><input value="${esc(user.email)}" disabled></div>
        <button class="btn primary">Save profile</button></div></form>
      <form class="card" id="pwForm" style="align-self:start"><div class="card-h"><h3>Change password</h3></div><div class="card-b">
        <div class="field"><label>Current password</label><input type="password" name="cur" required autocomplete="current-password"></div>
        <div class="field"><label>New password</label><input type="password" name="pw" required minlength="6" autocomplete="new-password"></div>
        <div class="err" id="pwErr"></div><button class="btn primary">Update password</button></div></form></div>`;
    $('#accForm').addEventListener('submit', (e) => { e.preventDefault(); const n = new FormData(e.target).get('name'); VS.update((d) => { d.users.find((u) => u.id === user.id).name = n; }); toast('Profile saved'); shell(); route(); });
    $('#pwForm').addEventListener('submit', (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      if (f.cur !== VS.db.users.find((u) => u.id === user.id).password) { $('#pwErr').textContent = 'Current password is incorrect.'; return; }
      VS.update((d) => { d.users.find((u) => u.id === user.id).password = f.pw; }); log('Changed password'); e.target.reset(); $('#pwErr').textContent = ''; toast('Password updated');
    });
  };

  // ---------- Boot ----------
  shell();
  window.addEventListener('hashchange', route);
  // Live-refresh when another tab (e.g. the public contact form) writes new data
  window.addEventListener('storage', (e) => { if (e.key === 'vs_db_v1') { if (location.hash.includes('mail') && $('#mail')) drawMail(); else drawNav((location.hash.replace(/^#\/?/, '') || 'overview')); } });
  route();
})();

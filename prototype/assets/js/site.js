/* Public site: shared chrome + per-page renderers (body[data-page]). */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = VS.esc;
  const src = VS.src;
  const page = document.body.dataset.page;
  const db = VS.db;
  const S = db.settings;

  const NAV = [
    ['index.html', 'Home', 'home'], ['about.html', 'About', 'about'], ['services.html', 'Services', 'services'],
    ['gallery.html', 'Gallery', 'gallery'], ['blog.html', 'Blog', 'blog'], ['contact.html', 'Contact', 'contact'],
  ];

  // ---------- Chrome ----------
  function header() {
    const h = document.createElement('header');
    h.className = 'site-header';
    h.innerHTML = `
      <div class="wrap">
        <a class="brand" href="index.html" aria-label="Verde-Scope Africa home">
          <img src="assets/img/brand/logo-emblem-light.png" alt="">
          <span class="brand-text"><b>VERDE-<span>SCOPE</span></b><small>AFRICA LIMITED</small></span>
        </a>
        <nav class="nav" id="nav">
          ${NAV.map(([href, label, key]) => `<a href="${href}" class="${(page === key || (page === 'post' && key === 'blog')) ? 'active' : ''}">${label}</a>`).join('')}
          <a href="portal/login.html" class="btn-portal">Portal</a>
        </nav>
        <button class="burger" aria-label="Menu" aria-controls="nav" aria-expanded="false">${icon('menu')}</button>
      </div>`;
    document.body.prepend(h);
    const burger = $('.burger', h), nav = $('#nav', h);
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      burger.innerHTML = icon(open ? 'close' : 'menu');
    });
    const onScroll = () => h.classList.toggle('solid', window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function footer() {
    const f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML = `
      <div class="wrap foot-grid">
        <div>
          <img class="foot-logo" src="assets/img/brand/logo-full-light.png" alt="Verde-Scope Africa Limited">
          <p>A multidisciplinary environmental and development consultancy providing innovative, evidence-based and sustainable solutions across Africa since 2011.</p>
          <div class="socials">
            <a href="#" aria-label="LinkedIn">${icon('linkedin')}</a>
            <a href="#" aria-label="Facebook">${icon('facebook')}</a>
            <a href="#" aria-label="X">${icon('xlogo')}</a>
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          <ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}<li><a href="portal/login.html">Client &amp; Staff Portal</a></li></ul>
        </div>
        <div>
          <h4>Services</h4>
          <ul>${VS.db.services.map((s) => `<li><a href="services.html#${s.id}">${esc(s.title)}</a></li>`).join('')}</ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li>${esc(S.address)}</li>
            <li>${esc(S.postal)}</li>
            <li><a href="tel:${S.phone1.replace(/\s/g, '')}">${esc(S.phone1)}</a> · <a href="tel:${S.phone2.replace(/\s/g, '')}">${esc(S.phone2)}</a></li>
            <li><a href="mailto:${esc(S.publicEmail)}">${esc(S.publicEmail)}</a></li>
          </ul>
        </div>
      </div>
      <div class="wrap foot-bottom">
        <span>© ${new Date().getFullYear()} Verde-Scope Africa Limited. Registered with NEMA · Member, Kenya Rainwater Association.</span>
        <span>Some landscape photography via Wikimedia Commons (CC BY / BY-SA) — credited in the gallery.</span>
      </div>`;
    document.body.append(f);

    const top = document.createElement('button');
    top.className = 'to-top'; top.setAttribute('aria-label', 'Back to top'); top.innerHTML = icon('up');
    top.onclick = () => window.scrollTo({ top: 0 });
    document.body.append(top);
    window.addEventListener('scroll', () => top.classList.toggle('show', window.scrollY > 600), { passive: true });
  }

  function reveal() {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    $$('.reveal').forEach((el) => io.observe(el));
  }

  // ---------- Shared fragments ----------
  const postCard = (p) => {
    const d = new Date(p.date);
    return `<a class="post-card reveal" href="post.html?slug=${encodeURIComponent(p.slug)}">
      <div class="thumb"><img src="${src(p.image)}" alt="" loading="lazy">
        <div class="date"><b>${d.getDate()}</b><small>${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}</small></div></div>
      <div class="body"><span class="tag">${esc(p.category)}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p>
      <span class="link-arrow">Read more ${icon('arrowR')}</span></div></a>`;
  };
  const svcCard = (s) => `<div class="svc reveal" id="card-${s.id}"><span class="num">${s.num}</span><div class="ico">${icon(s.icon)}</div>
      <h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><a class="link-arrow" href="services.html#${s.id}">Discover ${icon('arrowR')}</a></div>`;
  const published = () => VS.db.posts.filter((p) => p.status === 'published').sort((a, b) => b.date.localeCompare(a.date));

  // ---------- Pages ----------
  const pages = {
    home() {
      // Hero slider
      const slides = [
        { img: 'assets/img/stock/hero-mara.jpg', eyebrow: 'Environmental & Development Consultancy', title: 'Sustainable <b>Solutions</b> for Africa', text: 'Evidence-based environmental compliance, climate resilience and natural resource management for governments, development partners and the private sector.' },
        { img: 'assets/img/stock/mau-forest.jpg', eyebrow: 'Natural Resources · WASH · IWRM', title: 'Resilient <b>Ecosystems</b>', text: 'From watershed management to ecosystem restoration, we help protect the water towers and landscapes that sustain livelihoods.' },
        { img: 'assets/img/projects/community-baraza.jpg', eyebrow: 'Research · M&E · Capacity Building', title: 'Thriving <b>Communities</b>', text: 'Meaningful stakeholder engagement, rigorous research and training that leave institutions and communities stronger.' },
      ];
      const hero = $('#hero');
      hero.innerHTML = slides.map((s, i) => `
        <div class="slide ${i === 0 ? 'active' : ''}">
          <div class="slide-bg" style="background-image:url('${s.img}')"></div>
          <div class="slide-content wrap"><div class="inner">
            <span class="eyebrow">${s.eyebrow}</span><h1>${s.title}</h1><p>${s.text}</p>
            <div><a class="btn" href="services.html">Discover our services ${icon('arrowR')}</a></div>
          </div></div>
        </div>`).join('') + `
        <div class="hero-ui"><div class="wrap">
          <div class="counter"><b id="slideNum">01</b><i></i><span>0${slides.length}</span></div>
          <div class="arrows"><button aria-label="Previous slide" data-dir="-1">${icon('arrowL')}</button><button aria-label="Next slide" data-dir="1">${icon('arrowR')}</button></div>
        </div></div><div class="scroll-cue"></div>`;
      let cur = 0, timer;
      const go = (n) => {
        const all = $$('.slide', hero);
        all[cur].classList.remove('active');
        cur = (n + all.length) % all.length;
        all[cur].classList.add('active');
        $('#slideNum').textContent = String(cur + 1).padStart(2, '0');
        const bar = $('.counter i', hero); bar.replaceWith(bar.cloneNode()); // restart progress animation
        clearInterval(timer); timer = setInterval(() => go(cur + 1), 6500);
      };
      $$('.arrows button', hero).forEach((b) => b.addEventListener('click', () => go(cur + Number(b.dataset.dir))));
      timer = setInterval(() => go(cur + 1), 6500);

      $('#homeServices').innerHTML = VS.db.services.slice(0, 3).map(svcCard).join('');
      $('#homeServices2').innerHTML = VS.db.services.slice(3).map(svcCard).join('') +
        `<div class="svc reveal" style="justify-content:center;background:var(--forest)"><h3>Need a tailored team?</h3><p style="color:#c3cfc6">Our experts combine environmental science, engineering, economics, GIS and social science.</p><a class="btn" href="contact.html">Talk to us ${icon('arrowR')}</a></div>`;

      const featured = [
        { img: 'assets/img/projects/pump-house.jpg', cat: 'Water & Irrigation', t: 'Irrigation & water distribution supervision' },
        { img: 'assets/img/stock/samburu-arid.jpg', cat: 'ASAL Resilience', t: 'Design & supervision of 15 sand dams, Kajiado' },
        { img: 'assets/img/stock/tana-sunset.jpg', cat: 'ESIA', t: 'ESIA of floating jetty, Shimoni — KMFRI / World Bank' },
        { img: 'assets/img/projects/community-baraza.jpg', cat: 'Public Participation', t: 'Community consultations for ESIA studies' },
      ];
      $('#homeProjects').innerHTML = featured.map((p) => `<a class="pcard reveal" href="gallery.html"><img src="${p.img}" alt="" loading="lazy"><div class="cap"><small>${p.cat}</small><h3>${p.t}</h3></div></a>`).join('');
      $('#homeNews').innerHTML = published().slice(0, 3).map(postCard).join('');

      // Video banner opens highlight reel
      $('#playReel').addEventListener('click', () => lightbox.open([{ type: 'video', src: 'assets/video/field-highlights.mp4', caption: 'Verde-Scope field highlights' }], 0));
    },

    about() {
      $('#team').innerHTML = VS.db.team.map((t) => {
        const ini = t.name.replace(/^(Dr\.?|Eng\.?|Mr\.?)\s*/g, '').replace(/^(Eng\.?)\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('');
        return `<div class="team-card reveal"><div class="avatar">${esc(ini)}</div>${t.years ? `<span class="yrs">${t.years} yrs</span>` : ''}<h3>${esc(t.name)}</h3><span class="role">${esc(t.role)}</span><p>${esc(t.bio)}</p></div>`;
      }).join('');
      const rows = VS.db.assignments;
      const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
      const types = [...new Set(rows.map((r) => r.type))];
      const fb = $('#assignFilters');
      fb.innerHTML = `<button class="chip active" data-f="all">All</button>` + types.map((t) => `<button class="chip" data-f="${t}">${t}</button>`).join('') + years.map((y) => `<button class="chip" data-f="${y}">${y}</button>`).join('');
      const draw = (f) => {
        $('#assignBody').innerHTML = rows.filter((r) => f === 'all' || r.type === f || String(r.year) === f)
          .map((r) => `<tr><td>${esc(r.title)}</td><td>${esc(r.client)}</td><td>${esc(r.location)}</td><td>${r.year}</td><td><span class="pill">${esc(r.type)}</span></td></tr>`).join('');
      };
      fb.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', fb).forEach((c) => c.classList.toggle('active', c === b)); draw(b.dataset.f); });
      draw('all');
    },

    services() {
      $('#serviceCards').innerHTML = VS.db.services.map(svcCard).join('');
      $('#serviceDetails').innerHTML = VS.db.services.map((s) => `
        <div class="svc-detail reveal" id="${s.id}">
          <div class="svc-media"><span class="num">${s.num}</span><img src="${src(s.image)}" alt="" loading="lazy"></div>
          <div><span class="eyebrow">Service ${s.num}</span><h2 style="font-size:clamp(26px,3vw,36px);font-weight:300">${esc(s.title)}</h2><p>${esc(s.summary)}</p>
            <ul>${s.items.map((i) => `<li>${icon('check')}<span>${esc(i)}</span></li>`).join('')}</ul>
            <a class="btn" href="contact.html?service=${encodeURIComponent(s.title)}">Request this service ${icon('arrowR')}</a></div>
        </div>`).join('');
      if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 50);
    },

    gallery() {
      const events = VS.db.events.slice().sort((a, b) => b.date.localeCompare(a.date));
      const cats = [...new Set(events.map((e) => e.category))];
      const years = [...new Set(events.map((e) => e.date.slice(0, 4)))];
      const fb = $('#galleryFilters');
      fb.innerHTML = `<button class="chip active" data-f="all">All events</button>` +
        `<button class="chip" data-f="video">${'Videos'}</button>` +
        cats.map((c) => `<button class="chip" data-f="c:${esc(c)}">${esc(c)}</button>`).join('') +
        years.map((y) => `<button class="chip" data-f="y:${y}">${y}</button>`).join('');
      const draw = (f) => {
        const list = events.filter((e) => f === 'all' || (f === 'video' && e.media.some((m) => m.type === 'video')) || f === 'c:' + e.category || f === 'y:' + e.date.slice(0, 4));
        $('#events').innerHTML = list.length ? list.map((e) => {
          const d = new Date(e.date);
          const media = f === 'video' ? e.media.filter((m) => m.type === 'video') : e.media;
          const nP = e.media.filter((m) => m.type === 'image').length, nV = e.media.length - nP;
          return `<section class="event reveal" id="${e.id}">
            <div class="event-head">
              <div class="event-date"><b>${String(d.getDate()).padStart(2, '0')}</b>${d.toLocaleString('en', { month: 'long' })} ${d.getFullYear()}</div>
              <div><h2>${esc(e.title)}</h2>
                <div class="event-meta"><span>${icon('pin')}${esc(e.location)}</span><span>${icon('folder')}${esc(e.category)}</span></div>
                <p style="max-width:720px;margin:0">${esc(e.description)}</p></div>
              <span class="count-pill">${nP} photo${nP === 1 ? '' : 's'}${nV ? ` · ${nV} video${nV === 1 ? '' : 's'}` : ''}</span>
            </div>
            <div class="media-grid">${media.map((m, i) => `
              <button class="m" data-ev="${e.id}" data-i="${e.media.indexOf(m)}" aria-label="Open ${esc(m.caption || 'media')}">
                <img src="${src(m.type === 'video' ? (m.poster || 'assets/video/field-highlights.jpg') : m.src)}" alt="${esc(m.caption || '')}" loading="lazy">
                ${m.type === 'video' ? `<span class="type">Video</span><span class="vbadge"><span>${icon('play')}</span></span>` : ''}
                <span class="mcap">${esc(m.caption || '')}</span>
              </button>`).join('')}</div>
          </section>`;
        }).join('') : '<div class="empty">No events match this filter yet.</div>';
        reveal();
      };
      fb.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', fb).forEach((c) => c.classList.toggle('active', c === b)); draw(b.dataset.f); });
      $('#events').addEventListener('click', (e) => {
        const b = e.target.closest('.m'); if (!b) return;
        const ev = events.find((x) => x.id === b.dataset.ev);
        lightbox.open(ev.media, Number(b.dataset.i));
      });
      draw('all');
    },

    blog() {
      const posts = published();
      const cats = {};
      posts.forEach((p) => { cats[p.category] = (cats[p.category] || 0) + 1; });
      let cat = new URLSearchParams(location.search).get('cat') || '', q = '';
      const catList = $('#cats');
      const drawCats = () => {
        catList.innerHTML = `<li data-c="" class="${!cat ? 'active' : ''}"><span>All articles</span><span>${posts.length}</span></li>` +
          Object.entries(cats).map(([c, n]) => `<li data-c="${esc(c)}" class="${cat === c ? 'active' : ''}"><span>${esc(c)}</span><span>${n}</span></li>`).join('');
      };
      const draw = () => {
        const list = posts.filter((p) => (!cat || p.category === cat) && (!q || (p.title + p.excerpt + p.body).toLowerCase().includes(q)));
        $('#postList').innerHTML = list.length ? list.map(postCard).join('') : '<div class="empty" style="grid-column:1/-1">No articles found.</div>';
        drawCats(); reveal();
      };
      catList.addEventListener('click', (e) => { const li = e.target.closest('li'); if (!li) return; cat = li.dataset.c; draw(); });
      $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); q = $('#q').value.trim().toLowerCase(); draw(); });
      $('#recent').innerHTML = posts.slice(0, 4).map((p) => `<li><a href="post.html?slug=${p.slug}">${esc(p.title)}</a></li>`).join('');
      draw();
    },

    post() {
      const slug = new URLSearchParams(location.search).get('slug');
      const p = VS.db.posts.find((x) => x.slug === slug && x.status === 'published');
      const el = $('#article');
      if (!p) { el.innerHTML = '<div class="empty">This article could not be found. <a class="link-arrow" href="blog.html">Back to blog</a></div>'; return; }
      document.title = p.title + ' — Verde-Scope Africa';
      $('#postTitle').textContent = p.title;
      $('.page-head').style.backgroundImage = `url('${src(p.image)}')`;
      el.innerHTML = `<img class="hero-img" src="${src(p.image)}" alt="">
        <div class="meta"><span>${esc(VS.fmtDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</span><span>${esc(p.author)}</span><a class="tag" href="blog.html?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a></div>
        <div class="content">${VS.md(p.body)}</div>
        <div class="cta" style="margin-top:50px"><div><h2>Have a similar project?</h2><p>Talk to our experts about your requirements.</p></div><a class="btn" href="contact.html">Contact us ${icon('arrowR')}</a></div>`;
      $('#morePosts').innerHTML = published().filter((x) => x.id !== p.id).slice(0, 3).map(postCard).join('');
    },

    contact() {
      const sel = $('#service');
      sel.innerHTML = '<option value="">Select a service…</option>' + VS.db.services.map((s) => `<option>${esc(s.title)}</option>`).join('') + '<option>General inquiry</option>';
      const pre = new URLSearchParams(location.search).get('service');
      if (pre) sel.value = pre;
      $('#cPhone').innerHTML = `<a href="tel:${S.phone1.replace(/\s/g, '')}">${esc(S.phone1)}</a><br><a href="tel:${S.phone2.replace(/\s/g, '')}">${esc(S.phone2)}</a>`;
      $('#cMail').innerHTML = `<a href="mailto:${esc(S.publicEmail)}">${esc(S.publicEmail)}</a>`;
      $('#cAddr').textContent = S.address;
      $('#contactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target));
        if (!f.name || !f.email || !f.message) return;
        VS.submitInquiry(f);
        e.target.reset();
        const n = $('#sent'); n.classList.add('show');
        n.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
  };

  // ---------- Lightbox ----------
  const lightbox = (() => {
    let items = [], i = 0, el;
    const yt = (u) => { const m = String(u).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/); return m && m[1]; };
    const render = () => {
      const m = items[i];
      let media;
      if (m.type === 'video') {
        const id = yt(m.src);
        media = id ? `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
                   : `<video src="${src(m.src)}" controls autoplay playsinline ${m.poster ? `poster="${src(m.poster)}"` : ''}></video>`;
      } else media = `<img src="${src(m.src)}" alt="${esc(m.caption || '')}">`;
      $('figure', el).innerHTML = media + `<figcaption>${esc(m.caption || '')}${m.credit ? `<small>Photo: ${esc(m.credit)}</small>` : ''}<small>${i + 1} / ${items.length}</small></figcaption>`;
      $('.lb-prev', el).style.display = $('.lb-next', el).style.display = items.length > 1 ? '' : 'none';
    };
    const close = () => { el.classList.remove('open'); $('figure', el).innerHTML = ''; document.body.style.overflow = ''; };
    const build = () => {
      el = document.createElement('div');
      el.className = 'lightbox'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      el.innerHTML = `<button class="lb-btn lb-close" aria-label="Close">${icon('close')}</button><button class="lb-btn lb-prev" aria-label="Previous">${icon('arrowL')}</button><figure></figure><button class="lb-btn lb-next" aria-label="Next">${icon('arrowR')}</button>`;
      document.body.append(el);
      $('.lb-close', el).onclick = close;
      $('.lb-prev', el).onclick = () => { i = (i - 1 + items.length) % items.length; render(); };
      $('.lb-next', el).onclick = () => { i = (i + 1) % items.length; render(); };
      el.addEventListener('click', (e) => { if (e.target === el) close(); });
      document.addEventListener('keydown', (e) => {
        if (!el.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight') $('.lb-next', el).click();
        if (e.key === 'ArrowLeft') $('.lb-prev', el).click();
      });
    };
    return { open(list, idx) { if (!el) build(); items = list; i = idx || 0; render(); el.classList.add('open'); document.body.style.overflow = 'hidden'; } };
  })();

  // ---------- Boot ----------
  if (S.maintenance && page !== 'contact') {
    document.body.insertAdjacentHTML('afterbegin', '<div style="position:fixed;top:0;left:0;right:0;z-index:60;background:#7cb82f;color:#0a120d;text-align:center;font-size:13px;padding:6px">Site in maintenance mode — some content may be updating.</div>');
  }
  header();
  footer();
  pages[page]?.();
  reveal();
  VS.trackView(page);
})();

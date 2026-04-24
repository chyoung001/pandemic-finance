/* =========================================================================
   Pandemic Finance — App JS
   - Renders index (hero timeline + event cards)
   - Renders event detail (scrollytelling w/ IntersectionObserver)
   - Handles Tweaks (mode / palette / transition)
   - Routes via hash: #/ (index), #/event/<id>
   ========================================================================= */

(function () {
  'use strict';

  const EVENTS = window.PF_EVENTS || [];
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ------- Category mapping (의도적 시각 대비를 위한 4분류) -------
  // 빨강 = 거시/물가/지정학 위기 · 파랑 = 통화정책
  // 초록 = 보건/실물 · 노랑 = 대체자산
  const EVENT_CATEGORY = {
    e01: 'monetary', // COVID + Fed 무제한 QE
    e02: 'crisis',   // WTI 마이너스 유가
    e03: 'health',   // 화이자 백신
    eA:  'alt',      // Coinbase 직상장
    e04: 'crisis',   // 인플레이션 × BTC (macro/inflation)
    e05: 'crisis',   // 러-우 전쟁
    e06: 'monetary', // Fed 긴축 사이클
    e07: 'alt',      // FTX 파산
  };
  const CAT_VAR = (cat) => `var(--cat-${cat})`;
  const CATEGORY_META = [
    { id: 'crisis',   label: '거시 / 물가 / 지정학', hint: '위기' },
    { id: 'monetary', label: '통화정책',            hint: 'Fed' },
    { id: 'health',   label: '보건 / 실물',         hint: '백신' },
    { id: 'alt',      label: '대체자산',            hint: '크립토' },
  ];

  // Keep old severity fallback for cards that reference --node-color
  const categoryFor = (e) => EVENT_CATEGORY[e.id] || 'crisis';

  // ------- Positioning on timeline (month index from Jan 2020) -------
  const monthIndex = (dateStr) => {
    // "2020.03", "2022~23", "2021.11"
    const m = dateStr.match(/(\d{4})\.?(\d{1,2})?/);
    if (!m) return 0;
    const y = parseInt(m[1], 10), mo = parseInt(m[2] || '6', 10);
    return (y - 2020) * 12 + (mo - 1);
  };
  // Extended range: Jan 2020 → May 2023 (40 months)
  const TL_START = 0;
  const TL_END = 40;

  // =========================================================================
  // TIMELINE SVG BUILDER — 미니멀 타임라인 (수평선 + 연도 틱 + 이벤트 노드)
  // =========================================================================
  function buildTimelineChart(trackEl) {
    const W = 1000, H = 110;
    const M = { t: 36, r: 24, b: 28, l: 24 };
    const pw = W - M.l - M.r;
    const axisY = M.t + (H - M.t - M.b) / 2;

    const xOf = (mi) => M.l + (mi / TL_END) * pw;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('tl-svg');

    // ----- 1) 가로 축선 -----
    const axis = document.createElementNS(SVG_NS, 'line');
    axis.classList.add('tl-axis');
    axis.setAttribute('x1', M.l);
    axis.setAttribute('x2', M.l + pw);
    axis.setAttribute('y1', axisY);
    axis.setAttribute('y2', axisY);
    svg.appendChild(axis);

    // ----- 2) 연도 틱 + 라벨 -----
    [2020, 2021, 2022, 2023].forEach((y) => {
      const mi = (y - 2020) * 12;
      const x = xOf(mi);
      const tick = document.createElementNS(SVG_NS, 'line');
      tick.classList.add('tl-year-tick');
      tick.setAttribute('x1', x);
      tick.setAttribute('x2', x);
      tick.setAttribute('y1', axisY - 6);
      tick.setAttribute('y2', axisY + 6);
      svg.appendChild(tick);

      const lbl = document.createElementNS(SVG_NS, 'text');
      lbl.classList.add('tl-year-label');
      lbl.textContent = String(y);
      lbl.setAttribute('x', x);
      lbl.setAttribute('y', H - 6);
      lbl.setAttribute('text-anchor', 'middle');
      svg.appendChild(lbl);
    });

    // ----- 3) 이벤트 노드 (축선 위 중앙) -----
    const nodeG = document.createElementNS(SVG_NS, 'g');
    EVENTS.forEach((e) => {
      const mi = Math.min(TL_END, Math.max(0, monthIndex(e.date)));
      const cx = xOf(mi);
      const cy = axisY;
      const cat = categoryFor(e);

      const a = document.createElementNS(SVG_NS, 'a');
      a.setAttribute('href', `#/event/${e.id}`);
      a.classList.add('tl-node');
      a.dataset.id = e.id;
      a.dataset.category = cat;
      if (e.sidebar) a.dataset.side = 'true';
      a.style.setProperty('--cat-color', CAT_VAR(cat));
      a.setAttribute('aria-label', `${e.date} — ${e.title}`);

      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.classList.add('halo');
      halo.setAttribute('cx', cx); halo.setAttribute('cy', cy); halo.setAttribute('r', 14);
      a.appendChild(halo);

      const outer = document.createElementNS(SVG_NS, 'circle');
      outer.classList.add('outer');
      outer.setAttribute('cx', cx); outer.setAttribute('cy', cy); outer.setAttribute('r', 7);
      a.appendChild(outer);

      const inner = document.createElementNS(SVG_NS, 'circle');
      inner.classList.add('inner');
      inner.setAttribute('cx', cx); inner.setAttribute('cy', cy); inner.setAttribute('r', 3.5);
      a.appendChild(inner);

      // 번호 라벨 (노드 위)
      const lbl = document.createElementNS(SVG_NS, 'text');
      lbl.classList.add('tl-node-label');
      lbl.textContent = e.sidebar ? `Side ${e.number}` : `No.${e.number}`;
      lbl.setAttribute('x', cx);
      lbl.setAttribute('y', cy - 14);
      a.appendChild(lbl);

      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = `${e.date} — ${e.title} (${e.keyFigure})`;
      a.appendChild(title);

      nodeG.appendChild(a);
    });
    svg.appendChild(nodeG);

    trackEl.innerHTML = '';
    trackEl.appendChild(svg);
  }

  // =========================================================================
  // INDEX PAGE
  // =========================================================================
  function renderIndex() {
    // Timeline — 미니멀 SVG 타임라인 + 연도별 카드
    const tlWrap = $('#timeline-viz');
    if (tlWrap) {
      const trackEl = $('.timeline-track', tlWrap);
      const cardsLayer = $('.timeline-cards', tlWrap);

      if (trackEl) buildTimelineChart(trackEl);

      // Cards: 3 year columns (2020/2021/2022) — sidebar & e06(2022~23) fit in col 2
      cardsLayer.innerHTML = '';
      const cols = [0, 1, 2].map(() => {
        const col = document.createElement('div');
        col.className = 'tl-card-col';
        cardsLayer.appendChild(col);
        return col;
      });

      const yearCol = (dateStr) => {
        const m = dateStr.match(/(\d{4})/);
        const y = m ? parseInt(m[1], 10) : 2020;
        return Math.max(0, Math.min(2, y - 2020));
      };

      EVENTS.forEach((e) => {
        const cat = categoryFor(e);

        // Card in its year column — now uses category color
        const card = document.createElement('a');
        card.className = 'tl-card';
        card.href = `#/event/${e.id}`;
        card.style.setProperty('--node-color', CAT_VAR(cat));
        card.innerHTML = `
          <div class="tl-card-row">
            <span class="sev"></span>
            <span>${e.date}</span>
            <span class="sep">·</span>
            <span>${e.sidebar ? 'Side ' + e.number : 'No. ' + e.number}</span>
          </div>
          <div class="tl-card-title">${e.title}</div>
          <div class="tl-card-fig">${e.keyFigure}</div>
        `;
        cols[yearCol(e.date)].appendChild(card);
      });
    }

    // Event cards
    const grid = $('#events-grid');
    if (grid) {
      EVENTS.forEach((e, i) => {
        const a = document.createElement('a');
        a.className = 'event-card' + (i === 0 ? ' featured' : '') + (e.sidebar ? ' side' : '');
        a.href = `#/event/${e.id}`;
        const cat = categoryFor(e);
        a.style.setProperty('--node-color', CAT_VAR(cat));

        // 썸네일: 메인은 step{N}.png, 사이드는 side{N}.png (e.number 기반)
        //   e01 → step1 · e03 → step2 · ... · e07 → step6
        //   e02 (Side 1) → side1 · eA (Side 2) → side2
        const thumbBase = e.sidebar ? 'side' : 'step';
        const thumbNum = parseInt(e.number, 10);
        const thumbUrl = e.heroImage || `image/${thumbBase}${thumbNum}.png`;
        a.innerHTML = `
          <figure class="event-thumb">
            <span class="event-number-pill${e.sidebar ? ' side' : ''}"><span class="dot-sev"></span>${e.sidebar ? 'Side ' : 'No. '}${e.number}</span>
            <img src="${thumbUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy" />
            <div class="thumb-placeholder" style="display:none;">
              <span class="ph-label">image/${thumbBase}${thumbNum}.png</span>
            </div>
          </figure>
          <div class="event-body">
            <div class="event-meta-row">
              <span>${e.date}</span>
              <span class="sep">·</span>
              <span>${e.phases.length + 1} frames</span>
            </div>
            <h3 class="event-title">${e.title}</h3>
            <p class="event-subtitle">${e.subtitle}</p>
            <div class="event-key">
              <span class="event-key-label">${e.keyLabel}</span>
              <span class="event-key-figure">${e.keyFigure}</span>
            </div>
          </div>
        `;
        // Wire placeholder fallback AFTER insertion (img onload timing)
        grid.appendChild(a);
        const img = $('img', a);
        const ph = $('.thumb-placeholder', a);
        // If image is already broken (cached), trigger placeholder
        setTimeout(() => {
          if (img && !img.complete) return;
          if (img && img.naturalWidth === 0) {
            img.style.display = 'none';
            ph.style.display = 'flex';
          }
        }, 150);
      });
    }
  }

  // =========================================================================
  // EVENT DETAIL PAGE
  // =========================================================================
  function renderEventDetail(eventId) {
    const e = EVENTS.find(x => x.id === eventId);
    if (!e) { location.hash = '#/'; return; }

    document.body.classList.add('event-detail-visible');
    $('#index-view').style.display = 'none';
    $('#event-view').style.display = 'block';

    // Set accent for this event (카테고리 기반)
    const cat = categoryFor(e);
    document.documentElement.style.setProperty('--node-color', CAT_VAR(cat));

    // Prev/next event lookup (for outro pager)
    const evIdx = EVENTS.findIndex(x => x.id === eventId);
    const prevEv = evIdx > 0 ? EVENTS[evIdx - 1] : null;
    const nextEv = evIdx < EVENTS.length - 1 ? EVENTS[evIdx + 1] : null;
    const catMeta = CATEGORY_META.find(c => c.id === cat);

    const root = $('#event-view');
    root.innerHTML = `
      <div class="progress-bar"><div class="progress-bar-fill"></div></div>
      <nav class="event-nav" id="event-nav"></nav>

      <article class="event-detail">
        <!-- HERO: 마스트헤드만 (대표 이미지 제거) -->
        <header class="event-hero">
          <div class="event-hero-inner">
            <div class="event-dateline">
              <a href="#/" class="back-link">← 인덱스</a>
              <span class="sev-dot"></span>
              <span>${e.sidebar ? `Side ${e.number} · 사이드 이벤트` : `Event ${e.number} of 06`}</span>
              <span>·</span>
              <span>${e.date}</span>
            </div>

            <div class="event-masthead">
              <div class="event-no">${e.number}</div>
              <h1>${e.title}</h1>
              <p class="sub">${e.subtitle}</p>
              ${e.comic ? `<div class="event-actions">
                <a class="btn-comic" href="#/comic/${e.id}">
                  <span>보기</span>
                  <span class="arrow">→</span>
                </a>
              </div>` : ''}
              <dl class="event-stats">
                <div class="stat">
                  <dt>Key Figure</dt>
                  <dd>${e.keyFigure}</dd>
                </div>
                <div class="stat">
                  <dt>Label</dt>
                  <dd class="sans">${e.keyLabel}</dd>
                </div>
                <div class="stat">
                  <dt>Category</dt>
                  <dd class="sans"><span class="cat-pill" style="--cat-color: ${CAT_VAR(cat)};">${catMeta ? catMeta.label : cat}</span></dd>
                </div>
                <div class="stat">
                  <dt>Frames</dt>
                  <dd>${String(e.phases.length + 1).padStart(2, '0')}</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <!-- TOC: 페이즈 점프 네비게이션 -->
        <nav class="event-toc" aria-label="국면 네비게이션" id="event-toc"></nav>

        <section class="scrolly" aria-label="Scrollytelling">
          <div class="scrolly-narrative" id="scrolly-narrative"></div>
          <aside class="scrolly-sticky">
            <div class="sticky-frame" id="sticky-frame"></div>
          </aside>
        </section>

        <!-- 아웃로: 데이터 소스 + 이전/다음 이벤트 페이저 -->
        <footer class="event-outro" aria-label="사건 마무리">
          <div class="event-outro-inner">
            <div class="event-sources">
              <div class="label">Data sources</div>
              <ul>
                <li><span class="src-k">FRED</span> <span class="src-v">Federal Reserve Economic Data — SP500, VIX, WALCL, DCOILWTICO, CPIAUCSL</span></li>
                <li><span class="src-k">Yahoo Finance</span> <span class="src-v">주식 · ETF · 암호화폐 일간 OHLCV</span></li>
                <li><span class="src-k">Methodology</span> <span class="src-v">Python + matplotlib 프리렌더링 · Korean editorial tone</span></li>
              </ul>
            </div>
            <nav class="event-pager" aria-label="사건 이동">
              ${prevEv ? `<a href="#/event/${prevEv.id}" class="pager prev">
                <div class="pager-label">← Previous</div>
                <div class="pager-no">No. ${prevEv.number} · ${prevEv.date}</div>
                <div class="pager-title">${prevEv.title}</div>
              </a>` : '<span class="pager placeholder" aria-hidden="true"></span>'}
              <a href="#/" class="pager home" aria-label="인덱스로 돌아가기">
                <div class="pager-label">Index</div>
                <div class="pager-home-glyph">⌂</div>
              </a>
              ${nextEv ? `<a href="#/event/${nextEv.id}" class="pager next">
                <div class="pager-label">Next →</div>
                <div class="pager-no">No. ${nextEv.number} · ${nextEv.date}</div>
                <div class="pager-title">${nextEv.title}</div>
              </a>` : '<span class="pager placeholder" aria-hidden="true"></span>'}
            </nav>
          </div>
        </footer>
      </article>
    `;

    // --- Build phase TOC ---
    const tocEl = $('#event-toc', root);
    const tocItems = [...e.phases, { id: 'summary', frame: e.summary.frame, title: 'Summary' }];
    tocItems.forEach((p, i) => {
      const a = document.createElement('a');
      a.className = 'event-toc-item';
      if (i === 0) a.classList.add('is-active');
      a.href = `#phase-${i}`;
      a.dataset.index = String(i);
      const lbl = p.id === 'prologue' ? 'Prologue'
                : p.id === 'summary'  ? 'Summary'
                : `Act ${i}`;
      a.innerHTML = `
        <span class="toc-num">${String(i).padStart(2, '0')}</span>
        <span class="toc-label">${lbl}</span>
      `;
      // Prevent native jump that bypasses scroll-margin on some browsers; smooth-scroll to id.
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const tgt = document.getElementById(`phase-${i}`);
        if (tgt) tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      tocEl.appendChild(a);
    });

    // --- Populate narrative ---
    const narrative = $('#scrolly-narrative', root);
    const phases = e.phases.slice();
    phases.forEach((p, i) => {
      const section = document.createElement('section');
      section.className = 'scrolly-phase';
      section.id = `phase-${i}`;
      if (i === 0) section.classList.add('is-active');
      section.dataset.frame = p.frame;
      section.dataset.index = i;
      section.innerHTML = `
        <div class="phase-label">${p.id === 'prologue' ? 'Prologue' : `Act ${i}`}</div>
        <h3>${p.title.replace(/^(Prologue|Act \d+)\s*—\s*/, '')}</h3>
        ${p.narrative.map(para => `<p>${highlightFigures(para)}</p>`).join('')}
      `;
      narrative.appendChild(section);
    });
    // Summary — 제목을 이벤트별 동적 라벨로 (기존 "37일의 요약" 하드코딩 해결)
    const sumIdx = phases.length;
    const sumSection = document.createElement('section');
    sumSection.className = 'scrolly-phase scrolly-summary';
    sumSection.id = `phase-${sumIdx}`;
    sumSection.dataset.frame = e.summary.frame;
    sumSection.dataset.index = sumIdx;
    // summary.image 가 있으면 이미지로, 없으면 기존 텍스트 문단으로 렌더
    const summaryBody = e.summary.image
      ? `<figure class="summary-image">
           <img class="zoomable" src="${e.summary.image}" alt="${e.summary.imageAlt || e.title + ' 요약'}"
                loading="lazy"
                onerror="this.closest('figure').classList.add('is-missing');" />
         </figure>`
      : `<p>${highlightFigures(e.summary.text || '')}</p>`;
    sumSection.innerHTML = `
      <div class="phase-label">Summary</div>
      <h3>요약 — ${e.title}</h3>
      ${summaryBody}
    `;
    narrative.appendChild(sumSection);

    // --- Sticky frame layers ---
    const stickyFrame = $('#sticky-frame', root);
    const allPhases = [...phases, { id: 'summary', frame: e.summary.frame, title: 'Summary' }];
    allPhases.forEach((p, i) => {
      const layer = document.createElement('div');
      layer.className = 'frame-layer';
      if (i === 0) layer.classList.add('is-visible');
      layer.dataset.frame = p.frame;
      layer.innerHTML = `
        <img class="zoomable" src="data/figures/${e.folder}/${p.frame}.png" alt="${e.title} — ${p.title || p.frame}"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="frame-placeholder" style="display:none;">
          <span class="frame-id">Frame ${String(i).padStart(2, '0')}</span>
          <span class="frame-title">${p.title || p.frame}</span>
          <span class="frame-path">data/figures/${e.folder}/${p.frame}.png</span>
        </div>
      `;
      stickyFrame.appendChild(layer);
    });

    // --- Floating 8-event nav ---
    const evNav = $('#event-nav', root);
    EVENTS.forEach(ev => {
      const a = document.createElement('a');
      a.href = `#/event/${ev.id}`;
      a.textContent = ev.sidebar ? `S${ev.number}` : ev.number;
      if (ev.id === e.id) a.classList.add('is-current');
      a.title = `${ev.date} — ${ev.title}`;
      evNav.appendChild(a);
    });

    // Hook up scrollytelling
    initScrollytelling(root);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // 만화 전용 페이지 — data/comics/<id>.json 을 읽어 블록별로 렌더
  function renderComicPage(eventId) {
    const e = EVENTS.find(x => x.id === eventId);
    if (!e) { location.hash = '#/'; return; }

    document.body.classList.add('event-detail-visible');
    $('#index-view').style.display = 'none';
    $('#event-view').style.display = 'block';

    const cat = categoryFor(e);
    document.documentElement.style.setProperty('--node-color', CAT_VAR(cat));

    const root = $('#event-view');
    root.innerHTML = `
      <article class="event-detail event-detail--comic">
        <header class="event-hero">
          <div class="event-hero-inner">
            <div class="event-dateline">
              <a href="#/event/${e.id}" class="back-link">← ${e.title}로 돌아가기</a>
              <span class="sev-dot"></span>
              <span>Comic</span>
              <span>·</span>
              <span>${e.date}</span>
            </div>
            <div class="event-masthead">
              <div class="event-no">${e.number}</div>
              <h1 id="comic-title">${e.title} — 만화</h1>
              <p class="sub" id="comic-subtitle">${e.subtitle}</p>
            </div>
          </div>
        </header>

        <section class="comic-body">
          <div class="comic-body-inner" id="comic-blocks">
            <div class="comic-loading">불러오는 중…</div>
          </div>
        </section>

        <footer class="event-outro" aria-label="사건 마무리">
          <div class="event-outro-inner">
            <nav class="event-pager" aria-label="사건 이동">
              <a href="#/event/${e.id}" class="pager prev">
                <div class="pager-label">← 기사 페이지</div>
                <div class="pager-title">${e.title}</div>
              </a>
              <a href="#/" class="pager home" aria-label="인덱스로 돌아가기">
                <div class="pager-label">Index</div>
                <div class="pager-home-glyph">⌂</div>
              </a>
              <span class="pager placeholder" aria-hidden="true"></span>
            </nav>
          </div>
        </footer>
      </article>
    `;

    window.scrollTo({ top: 0, behavior: 'instant' });

    const container = $('#comic-blocks');
    const imgBase = `image/comics/${e.id}/`;
    const data = (window.PF_COMICS || {})[e.id];

    if (!data) {
      container.innerHTML = `
        <div class="comic-placeholder">
          <div class="comic-eyebrow">편집 가이드</div>
          <h2>만화 데이터가 아직 없어요</h2>
          <p><code>web/data/comics.js</code> 에서 <code>PF_COMICS.${e.id}</code> 를 추가해 주세요.</p>
          <p class="comic-hint">이미지는 <code>web/image/comics/${e.id}/</code> 폴더에 넣고, <code>src</code>에는 파일명만 적습니다.</p>
        </div>
      `;
      return;
    }

    if (data.title) $('#comic-title').textContent = data.title;
    if (data.subtitle) $('#comic-subtitle').textContent = data.subtitle;
    const blocks = Array.isArray(data.blocks) ? data.blocks : [];
    if (!blocks.length) {
      container.innerHTML = `<div class="comic-placeholder"><p>아직 등록된 블록이 없습니다. <code>data/comics.js</code>의 <code>${e.id}.blocks</code> 배열에 블록을 추가해 주세요.</p></div>`;
      return;
    }
    container.innerHTML = '';
    blocks.forEach(b => container.appendChild(renderComicBlock(b, imgBase)));
  }

  function renderComicBlock(block, imgBase) {
    const el = document.createElement('div');
    const type = (block && block.type) || 'text';
    el.className = `comic-block comic-block--${type}`;
    if (type === 'image') {
      let src = '';
      if (block.src) {
        if (/^(https?:|data:|\/)/.test(block.src)) {
          src = block.src;
        } else {
          // index.html 이 있는 곳을 기준으로 절대 해석되도록 ./ 접두
          src = './' + imgBase + block.src;
        }
      }
      el.innerHTML = `
        <figure class="comic-figure">
          <img class="zoomable" src="${src}" alt="${block.alt || ''}" loading="lazy"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="comic-img-missing" style="display:none;">
            <span>이미지 없음</span>
            <code>${src}</code>
          </div>
          ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
        </figure>
      `;
    } else if (type === 'heading') {
      el.innerHTML = `<h2 class="comic-heading">${escapeHtml(block.body || '')}</h2>`;
    } else if (type === 'quote') {
      el.innerHTML = `<blockquote class="comic-quote">${escapeHtml(block.body || '')}</blockquote>`;
    } else {
      const paragraphs = String(block.body || '').split(/\n\s*\n/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('');
      el.innerHTML = `<div class="comic-text">${paragraphs}</div>`;
    }
    return el;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Highlight numeric/financial figures in body copy with .mono class
  function highlightFigures(text) {
    // Wrap sequences like $37.63, −$37.63, 82.69, 6.2%, $67,566, 5.00%, 475bp, 0.25%, 2,237, VIX 82.69
    return text.replace(
      /(−?\$[\d,]+(?:\.\d+)?|[\d,]+\.?\d*%|[\d,]+bp|VIX\s+[\d.]+|BTC\s+\$[\d,.]+|[\d]{2,4}\.\d{2})/g,
      '<span class="mono">$1</span>'
    );
  }

  // =========================================================================
  // SCROLLYTELLING: activate phase when centered, swap sticky frame
  // =========================================================================
  function initScrollytelling(root) {
    const phaseSections = $$('.scrolly-phase', root);
    const frameLayers = $$('.frame-layer', root);
    const tocItems = $$('.event-toc-item', root);
    const progressFill = $('.progress-bar-fill', root);
    const tocEl = $('#event-toc', root);
    const narrative = $('#scrolly-narrative', root);

    if (!phaseSections.length) return;

    const setActive = (idx) => {
      phaseSections.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      const targetFrame = phaseSections[idx]?.dataset.frame;
      frameLayers.forEach(l => l.classList.toggle('is-visible', l.dataset.frame === targetFrame));
      // TOC 활성 아이템 동기화 + 가로 스크롤로 포커스 아이템 가시화
      tocItems.forEach((t, i) => t.classList.toggle('is-active', i === idx));
      if (tocEl && tocItems[idx]) {
        const item = tocItems[idx];
        const tocRect = tocEl.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        if (itemRect.left < tocRect.left + 8 || itemRect.right > tocRect.right - 8) {
          tocEl.scrollTo({
            left: item.offsetLeft - tocRect.width / 2 + itemRect.width / 2,
            behavior: 'smooth'
          });
        }
      }
      // progress
      if (progressFill) {
        progressFill.style.width = `${((idx + 1) / phaseSections.length) * 100}%`;
      }
    };

    // Track which phase is closest to viewport center
    let ticking = false;
    let currentIdx = 0;
    const update = () => {
      const center = window.innerHeight / 2;
      let best = 0, bestDist = Infinity;
      phaseSections.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (best !== currentIdx) {
        currentIdx = best;
        setActive(best);
      }

      // Parallax: translate frame layers based on scroll offset of active section
      const activeSection = phaseSections[currentIdx];
      if (activeSection) {
        const r = activeSection.getBoundingClientRect();
        const progress = (r.top + r.height / 2 - center) / window.innerHeight;
        const parallaxPx = progress * -30;
        frameLayers.forEach(l => l.style.setProperty('--parallax', `${parallaxPx}px`));
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  // =========================================================================
  // ROUTER
  // =========================================================================
  function route() {
    const hash = location.hash || '#/';
    const mComic = hash.match(/^#\/comic\/([a-zA-Z0-9]+)/);
    const m = hash.match(/^#\/event\/([a-zA-Z0-9]+)/);
    if (mComic) {
      renderComicPage(mComic[1]);
    } else if (m) {
      renderEventDetail(m[1]);
    } else {
      // index
      document.body.classList.remove('event-detail-visible');
      $('#index-view').style.display = 'block';
      $('#event-view').style.display = 'none';
        document.documentElement.style.removeProperty('--node-color');
      // one-shot render (only first load)
      if (!$('#events-grid').hasChildNodes()) renderIndex();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // =========================================================================
  // TWEAKS
  // =========================================================================
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "mode": "light",
    "palette": "editorial",
    "transition": "parallax"
  }/*EDITMODE-END*/;

  const tweaksState = Object.assign({}, TWEAK_DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem('pf-tweaks') || '{}');
    Object.assign(tweaksState, saved);
  } catch (e) { /* noop */ }

  function applyTweaks() {
    document.documentElement.setAttribute('data-mode', tweaksState.mode);
    document.documentElement.setAttribute('data-palette', tweaksState.palette);
    document.documentElement.setAttribute('data-transition', tweaksState.transition);
    localStorage.setItem('pf-tweaks', JSON.stringify(tweaksState));
    // Update UI
    $$('.tweaks-panel [data-tweak]').forEach(btn => {
      const key = btn.dataset.tweak, val = btn.dataset.val;
      btn.classList.toggle('is-active', tweaksState[key] === val);
    });
  }

  function setupTweaksPanel() {
    const panel = $('.tweaks-panel');
    if (!panel) return;

    // Masthead mode toggle (always visible, not gated by Tweaks)
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        // If terminal palette is active, reset to default + light; otherwise just flip mode
        if (tweaksState.palette === 'terminal') {
          tweaksState.palette = 'default';
          tweaksState.mode = 'light';
        } else {
          tweaksState.mode = tweaksState.mode === 'dark' ? 'light' : 'dark';
        }
        applyTweaks();
        try {
          window.parent.postMessage({
            type: '__edit_mode_set_keys',
            edits: { ...tweaksState }
          }, '*');
        } catch (e) { /* noop */ }
      });
    }

    $$('.tweaks-panel [data-tweak]').forEach(btn => {
      btn.addEventListener('click', () => {
        tweaksState[btn.dataset.tweak] = btn.dataset.val;
        applyTweaks();
        // Persist to host (editmode)
        try {
          window.parent.postMessage({
            type: '__edit_mode_set_keys',
            edits: { ...tweaksState }
          }, '*');
        } catch (e) { /* noop */ }
      });
    });

    // Edit-mode protocol
    window.addEventListener('message', (ev) => {
      if (!ev.data || typeof ev.data !== 'object') return;
      if (ev.data.type === '__activate_edit_mode') {
        panel.classList.add('is-open');
      } else if (ev.data.type === '__deactivate_edit_mode') {
        panel.classList.remove('is-open');
      }
    });
    // Announce after listener is attached
    try {
      window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    } catch (e) { /* noop */ }
  }

  // =========================================================================
  // LIGHTBOX — `img.zoomable` 클릭 시 전체 화면 오버레이로 확대
  // =========================================================================
  function initLightbox() {
    if (document.getElementById('lightbox')) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.id = 'lightbox';
    box.setAttribute('aria-hidden', 'true');
    box.setAttribute('role', 'dialog');
    box.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="닫기">×</button>
      <img class="lightbox-img" alt="" />
    `;
    document.body.appendChild(box);

    const imgEl = box.querySelector('.lightbox-img');
    const closeBtn = box.querySelector('.lightbox-close');

    function open(src, alt) {
      imgEl.src = src;
      imgEl.alt = alt || '';
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.addEventListener('click', (ev) => {
      const target = ev.target.closest('img.zoomable');
      if (target && !box.contains(target)) {
        ev.preventDefault();
        open(target.currentSrc || target.src, target.alt);
      }
    });
    box.addEventListener('click', close);
    closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); close(); });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }

  // =========================================================================
  // BOOT
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    applyTweaks();
    setupTweaksPanel();
    initLightbox();
    route();
    window.addEventListener('hashchange', route);
  });
})();

(function () {
    'use strict';

    const LOVE_START = new Date('2025-11-22');
    const TILE_PALETTE = ['#b7c6ad', '#a7bcc9', '#c3b7d2', '#d4c2a2', '#e3bcbf', '#e6dcc6', '#c9d2bd'];
    const CITY_NAMES = {
        shanghai: '上海', beijing: '北京', taizhou: '台州', zhangjiakou: '张家口',
        dalian: '大连', yantai: '烟台', jiujiang: '九江', shenzhen: '深圳', xianggang: '香港'
    };
    const VIDEO_RE = /\.(mp4|mov|webm|m4v|avi)$/i;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    let photos = [];          // { name, dateKey, month }
    let tiles = [];           // { el, photo, rot, ring:{x,y}, heart:{x,y}, active }
    let gather = 0;           // 0 = 年轮散落, 1 = 汇成爱心
    let activeMonth = 'all';
    let stageW = 0, stageH = 0;

    const stage = document.getElementById('stage');
    const stageWrap = document.querySelector('.stage-wrap');

    // ---------- 小工具 ----------
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function loveDays() {
        const now = new Date();
        return Math.max(0, Math.floor((now - LOVE_START) / 86400000));
    }

    // ---------- 加载照片 ----------
    async function loadPhotos() {
        try {
            const res = await fetch('images/image_list.json?ts=' + Date.now());
            const list = await res.json();
            if (!Array.isArray(list)) return;
            photos = list
                .filter((name) => !VIDEO_RE.test(name) && /^\d{4}-\d{2}-\d{2}/.test(name))
                .map((name) => ({ name, dateKey: name.slice(0, 10), month: name.slice(0, 7) }));
            // 按时间升序：最早的在年轮内圈
            photos.sort((a, b) => (a.name < b.name ? -1 : 1));
        } catch (e) {
            console.error('加载照片失败', e);
        }
    }

    // ---------- 建立瓦片 ----------
    function buildTiles() {
        const rng = mulberry32(20261024);
        const frag = document.createDocumentFragment();
        tiles = photos.map((photo, i) => {
            const el = document.createElement('button');
            el.className = 'tile';
            el.type = 'button';
            el.style.setProperty('--tile-color', TILE_PALETTE[i % TILE_PALETTE.length]);
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = '';
            img.src = 'images/thumbs/' + photo.name;
            img.dataset.step = '0';
            img.addEventListener('error', function () {
                if (this.dataset.step === '0') { this.dataset.step = '1'; this.src = 'images/' + photo.name; }
                else { this.style.display = 'none'; }
            });
            el.appendChild(img);
            el.addEventListener('click', () => openStory(photo));
            frag.appendChild(el);
            return { el, photo, rot: (rng() * 16 - 8), ring: { x: 0, y: 0 }, heart: { x: 0, y: 0 }, active: true };
        });
        stage.appendChild(frag);
    }

    // ---------- 计算两种形态的位置（只针对当前可见的瓦片）----------
    function heartPoints(n) {
        // 心形隐式：(x^2+y^2-1)^3 - x^2*y^3 <= 0 （y 向上）
        const rng = mulberry32(777);
        const pts = [];
        let guard = 0;
        while (pts.length < n && guard < n * 400) {
            guard++;
            const x = rng() * 2.6 - 1.3;
            const y = rng() * 2.5 - 1.35;
            const a = x * x + y * y - 1;
            if (a * a * a - x * x * y * y * y <= 0) pts.push({ x, y });
        }
        // 从上到下、从中间向外，morph 时更自然
        pts.sort((p, q) => (q.y - p.y) || (p.x - q.x));
        return pts;
    }

    function computeLayout() {
        const actives = tiles.filter((t) => t.active);
        const n = actives.length;
        if (!n) return;
        const maxR = Math.min(stageW, stageH) * 0.46;
        const rMin = n > 60 ? 0.14 : 0.05;

        // 年轮（时间螺旋）
        actives.forEach((t, i) => {
            const angle = i * GOLDEN;
            const rNorm = rMin + (1 - rMin) * Math.sqrt(i / n);
            const R = rNorm * maxR;
            t.ring.x = Math.cos(angle) * R;
            t.ring.y = Math.sin(angle) * R * 0.92;
        });

        // 爱心
        const hs = Math.min(stageW, stageH) * 0.4;
        const pts = heartPoints(n);
        const yOffset = hs * 0.12;
        actives.forEach((t, i) => {
            const p = pts[i] || { x: 0, y: 0 };
            t.heart.x = p.x * hs;
            t.heart.y = -p.y * hs + yOffset;
        });
    }

    function tileSize() {
        const base = Math.min(stageW, stageH) / 24;
        return Math.max(15, Math.min(30, base));
    }

    function applyLayout(animated) {
        const size = tileSize();
        tiles.forEach((t) => {
            t.el.style.transition = animated ? '' : 'none';
            if (!t.active) {
                t.el.style.opacity = '0';
                t.el.style.pointerEvents = 'none';
                t.el.style.transform = 'translate(-50%, -50%) scale(0.2)';
                return;
            }
            t.el.style.opacity = '';
            t.el.style.pointerEvents = '';
            t.el.style.width = size + 'px';
            t.el.style.height = size + 'px';
            const x = lerp(t.ring.x, t.heart.x, gather);
            const y = lerp(t.ring.y, t.heart.y, gather);
            const rot = lerp(t.rot, t.rot * 0.4, gather);
            t.el.style.transform =
                'translate(calc(-50% + ' + x.toFixed(1) + 'px), calc(-50% + ' + y.toFixed(1) + 'px)) rotate(' + rot.toFixed(1) + 'deg)';
        });
    }

    // ---------- 聚散 / 模式 ----------
    const gatherInput = document.getElementById('gather');
    const gatherVal = document.getElementById('gatherVal');
    const stageCaption = document.getElementById('stageCaption');
    const stageEn = document.getElementById('stageEn');
    const modeButtons = document.querySelectorAll('#modeToggle button');

    function refreshCaption() {
        if (gather >= 0.5) {
            stageCaption.textContent = '散落的这一年，原来都是你。';
            stageEn.textContent = 'OUR FIRST YEAR, THE FIRST OF MANY';
        } else {
            stageCaption.textContent = '日子，一圈一圈，长成我们。';
            stageEn.textContent = 'ALL OUR DAYS · 岁月年轮';
        }
        modeButtons.forEach((b) => b.classList.toggle('active',
            (b.dataset.mode === 'heart') === (gather >= 0.5)));
    }

    function setGather(v, animated) {
        gather = Math.max(0, Math.min(1, v));
        gatherInput.value = Math.round(gather * 100);
        gatherVal.textContent = Math.round(gather * 100) + '%';
        refreshCaption();
        applyLayout(animated);
    }

    gatherInput.addEventListener('input', () => setGather(gatherInput.value / 100, false));
    modeButtons.forEach((b) => b.addEventListener('click', () => setGather(b.dataset.mode === 'heart' ? 1 : 0, true)));

    // 在舞台上滚动 → 聚散（滚到尽头再放行页面滚动）
    stageWrap.addEventListener('wheel', (e) => {
        const next = gather + (e.deltaY > 0 ? 0.08 : -0.08);
        if ((gather < 1 && e.deltaY > 0) || (gather > 0 && e.deltaY < 0)) {
            e.preventDefault();
            setGather(next, false);
        }
    }, { passive: false });

    // ---------- 月份筛选 ----------
    function buildMonthTabs() {
        const tabs = document.getElementById('monthTabs');
        const counts = {};
        photos.forEach((p) => { counts[p.month] = (counts[p.month] || 0) + 1; });
        const months = Object.keys(counts).sort();
        const mk = (key, label, cnt) => {
            const btn = document.createElement('button');
            btn.dataset.month = key;
            btn.innerHTML = label + '<span class="cnt">' + cnt + '</span>';
            if (key === activeMonth) btn.classList.add('active');
            btn.addEventListener('click', () => selectMonth(key));
            return btn;
        };
        tabs.appendChild(mk('all', '全部', photos.length));
        months.forEach((m) => {
            const [y, mo] = m.split('-');
            tabs.appendChild(mk(m, y + '.' + mo, counts[m]));
        });
    }

    function selectMonth(key) {
        activeMonth = key;
        document.querySelectorAll('#monthTabs button').forEach((b) =>
            b.classList.toggle('active', b.dataset.month === key));
        tiles.forEach((t) => { t.active = (key === 'all' || t.photo.month === key); });
        computeLayout();
        applyLayout(true);
    }

    // ---------- 某一天的故事 ----------
    function storyForDate(dateKey) {
        const data = window.timelineData || [];
        let exact = data.find((it) => it.dateKey === dateKey);
        if (exact) return exact;
        let best = null;
        data.forEach((it) => {
            if (!it.dateKey || it.dateKey.startsWith('3030')) return;
            if (it.dateKey <= dateKey && (!best || it.dateKey > best.dateKey)) best = it;
        });
        return best;
    }

    const storyOverlay = document.getElementById('storyOverlay');
    function openStory(photo) {
        const story = storyForDate(photo.dateKey);
        document.getElementById('storyPhoto').src = 'images/' + photo.name;
        const d = photo.dateKey.split('-');
        document.getElementById('storyDate').textContent = d[0] + '.' + d[1] + '.' + d[2];
        const cityKey = story && story.city;
        const cityEl = document.getElementById('storyCity');
        cityEl.textContent = cityKey && CITY_NAMES[cityKey] ? CITY_NAMES[cityKey] : '';
        cityEl.style.display = cityEl.textContent ? '' : 'none';
        document.getElementById('storyTitle').textContent = story ? story.title : '我们的一天';
        let desc = story ? story.description : '这一天没有写字，但它也在我们的年轮里。';
        if (/^https?:\/\//.test(desc)) desc = '这一天，我们做了一页小小的网页。';
        document.getElementById('storyDesc').textContent = desc;
        storyOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }
    function closeStory() { storyOverlay.hidden = true; document.body.style.overflow = ''; }
    document.getElementById('storyClose').addEventListener('click', closeStory);
    storyOverlay.addEventListener('click', (e) => { if (e.target === storyOverlay) closeStory(); });

    // ---------- 信 ----------
    const letterOverlay = document.getElementById('letterOverlay');
    function openLetter() {
        letterOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }
    function closeLetter() { letterOverlay.hidden = true; document.body.style.overflow = ''; }
    document.getElementById('openLetter').addEventListener('click', openLetter);
    document.getElementById('letterClose').addEventListener('click', closeLetter);
    document.getElementById('letterOk').addEventListener('click', closeLetter);
    letterOverlay.addEventListener('click', (e) => { if (e.target === letterOverlay) closeLetter(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeLetter(); closeStory(); }
    });

    // ---------- 开场 ----------
    function enterAtlas() {
        document.body.classList.remove('is-opening');
        document.getElementById('atlas').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function jumpToAtlas() {
        document.getElementById('opening').style.display = 'none';
        document.body.classList.remove('is-opening');
        window.scrollTo(0, 0);
    }
    document.getElementById('enterBtn').addEventListener('click', enterAtlas);
    document.getElementById('skipOpening').addEventListener('click', enterAtlas);

    // ---------- 飘动爱心 ----------
    function buildHearts() {
        const field = document.getElementById('heartsField');
        const rng = mulberry32(42);
        for (let i = 0; i < 24; i++) {
            const h = document.createElement('span');
            h.className = 'float-heart';
            h.textContent = '♥';
            h.style.left = (rng() * 100) + '%';
            h.style.fontSize = (9 + rng() * 14) + 'px';
            h.style.animationDuration = (11 + rng() * 12) + 's';
            h.style.animationDelay = (-rng() * 18) + 's';
            h.style.opacity = (0.3 + rng() * 0.4).toFixed(2);
            field.appendChild(h);
        }
    }

    // ---------- 尺寸 ----------
    function measure() {
        const r = stageWrap.getBoundingClientRect();
        stageW = r.width;
        stageH = r.height;
    }
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            measure();
            computeLayout();
            applyLayout(false);
        }, 150);
    });

    // ---------- 启动 ----------
    async function init() {
        buildHearts();
        const days = loveDays();
        document.getElementById('loveDays').textContent = days;
        const now = new Date();
        document.getElementById('letterDate').textContent =
            now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');

        await loadPhotos();
        document.getElementById('photoCount').textContent = photos.length;
        buildTiles();
        buildMonthTabs();
        measure();
        computeLayout();
        applyLayout(false);
        refreshCaption();
        if (location.hash === '#atlas' || location.hash === '#heart') jumpToAtlas();
        if (location.hash === '#heart') setGather(1, false);
        // 入场微动：一拍后从中心轻轻展开
        requestAnimationFrame(() => requestAnimationFrame(() => applyLayout(true)));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

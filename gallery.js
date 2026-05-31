(function () {
    const CONFIG = {
        START_DATE: new Date('2025-11-22T00:00:00'),
        PHOTOS_PER_MODE: 50,
        MODE_AUTO_INTERVAL: 35000,
        TRANSITION_DURATION: 1200,
        MODES: ['heart', 'mosaic', 'carousel', 'orbit', 'spiral', 'waterfall', 'globe']
    };

    const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
    let imageList = [];
    let photoElements = [];
    let currentMode = 0;
    let autoRotateTimer = null;
    let focusedIndex = -1;

    // Carousel state
    let carouselIndex = 0;
    let carouselAutoTimer = null;
    let carouselPauseTimer = null;

    // Orbit state
    let orbitAnimId = null;
    let orbitOffset = 0;
    let orbitPaused = false;
    let orbitDragging = false;
    let orbitDragStartX = 0;
    let orbitDragStartOffset = 0;

    // Spiral state
    let spiralAnimId = null;
    let spiralOffset = 0;
    let spiralSpeed = 0.003;

    // Waterfall state
    let waterfallAnimId = null;
    let waterfallOffsets = [];
    let waterfallPaused = false;
    let waterfallSpeed = 0.4;

    // Globe state
    let globeAnimId = null;
    let globeRotX = 0.4;
    let globeRotY = 2.88;
    let globeZoom = 1.0;
    let globeDragging = false;
    let globeDragStartX = 0;
    let globeDragStartY = 0;
    let globeDragStartRotX = 0;
    let globeDragStartRotY = 0;
    let globeAutoRot = 0;
    let globeTime = 0;

    // Transition state
    let isTransitioning = false;

    const lyrics = [
        { sub: '来时路的终点', main: '是和你遇见' },
        { sub: '唯有你让那誓言', main: '浸过时间' },
        { sub: '我心里却', main: '非苦似甜' },
        { sub: '我们的故事', main: '比星光还要温柔' },
        { sub: '你是我所有的小星星', main: '汇成银河的秘密' },
        { sub: '时光如水', main: '有你便是诗' },
        { sub: '遇见你的那一刻', main: '星星都失去了颜色' },
        { sub: '余生很长', main: '我想和你在一起浪费时光' },
        { sub: '春风十里', main: '不如你' },
        { sub: '你是我的今天', main: '也是我所有的明天' },
    ];

    // Globe data references (resolved at init time)
    let _globeTC = null;
    let _globeWC = null;
    let _globeCB = null;
    let _globeCountries = null;

    // ===== INIT =====
    async function init() {
        await loadImageList();
        createPhotoElements();
        startTimer();
        initParticles();
        initLyrics();
        initBars();
        // Resolve globe data from global scope
        _globeTC = window.TRAVEL_CITIES || (typeof TRAVEL_CITIES !== 'undefined' ? TRAVEL_CITIES : {});
        _globeWC = (typeof WORLD_CITIES !== 'undefined') ? WORLD_CITIES : [];
        _globeCB = (typeof COUNTRY_BORDERS !== 'undefined') ? COUNTRY_BORDERS : [];
        _globeCountries = (typeof COUNTRIES !== 'undefined') ? COUNTRIES : [];
        applyLayout('heart');
        startAutoRotate();
        bindEvents();
    }

    // ===== IMAGE LOADING =====
    async function loadImageList() {
        try {
            const res = await fetch(`images/image_list.json?ts=${Date.now()}`);
            const list = await res.json();
            imageList = list.filter(f => {
                const ext = f.slice(f.lastIndexOf('.')).toLowerCase();
                return !VIDEO_EXTENSIONS.includes(ext);
            });
        } catch (e) {
            console.error('Failed to load image_list.json', e);
        }
    }

    function createPhotoElements() {
        const stage = document.getElementById('photoStage');
        const count = Math.min(CONFIG.PHOTOS_PER_MODE, imageList.length);
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'photo-item';
            const img = document.createElement('img');
            img.src = `images/thumbs/${imageList[i]}`;
            img.alt = '';
            img.loading = 'lazy';
            img.onerror = function () {
                this.onerror = null;
                this.src = `images/${imageList[i]}`;
            };
            div.appendChild(img);
            div.dataset.index = i;
            stage.appendChild(div);
            photoElements.push(div);
        }
    }

    // ===== TIMER =====
    function startTimer() {
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const now = new Date();
        const diff = now - CONFIG.START_DATE;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('timerDays').textContent = days;
        document.getElementById('timerHours').textContent = String(hours).padStart(2, '0');
        document.getElementById('timerMinutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('timerSeconds').textContent = String(seconds).padStart(2, '0');
    }

    // ===== LAYOUT MASTER =====
    function stopAllAnimations() {
        if (orbitAnimId) { cancelAnimationFrame(orbitAnimId); orbitAnimId = null; }
        if (spiralAnimId) { cancelAnimationFrame(spiralAnimId); spiralAnimId = null; }
        if (waterfallAnimId) { cancelAnimationFrame(waterfallAnimId); waterfallAnimId = null; }
        if (carouselAutoTimer) { clearInterval(carouselAutoTimer); carouselAutoTimer = null; }
        if (carouselPauseTimer) { clearTimeout(carouselPauseTimer); carouselPauseTimer = null; }
        stopGlobe();
        photoElements.forEach(el => el.classList.remove('no-transition', 'carousel-center'));
        orbitPaused = false;
        orbitDragging = false;
        waterfallPaused = false;
    }

    function applyLayout(mode) {
        clearFocus();
        stopAllAnimations();
        const stage = document.getElementById('photoStage');
        stage.style.transform = 'none';
        stage.classList.remove('heart-breathe');

        switch (mode) {
            case 'heart': layoutHeart(); break;
            case 'mosaic': layoutMosaic(); break;
            case 'carousel': layoutCarousel(); break;
            case 'orbit': layoutOrbit(); break;
            case 'spiral': layoutSpiral(); break;
            case 'waterfall': layoutWaterfall(); break;
            case 'globe': layoutGlobe(); break;
        }
    }

    // ===== MODE 1: HEART =====
    function heartX(t) { return 16 * Math.pow(Math.sin(t), 3); }
    function heartY(t) { return -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); }

    function layoutHeart() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w / 2;
        const cy = h / 2;
        const count = photoElements.length;
        const scaleFactor = Math.min(w, h) / 52;

        photoElements.forEach((el, i) => {
            const t = (2 * Math.PI * i / count) - Math.PI / 2;
            const hx = heartX(t) * scaleFactor;
            const hy = heartY(t) * scaleFactor;
            const x = cx + hx;
            const y = cy + hy;
            const distFromCenter = Math.sqrt(hx * hx + hy * hy) / (16 * scaleFactor);
            const size = 80 + (1 - distFromCenter) * 40;
            const scale = 0.7 + (1 - distFromCenter) * 0.4;
            const rotation = (Math.random() - 0.5) * 8;

            el.style.width = size + 'px';
            el.style.height = size + 'px';
            el.style.left = (x - size / 2) + 'px';
            el.style.top = (y - size / 2) + 'px';
            el.style.transform = `rotate(${rotation}deg) scale(${scale})`;
            el.style.opacity = String(0.7 + (1 - distFromCenter) * 0.3);
            el.style.zIndex = Math.round((1 - distFromCenter) * 20);
        });

        const stage = document.getElementById('photoStage');
        stage.classList.add('heart-breathe');
    }

    // ===== MODE 2: MOSAIC =====
    let mosaicMoveHandler = null;

    function layoutMosaic() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const padding = 70;
        const gap = 5;
        const availW = w - padding * 2;
        const availH = h - padding * 2;
        const count = photoElements.length;

        const cols = Math.ceil(Math.sqrt(count * (availW / availH)));
        const rows = Math.ceil(count / cols);
        const cellW = (availW - gap * (cols - 1)) / cols;
        const cellH = (availH - gap * (rows - 1)) / rows;
        const size = Math.min(cellW, cellH, 105);

        const totalW = cols * size + (cols - 1) * gap;
        const totalH = rows * size + (rows - 1) * gap;
        const offsetX = (w - totalW) / 2;
        const offsetY = (h - totalH) / 2;

        const stage = document.getElementById('photoStage');
        stage.style.perspective = '1200px';

        photoElements.forEach((el, i) => {
            el.classList.remove('dimmed', 'focused');
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = offsetX + col * (size + gap);
            const y = offsetY + row * (size + gap);

            el.style.width = size + 'px';
            el.style.height = size + 'px';
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.transform = 'scale(1)';
            el.style.opacity = '1';
            el.style.zIndex = '1';
        });

        if (mosaicMoveHandler) document.removeEventListener('mousemove', mosaicMoveHandler);
        mosaicMoveHandler = (e) => {
            if (CONFIG.MODES[currentMode] !== 'mosaic' || focusedIndex >= 0) return;
            const rx = ((e.clientY / h) - 0.5) * 4;
            const ry = ((e.clientX / w) - 0.5) * -4;
            stage.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        };
        document.addEventListener('mousemove', mosaicMoveHandler);
    }

    // ===== MODE 3: CAROUSEL =====
    function layoutCarousel(skipAutoStart) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w / 2;
        const cy = h / 2;
        const spacing = 175;
        const baseSize = 250;

        carouselIndex = Math.max(0, Math.min(carouselIndex, photoElements.length - 1));

        photoElements.forEach((el, i) => {
            el.classList.remove('dimmed', 'focused', 'carousel-center');
            const offset = i - carouselIndex;
            const absOffset = Math.abs(offset);

            if (absOffset > 6) {
                el.style.width = baseSize + 'px';
                el.style.height = baseSize + 'px';
                el.style.left = (cx - baseSize / 2 + offset * spacing) + 'px';
                el.style.top = (cy - baseSize / 2) + 'px';
                el.style.opacity = '0';
                el.style.transform = 'scale(0.3)';
                el.style.zIndex = '0';
            } else {
                const scale = 1 / (1 + absOffset * 0.28);
                const opacity = Math.max(0.25, 1 - absOffset * 0.15);
                const xPos = cx - baseSize / 2 + offset * spacing;
                const yPos = cy - baseSize / 2;

                el.style.width = baseSize + 'px';
                el.style.height = baseSize + 'px';
                el.style.left = xPos + 'px';
                el.style.top = yPos + 'px';
                el.style.transform = `scale(${scale})`;
                el.style.opacity = String(opacity);
                el.style.zIndex = String(100 - absOffset);

                if (absOffset === 0) {
                    el.classList.add('carousel-center');
                }
            }
        });

        if (!skipAutoStart) startCarouselAuto();
    }

    function startCarouselAuto() {
        if (carouselAutoTimer) clearInterval(carouselAutoTimer);
        carouselAutoTimer = setInterval(() => {
            if (CONFIG.MODES[currentMode] !== 'carousel') return;
            carouselIndex = (carouselIndex + 1) % photoElements.length;
            layoutCarousel(true);
        }, 4000);
    }

    function pauseCarouselAuto() {
        if (carouselAutoTimer) { clearInterval(carouselAutoTimer); carouselAutoTimer = null; }
        if (carouselPauseTimer) clearTimeout(carouselPauseTimer);
        carouselPauseTimer = setTimeout(() => {
            if (CONFIG.MODES[currentMode] === 'carousel') startCarouselAuto();
        }, 5000);
    }

    // ===== MODE 4: ORBIT =====
    function layoutOrbit() {
        orbitOffset = orbitOffset || 0;
        positionOrbit(orbitOffset);
        startOrbitAnimation();
    }

    function positionOrbit(rotOffset) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w / 2;
        const cy = h / 2;
        const radiusX = w * 0.37;
        const radiusY = h * 0.2;
        const count = photoElements.length;
        const size = 90;

        photoElements.forEach((el, i) => {
            const theta = (2 * Math.PI * i / count) + rotOffset;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);
            const x = cx + cosT * radiusX;
            const y = cy + sinT * radiusY;
            const normalizedZ = (sinT + 1) / 2;
            const scale = 0.3 + normalizedZ * 1.05;
            const opacity = 0.2 + normalizedZ * 0.8;
            const zIndex = Math.round(normalizedZ * 100);

            el.style.width = size + 'px';
            el.style.height = size + 'px';
            el.style.left = (x - size / 2) + 'px';
            el.style.top = (y - size / 2) + 'px';
            el.style.transform = `scale(${scale})`;
            el.style.opacity = String(opacity);
            el.style.zIndex = String(zIndex);

            if (normalizedZ > 0.92) {
                el.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.3), 0 8px 25px rgba(0,0,0,0.5)';
            } else {
                el.style.boxShadow = '';
            }
        });
    }

    function startOrbitAnimation() {
        setTimeout(() => {
            if (CONFIG.MODES[currentMode] !== 'orbit') return;
            photoElements.forEach(el => el.classList.add('no-transition'));
            function animate() {
                if (!orbitPaused && !orbitDragging) {
                    orbitOffset += 0.002;
                }
                positionOrbit(orbitOffset);
                orbitAnimId = requestAnimationFrame(animate);
            }
            orbitAnimId = requestAnimationFrame(animate);
        }, 850);
    }

    // ===== MODE 5: SPIRAL =====
    function layoutSpiral() {
        spiralOffset = spiralOffset || 0;
        positionSpiral(spiralOffset);
        startSpiralAnimation();
    }

    function positionSpiral(rotOffset) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w / 2;
        const cy = h / 2;
        const count = photoElements.length;
        const maxRadius = Math.min(w, h) * 0.42;
        const size = 80;

        photoElements.forEach((el, i) => {
            const progress = i / count;
            const theta = progress * Math.PI * 6 + rotOffset;
            const r = progress * maxRadius;
            const x = cx + Math.cos(theta) * r;
            const y = cy + Math.sin(theta) * r;
            const scale = Math.max(0.4, 1.2 - progress * 0.8);
            const opacity = Math.max(0.3, 1 - progress * 0.6);

            el.style.width = size + 'px';
            el.style.height = size + 'px';
            el.style.left = (x - size / 2) + 'px';
            el.style.top = (y - size / 2) + 'px';
            el.style.transform = `scale(${scale})`;
            el.style.opacity = String(opacity);
            el.style.zIndex = String(Math.round((1 - progress) * 50));
        });
    }

    function startSpiralAnimation() {
        setTimeout(() => {
            if (CONFIG.MODES[currentMode] !== 'spiral') return;
            photoElements.forEach(el => el.classList.add('no-transition'));
            function animate() {
                spiralOffset += spiralSpeed;
                positionSpiral(spiralOffset);
                spiralAnimId = requestAnimationFrame(animate);
            }
            spiralAnimId = requestAnimationFrame(animate);
        }, 850);
    }

    // ===== MODE 6: WATERFALL =====
    function layoutWaterfall() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cols = 6;
        const colWidth = w / cols;
        const size = colWidth - 12;
        const count = photoElements.length;

        waterfallOffsets = [];

        photoElements.forEach((el, i) => {
            el.classList.remove('no-transition');
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = col * colWidth + (colWidth - size) / 2;
            const baseY = row * (size + 10) - h * 0.1;
            waterfallOffsets[i] = baseY;

            el.style.width = size + 'px';
            el.style.height = size + 'px';
            el.style.left = x + 'px';
            el.style.top = baseY + 'px';
            el.style.transform = 'scale(1)';
            el.style.opacity = '1';
            el.style.zIndex = '1';
        });

        setTimeout(() => {
            photoElements.forEach(el => el.classList.add('no-transition'));
            if (CONFIG.MODES[currentMode] === 'waterfall') {
                startWaterfallAnimation();
            }
        }, 850);
    }

    function startWaterfallAnimation() {
        const h = window.innerHeight;
        const cols = 6;
        const w = window.innerWidth;
        const colWidth = w / cols;
        const size = colWidth - 12;
        const totalRows = Math.ceil(photoElements.length / cols);
        const totalHeight = totalRows * (size + 10);

        function animate() {
            if (!waterfallPaused) {
                photoElements.forEach((el, i) => {
                    waterfallOffsets[i] += waterfallSpeed;
                    let y = waterfallOffsets[i];

                    if (y > h + size) {
                        waterfallOffsets[i] = -size - Math.random() * 100;
                        y = waterfallOffsets[i];
                    }

                    el.style.top = y + 'px';

                    if (y < 0) {
                        el.style.opacity = String(Math.max(0, 1 + y / size));
                    } else if (y > h - size) {
                        el.style.opacity = String(Math.max(0, (h - y) / size));
                    } else {
                        el.style.opacity = '1';
                    }
                });
            }
            waterfallAnimId = requestAnimationFrame(animate);
        }
        waterfallAnimId = requestAnimationFrame(animate);
    }

    // ===== MODE 7: GLOBE =====
    function resolveGlobeData() {
        // Try multiple sources for timelineData
        var td = null;
        if (window.timelineData) td = window.timelineData;
        else if (typeof timelineData !== 'undefined') td = timelineData;

        if (td && td.length > 0 && Object.keys(_globeTC).length === 0) {
            var map = {};
            for (var i = 0; i < td.length; i++) {
                var item = td[i];
                if (!item.city) continue;
                if (!map[item.city]) map[item.city] = { events: [] };
                map[item.city].events.push({ dateKey: item.dateKey, title: item.title });
            }
            _globeTC = map;
        }

        // Fallback: if still empty, hardcode from known data
        if (Object.keys(_globeTC).length === 0) {
            _globeTC = {
                'shanghai': { events: [{dateKey:'2025-11-14',title:'我们在上海'},{dateKey:'2025-12-08',title:'我们在上海'},{dateKey:'2025-12-20',title:'我们在上海'},{dateKey:'2026-01-30',title:'我们在上海'},{dateKey:'2026-02-28',title:'结束异地'},{dateKey:'2026-04-01',title:'一起玩了很多'},{dateKey:'2026-04-06',title:'迪士尼'},{dateKey:'2026-04-29',title:'四月小结'},{dateKey:'2026-05-20',title:'第一次520'},{dateKey:'2026-05-24',title:'小猪咪来了'}] },
                'beijing': { events: [{dateKey:'2025-11-22',title:'正式在一起'},{dateKey:'2026-02-06',title:'我们在北京'},{dateKey:'2026-02-24',title:'我们在北京'},{dateKey:'2026-05-09',title:'博士毕业'}] },
                'zhangjiakou': { events: [{dateKey:'2026-02-12',title:'河北张家口'}] },
                'taizhou': { events: [{dateKey:'2025-12-29',title:'第一次旅行'},{dateKey:'2026-01-01',title:'新年约定'}] },
                'dalian': { events: [{dateKey:'2026-04-30',title:'大连旅游'}] },
                'yantai': { events: [{dateKey:'2026-05-04',title:'烟台旅游'}] },
            };
        }

        if (_globeWC.length === 0 && typeof WORLD_CITIES !== 'undefined') _globeWC = WORLD_CITIES;
        if (_globeCB.length === 0 && typeof COUNTRY_BORDERS !== 'undefined') _globeCB = COUNTRY_BORDERS;
        if (_globeCountries.length === 0 && typeof COUNTRIES !== 'undefined') _globeCountries = COUNTRIES;
    }

    function layoutGlobe() {
        resolveGlobeData();
        photoElements.forEach(el => {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
        });
        const gc = document.getElementById('globeCanvas');
        gc.width = window.innerWidth * devicePixelRatio;
        gc.height = window.innerHeight * devicePixelRatio;
        gc.style.width = window.innerWidth + 'px';
        gc.style.height = window.innerHeight + 'px';
        startGlobeAnimation();
        requestAnimationFrame(() => {
            gc.classList.add('active');
        });
    }

    function stopGlobe() {
        if (globeAnimId) { cancelAnimationFrame(globeAnimId); globeAnimId = null; }
        const gc = document.getElementById('globeCanvas');
        gc.classList.remove('active');
        const popup = document.getElementById('globePopup');
        popup.classList.remove('visible');
        photoElements.forEach(el => { el.style.pointerEvents = ''; });
    }

    function latLngToScreen(lat, lng, rotX, rotY, radius, cx, cy) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lng + 180) * Math.PI / 180;
        let x = radius * Math.sin(phi) * Math.cos(theta);
        let y = radius * Math.cos(phi);
        let z = radius * Math.sin(phi) * Math.sin(theta);
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const x2 = x * cosY - z * sinY;
        const z2 = x * sinY + z * cosY;
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        const y2 = y * cosX - z2 * sinX;
        const z3 = y * sinX + z2 * cosX;
        return { sx: cx - x2, sy: cy - y2, visible: z3 > 0, depth: z3 };
    }

    function drawSmoothPolygon(gctx, screenPts) {
        let started = false;
        const visible = screenPts.filter(p => p.visible);
        if (visible.length < 3) return false;

        gctx.beginPath();
        for (let i = 0; i < screenPts.length; i++) {
            const p = screenPts[i];
            if (p.visible) {
                if (!started) {
                    gctx.moveTo(p.sx, p.sy);
                    started = true;
                } else {
                    const prev = screenPts[i - 1];
                    if (prev && prev.visible) {
                        const midX = (prev.sx + p.sx) / 2;
                        const midY = (prev.sy + p.sy) / 2;
                        gctx.quadraticCurveTo(prev.sx, prev.sy, midX, midY);
                    } else {
                        gctx.moveTo(p.sx, p.sy);
                    }
                }
            } else {
                started = false;
            }
        }
        if (visible.length > 2) {
            const last = visible[visible.length - 1];
            gctx.lineTo(last.sx, last.sy);
        }
        gctx.closePath();
        return true;
    }

    function renderCountryPolygon(gctx, points, rotX, rotY, radius, cx, cy, isHighlight) {
        let anyVisible = false;
        const screenPts = points.map(pt => {
            const p = latLngToScreen(pt[0], pt[1], rotX, rotY, radius, cx, cy);
            if (p.visible) anyVisible = true;
            return p;
        });
        if (!anyVisible) return;

        if (drawSmoothPolygon(gctx, screenPts)) {
            if (isHighlight) {
                const centerX = screenPts.reduce((s, p) => s + p.sx, 0) / screenPts.length;
                const centerY = screenPts.reduce((s, p) => s + p.sy, 0) / screenPts.length;
                const grad = gctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.6);
                grad.addColorStop(0, 'rgba(200, 80, 60, 0.32)');
                grad.addColorStop(0.6, 'rgba(180, 60, 50, 0.22)');
                grad.addColorStop(1, 'rgba(150, 40, 40, 0.12)');
                gctx.fillStyle = grad;
                gctx.strokeStyle = 'rgba(255, 180, 100, 0.7)';
                gctx.lineWidth = 1.5;
                gctx.shadowColor = 'rgba(255, 180, 100, 0.3)';
                gctx.shadowBlur = 4;
            } else {
                gctx.fillStyle = 'rgba(60, 130, 90, 0.2)';
                gctx.strokeStyle = 'rgba(80, 170, 110, 0.35)';
                gctx.lineWidth = 0.7;
                gctx.shadowBlur = 0;
            }
            gctx.fill();
            gctx.stroke();
            gctx.shadowBlur = 0;
        }
    }

    function startGlobeAnimation() {
        const gc = document.getElementById('globeCanvas');
        const gctx = gc.getContext('2d');

        function tick() {
            globeTime++;

            const w = window.innerWidth;
            const h = window.innerHeight;
            gctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            gctx.clearRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h / 2;
            const baseRadius = Math.min(w, h) * 0.32;
            const radius = baseRadius * globeZoom;

            // Multi-layer atmosphere glow
            const breathe = 1 + 0.02 * Math.sin(globeTime * 0.015);
            for (let layer = 0; layer < 3; layer++) {
                const innerR = radius * (0.95 + layer * 0.05);
                const outerR = radius * (1.15 + layer * 0.08) * breathe;
                const atmoGrad = gctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
                const alpha = 0.06 - layer * 0.015;
                atmoGrad.addColorStop(0, `rgba(80, 160, 255, ${alpha})`);
                atmoGrad.addColorStop(0.6, `rgba(60, 140, 230, ${alpha * 0.4})`);
                atmoGrad.addColorStop(1, 'rgba(60, 140, 230, 0)');
                gctx.fillStyle = atmoGrad;
                gctx.beginPath();
                gctx.arc(cx, cy, outerR, 0, Math.PI * 2);
                gctx.fill();
            }

            // Globe body with deeper ocean gradient
            gctx.save();
            gctx.beginPath();
            gctx.arc(cx, cy, radius, 0, Math.PI * 2);
            const bodyGrad = gctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
            bodyGrad.addColorStop(0, '#1e4a6e');
            bodyGrad.addColorStop(0.4, '#123552');
            bodyGrad.addColorStop(0.8, '#0a2238');
            bodyGrad.addColorStop(1, '#051525');
            gctx.fillStyle = bodyGrad;
            gctx.fill();
            gctx.restore();

            // Clip to globe
            gctx.save();
            gctx.beginPath();
            gctx.arc(cx, cy, radius, 0, Math.PI * 2);
            gctx.clip();

            // Subtle ocean wave rings
            const waveCount = 5;
            for (let wi = 0; wi < waveCount; wi++) {
                const phase = (globeTime * 0.003 + wi * 0.2) % 1;
                const waveR = radius * (0.2 + phase * 0.8);
                const waveAlpha = 0.025 * (1 - phase);
                gctx.beginPath();
                gctx.arc(cx, cy, waveR, 0, Math.PI * 2);
                gctx.strokeStyle = `rgba(80, 160, 220, ${waveAlpha})`;
                gctx.lineWidth = 0.5;
                gctx.stroke();
            }

            // Grid lines (latitude)
            gctx.strokeStyle = 'rgba(80, 150, 220, 0.08)';
            gctx.lineWidth = 0.5;
            for (let lat = -80; lat <= 80; lat += 20) {
                gctx.beginPath();
                let started = false;
                for (let lng = -180; lng <= 180; lng += 4) {
                    const p = latLngToScreen(lat, lng, globeRotX, globeRotY, radius, cx, cy);
                    if (p.visible) {
                        if (!started) { gctx.moveTo(p.sx, p.sy); started = true; }
                        else gctx.lineTo(p.sx, p.sy);
                    } else { started = false; }
                }
                gctx.stroke();
            }
            // Grid lines (longitude)
            for (let lng = -180; lng < 180; lng += 30) {
                gctx.beginPath();
                let started = false;
                for (let lat = -90; lat <= 90; lat += 4) {
                    const p = latLngToScreen(lat, lng, globeRotX, globeRotY, radius, cx, cy);
                    if (p.visible) {
                        if (!started) { gctx.moveTo(p.sx, p.sy); started = true; }
                        else gctx.lineTo(p.sx, p.sy);
                    } else { started = false; }
                }
                gctx.stroke();
            }

            // Country borders (filled polygons, support multi-polygon)
            if (_globeCB.length > 0) {
                _globeCB.forEach(country => {
                    if (country.type === 'dashed') return;
                    const isHighlight = country.color === 'highlight';

                    if (country.polygons) {
                        country.polygons.forEach(poly => {
                            renderCountryPolygon(gctx, poly, globeRotX, globeRotY, radius, cx, cy, isHighlight);
                        });
                    } else if (country.points) {
                        renderCountryPolygon(gctx, country.points, globeRotX, globeRotY, radius, cx, cy, isHighlight);
                    }
                });
            }

            // Cities (gray dots + labels)
            if (_globeWC.length > 0) {
                const fontSize = Math.max(6, 7 * Math.min(globeZoom, 1.2));
                const labelAlpha = Math.min(0.5, 0.25 + globeZoom * 0.15);
                _globeWC.forEach(city => {
                    const p = latLngToScreen(city.lat, city.lng, globeRotX, globeRotY, radius, cx, cy);
                    if (!p.visible) return;
                    const isTravel = _globeTC && _globeTC[city.nameEn];
                    if (isTravel) return;
                    const size = Math.max(1.2, 1.5 * globeZoom);
                    gctx.beginPath();
                    gctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
                    gctx.fillStyle = 'rgba(160, 180, 200, 0.5)';
                    gctx.fill();
                    if (globeZoom > 0.7) {
                        gctx.font = `${fontSize}px Montserrat, sans-serif`;
                        gctx.fillStyle = `rgba(160, 185, 210, ${labelAlpha})`;
                        gctx.fillText(city.name, p.sx + size + 2, p.sy + 2);
                    }
                });
            }

            // Countries (red dots + labels, fade when zoomed in)
            if (_globeCountries.length > 0) {
                const zoomFade = globeZoom > 1.5 ? Math.max(0, 1 - (globeZoom - 1.5) * 0.5) : 1;
                const fontSize = Math.max(7, 8 * Math.min(globeZoom, 1.2));
                const labelAlpha = Math.min(0.5, 0.3 + globeZoom * 0.12) * zoomFade;
                if (zoomFade > 0.05) {
                    _globeCountries.forEach(country => {
                        const p = latLngToScreen(country.lat, country.lng, globeRotX, globeRotY, radius, cx, cy);
                        if (!p.visible) return;
                        const size = Math.max(1.8, 2.2 * globeZoom) * zoomFade;
                        gctx.beginPath();
                        gctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
                        gctx.fillStyle = `rgba(200, 80, 80, ${0.45 * zoomFade})`;
                        gctx.fill();
                        gctx.font = `bold ${fontSize}px Montserrat, sans-serif`;
                        gctx.fillStyle = `rgba(220, 110, 110, ${labelAlpha})`;
                        gctx.fillText(country.name, p.sx + size + 3, p.sy + 3);
                    });
                }
            }

            // Travel city subtle arc connections
            if (Object.keys(_globeTC).length > 0 && _globeWC.length > 0) {
                const travelKeys = Object.keys(_globeTC);
                const orderedCities = [];
                if (window.timelineData) {
                    const seen = new Set();
                    window.timelineData.forEach(item => {
                        if (item.city && !seen.has(item.city) && travelKeys.includes(item.city)) {
                            seen.add(item.city);
                            orderedCities.push(item.city);
                        }
                    });
                }
                if (orderedCities.length > 1) {
                    gctx.save();
                    gctx.lineWidth = 1;
                    for (let ci = 0; ci < orderedCities.length - 1; ci++) {
                        const cityA = _globeWC.find(c => c.nameEn === orderedCities[ci]);
                        const cityB = _globeWC.find(c => c.nameEn === orderedCities[ci + 1]);
                        if (!cityA || !cityB) continue;
                        const pA = latLngToScreen(cityA.lat, cityA.lng, globeRotX, globeRotY, radius, cx, cy);
                        const pB = latLngToScreen(cityB.lat, cityB.lng, globeRotX, globeRotY, radius, cx, cy);
                        if (!pA.visible || !pB.visible) continue;
                        const midX = (pA.sx + pB.sx) / 2;
                        const midY = (pA.sy + pB.sy) / 2;
                        const dist = Math.hypot(pB.sx - pA.sx, pB.sy - pA.sy);
                        const bulge = dist * 0.15;
                        const nx = -(pB.sy - pA.sy) / dist;
                        const ny = (pB.sx - pA.sx) / dist;
                        const cpX = midX + nx * bulge;
                        const cpY = midY + ny * bulge;
                        gctx.beginPath();
                        gctx.moveTo(pA.sx, pA.sy);
                        gctx.quadraticCurveTo(cpX, cpY, pB.sx, pB.sy);
                        gctx.strokeStyle = 'rgba(255, 215, 100, 0.12)';
                        gctx.stroke();
                    }
                    gctx.restore();
                }

                // Travel cities (gold pulsing + highlighted area + labels)
                travelKeys.forEach(key => {
                    const city = _globeWC.find(c => c.nameEn === key);
                    if (!city) return;
                    const p = latLngToScreen(city.lat, city.lng, globeRotX, globeRotY, radius, cx, cy);
                    if (!p.visible) return;
                    const pulse = 1 + 0.3 * Math.sin(globeTime * 0.05);
                    const dotSize = Math.max(2.5, 3 * globeZoom) * pulse;

                    // Area highlight (soft glow)
                    const areaSize = dotSize * 4;
                    const areaGrad = gctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, areaSize);
                    areaGrad.addColorStop(0, 'rgba(255, 215, 0, 0.2)');
                    areaGrad.addColorStop(0.4, 'rgba(255, 200, 50, 0.08)');
                    areaGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
                    gctx.fillStyle = areaGrad;
                    gctx.beginPath();
                    gctx.arc(p.sx, p.sy, areaSize, 0, Math.PI * 2);
                    gctx.fill();

                    // Outer ring (pulsing)
                    const ringSize = dotSize * 2.5;
                    gctx.beginPath();
                    gctx.arc(p.sx, p.sy, ringSize, 0, Math.PI * 2);
                    gctx.strokeStyle = `rgba(255, 215, 0, ${0.12 + 0.08 * Math.sin(globeTime * 0.04)})`;
                    gctx.lineWidth = 0.8;
                    gctx.stroke();

                    // Core dot
                    gctx.beginPath();
                    gctx.arc(p.sx, p.sy, dotSize, 0, Math.PI * 2);
                    const dotGrad = gctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, dotSize);
                    dotGrad.addColorStop(0, 'rgba(255, 240, 180, 1)');
                    dotGrad.addColorStop(0.7, 'rgba(255, 215, 0, 0.9)');
                    dotGrad.addColorStop(1, 'rgba(255, 180, 0, 0.7)');
                    gctx.fillStyle = dotGrad;
                    gctx.fill();
                    gctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                    gctx.lineWidth = 1;
                    gctx.stroke();

                    // Label
                    const fontSize = Math.max(9, 10 * Math.min(globeZoom, 1.5));
                    gctx.font = `bold ${fontSize}px Montserrat, sans-serif`;
                    gctx.fillStyle = 'rgba(255, 235, 160, 0.95)';
                    gctx.fillText(city.name, p.sx + dotSize + 4, p.sy + 4);

                    // Event count badge
                    const evtCount = _globeTC[key].events.length;
                    if (evtCount > 1) {
                        const badgeX = p.sx + dotSize + 4 + gctx.measureText(city.name).width + 4;
                        gctx.font = `${Math.max(7, 8 * Math.min(globeZoom, 1.3))}px Montserrat, sans-serif`;
                        gctx.fillStyle = 'rgba(255, 180, 100, 0.7)';
                        gctx.fillText(`(${evtCount})`, badgeX, p.sy + 5);
                    }
                });
            }

            gctx.restore();

            // Specular highlight (light reflection on upper-left)
            gctx.save();
            const specX = cx - radius * 0.35;
            const specY = cy - radius * 0.35;
            const specGrad = gctx.createRadialGradient(specX, specY, 0, specX, specY, radius * 0.5);
            specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
            specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
            specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            gctx.beginPath();
            gctx.arc(cx, cy, radius, 0, Math.PI * 2);
            gctx.clip();
            gctx.fillStyle = specGrad;
            gctx.fillRect(0, 0, w, h);
            gctx.restore();

            // Globe edge highlight
            gctx.save();
            gctx.beginPath();
            gctx.arc(cx, cy, radius, 0, Math.PI * 2);
            gctx.strokeStyle = 'rgba(100, 180, 255, 0.2)';
            gctx.lineWidth = 1.5;
            gctx.stroke();
            // Inner edge glow
            gctx.beginPath();
            gctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
            gctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
            gctx.lineWidth = 3;
            gctx.stroke();
            gctx.restore();

            globeAnimId = requestAnimationFrame(tick);
        }
        globeAnimId = requestAnimationFrame(tick);
    }

    function handleGlobeClick(e) {
        if (CONFIG.MODES[currentMode] !== 'globe') return;
        if (globeDragging) return;
        const gc = document.getElementById('globeCanvas');
        const rect = gc.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.32;
        const radius = baseRadius * globeZoom;

        if (!_globeTC || Object.keys(_globeTC).length === 0) return;

        let clicked = null;
        let clickedCity = null;
        Object.keys(_globeTC).forEach(key => {
            const city = _globeWC.find(c => c.nameEn === key);
            if (!city) return;
            const p = latLngToScreen(city.lat, city.lng, globeRotX, globeRotY, radius, cx, cy);
            if (!p.visible) return;
            const dist = Math.hypot(p.sx - mx, p.sy - my);
            if (dist < 15 * globeZoom) {
                clicked = key;
                clickedCity = city;
            }
        });

        const popup = document.getElementById('globePopup');
        if (clicked) {
            const data = _globeTC[clicked];
            let html = `<span class="popup-close">&times;</span>`;
            html += `<div class="popup-city">${clickedCity.name}</div>`;
            data.events.forEach(ev => {
                html += `<div class="popup-event">`;
                html += `<span class="event-date">${ev.dateKey}</span>`;
                html += `<span class="event-title">${ev.title}</span>`;
                html += `<a class="event-link" href="index.html#gallery" data-date="${ev.dateKey}">照片</a>`;
                html += `</div>`;
            });
            popup.innerHTML = html;
            popup.style.left = Math.min(e.clientX + 10, window.innerWidth - 340) + 'px';
            popup.style.top = Math.min(e.clientY - 20, window.innerHeight - 300) + 'px';
            popup.classList.add('visible');
            popup.querySelector('.popup-close').addEventListener('click', () => {
                popup.classList.remove('visible');
            });
        } else {
            popup.classList.remove('visible');
        }
    }

    // ===== MODE SWITCHING =====
    function switchMode(newMode) {
        if (newMode === currentMode || isTransitioning) return;
        stopAutoRotate();
        if (mosaicMoveHandler) {
            document.removeEventListener('mousemove', mosaicMoveHandler);
            mosaicMoveHandler = null;
        }

        isTransitioning = true;
        const oldMode = currentMode;
        currentMode = newMode;
        updateModeTags();

        const oldModeName = CONFIG.MODES[oldMode];
        const newModeName = CONFIG.MODES[currentMode];

        if (oldModeName === 'globe') {
            // Fade out globe canvas, then show new mode
            const gc = document.getElementById('globeCanvas');
            gc.classList.remove('active');
            const popup = document.getElementById('globePopup');
            popup.classList.remove('visible');
            setTimeout(() => {
                if (globeAnimId) { cancelAnimationFrame(globeAnimId); globeAnimId = null; }
                photoElements.forEach(el => { el.style.pointerEvents = ''; });
                applyLayout(newModeName);
                isTransitioning = false;
                startAutoRotate();
            }, 800);
        } else if (newModeName === 'globe') {
            // Fade out photos, then show globe
            photoElements.forEach(el => {
                el.classList.remove('no-transition');
                el.style.opacity = '0';
            });
            setTimeout(() => {
                applyLayout('globe');
                isTransitioning = false;
                startAutoRotate();
            }, 600);
        } else {
            // Non-globe to non-globe: direct switch with CSS transitions
            applyLayout(newModeName);
            isTransitioning = false;
            startAutoRotate();
        }
    }

    function nextMode() {
        switchMode((currentMode + 1) % CONFIG.MODES.length);
    }

    function startAutoRotate() {
        // disabled: no auto mode switching
    }

    function stopAutoRotate() {
        if (autoRotateTimer) {
            clearInterval(autoRotateTimer);
            autoRotateTimer = null;
        }
    }

    function updateModeTags() {
        document.querySelectorAll('.mode-tag').forEach((tag, i) => {
            tag.classList.toggle('active', i === currentMode);
        });
    }

    // ===== FOCUS (Mosaic) =====
    function focusPhoto(index) {
        if (CONFIG.MODES[currentMode] !== 'mosaic') return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w / 2;
        const cy = h / 2;

        if (focusedIndex === index) {
            clearFocus();
            layoutMosaic();
            return;
        }

        focusedIndex = index;
        const stage = document.getElementById('photoStage');
        stage.style.transform = 'none';

        photoElements.forEach((el, i) => {
            if (i === index) {
                el.classList.add('focused');
                el.classList.remove('dimmed');
                const focusSize = Math.min(w * 0.4, h * 0.6, 400);
                el.style.left = (cx - focusSize / 2) + 'px';
                el.style.top = (cy - focusSize / 2) + 'px';
                el.style.width = focusSize + 'px';
                el.style.height = focusSize + 'px';
                el.style.transform = 'scale(1)';
                el.style.zIndex = '200';
                el.style.opacity = '1';
            } else {
                el.classList.add('dimmed');
                el.classList.remove('focused');
            }
        });
    }

    function clearFocus() {
        focusedIndex = -1;
        photoElements.forEach(el => {
            el.classList.remove('focused', 'dimmed');
        });
    }

    // ===== POPUP =====
    function showPopup(src) {
        const popup = document.getElementById('galleryPopup');
        const img = document.getElementById('galleryPopupImg');
        img.src = src;
        popup.classList.add('visible');
    }

    function hidePopup() {
        const popup = document.getElementById('galleryPopup');
        const img = document.getElementById('galleryPopupImg');
        popup.classList.remove('visible');
        img.src = '';
    }

    // ===== PARTICLES =====
    function initParticles() {
        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');
        let particles = [];
        const PARTICLE_COUNT = 80;

        function resize() {
            canvas.width = window.innerWidth * devicePixelRatio;
            canvas.height = window.innerHeight * devicePixelRatio;
            ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        const colors = [
            'rgba(255, 107, 157, ',
            'rgba(201, 177, 255, ',
            'rgba(255, 215, 0, ',
            'rgba(255, 182, 193, ',
        ];

        function createParticle() {
            return {
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + Math.random() * 50,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -(0.3 + Math.random() * 0.5),
                size: 2 + Math.random() * 4,
                alpha: 0,
                alphaTarget: 0.3 + Math.random() * 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                type: Math.random() < 0.35 ? 'heart' : 'circle',
                life: 0,
                maxLife: 300 + Math.random() * 400
            };
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = createParticle();
            p.y = Math.random() * window.innerHeight;
            p.life = Math.random() * p.maxLife;
            p.alpha = p.alphaTarget * 0.5;
            particles.push(p);
        }

        function drawHeart(x, y, size, color, alpha) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(size / 16, size / 16);
            ctx.beginPath();
            ctx.moveTo(0, -3);
            ctx.bezierCurveTo(-8, -12, -16, -2, 0, 8);
            ctx.bezierCurveTo(16, -2, 8, -12, 0, -3);
            ctx.fillStyle = color + alpha + ')';
            ctx.fill();
            ctx.restore();
        }

        function animate() {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx += (Math.random() - 0.5) * 0.02;
                p.life++;

                if (p.life < 60) {
                    p.alpha = p.alphaTarget * (p.life / 60);
                } else if (p.life > p.maxLife - 60) {
                    p.alpha = p.alphaTarget * ((p.maxLife - p.life) / 60);
                } else {
                    p.alpha = p.alphaTarget;
                }

                if (p.life >= p.maxLife || p.y < -20) {
                    particles[i] = createParticle();
                    continue;
                }

                if (p.type === 'heart') {
                    drawHeart(p.x, p.y, p.size, p.color, p.alpha);
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = p.color + p.alpha + ')';
                    ctx.fill();
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // ===== LYRICS =====
    function initLyrics() {
        let idx = 0;
        const subEl = document.getElementById('lyricsSub');
        const mainEl = document.getElementById('lyricsMain');

        function showLyric() {
            const lyric = lyrics[idx % lyrics.length];
            subEl.style.opacity = '0';
            mainEl.style.opacity = '0';
            setTimeout(() => {
                subEl.textContent = lyric.sub;
                mainEl.textContent = lyric.main;
                subEl.style.opacity = '1';
                mainEl.style.opacity = '1';
            }, 800);
            idx++;
        }

        showLyric();
        setInterval(showLyric, 8000);
    }

    // ===== AUDIO BARS =====
    function initBars() {
        document.querySelectorAll('.bar').forEach(bar => {
            const duration = 0.4 + Math.random() * 0.5;
            const minH = 10 + Math.random() * 15;
            const maxH = 50 + Math.random() * 40;
            const delay = Math.random() * 0.8;
            bar.style.setProperty('--bar-duration', duration + 's');
            bar.style.setProperty('--bar-min', minH + '%');
            bar.style.setProperty('--bar-max', maxH + '%');
            bar.style.setProperty('--bar-height', (minH + maxH) / 2 + '%');
            bar.style.animationDelay = delay + 's';
        });
    }

    // ===== EVENTS =====
    function bindEvents() {
        // Mode switching
        document.querySelectorAll('.mode-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const mode = parseInt(tag.dataset.mode);
                switchMode(mode);
            });
        });

        // Photo clicks
        document.getElementById('photoStage').addEventListener('click', (e) => {
            if (CONFIG.MODES[currentMode] === 'orbit' && orbitDragMoved) return;

            const item = e.target.closest('.photo-item');
            if (!item) {
                if (CONFIG.MODES[currentMode] === 'orbit') {
                    orbitPaused = !orbitPaused;
                }
                return;
            }
            const idx = parseInt(item.dataset.index);

            switch (CONFIG.MODES[currentMode]) {
                case 'mosaic':
                    focusPhoto(idx);
                    break;
                case 'carousel':
                    if (idx === carouselIndex) {
                        showPopup(`images/${imageList[idx]}`);
                    } else {
                        carouselIndex = idx;
                        pauseCarouselAuto();
                        layoutCarousel(true);
                    }
                    break;
                default:
                    showPopup(`images/${imageList[idx]}`);
                    break;
            }
        });

        // Popup close
        document.getElementById('galleryCloseBtn').addEventListener('click', hidePopup);
        document.getElementById('galleryPopup').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) hidePopup();
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            const popup = document.getElementById('galleryPopup');
            if (popup.classList.contains('visible')) {
                if (e.key === 'Escape') hidePopup();
                return;
            }

            if (CONFIG.MODES[currentMode] === 'carousel') {
                if (e.key === 'ArrowLeft') {
                    carouselIndex = Math.max(0, carouselIndex - 1);
                    pauseCarouselAuto();
                    layoutCarousel();
                } else if (e.key === 'ArrowRight') {
                    carouselIndex = Math.min(photoElements.length - 1, carouselIndex + 1);
                    pauseCarouselAuto();
                    layoutCarousel();
                }
            }

            if (e.key === 'Escape' && focusedIndex >= 0) {
                clearFocus();
                layoutMosaic();
            }
        });

        // Mouse wheel for carousel/spiral/waterfall
        document.addEventListener('wheel', (e) => {
            const mode = CONFIG.MODES[currentMode];
            if (mode === 'carousel') {
                e.preventDefault();
                if (e.deltaY > 0 || e.deltaX > 0) {
                    carouselIndex = Math.min(photoElements.length - 1, carouselIndex + 1);
                } else {
                    carouselIndex = Math.max(0, carouselIndex - 1);
                }
                pauseCarouselAuto();
                layoutCarousel();
            } else if (mode === 'spiral') {
                spiralSpeed = Math.max(0.001, Math.min(0.015, spiralSpeed + e.deltaY * 0.0001));
            } else if (mode === 'waterfall') {
                waterfallSpeed = Math.max(0.1, Math.min(2.0, waterfallSpeed + e.deltaY * 0.002));
            }
        }, { passive: false });

        // Orbit drag
        let orbitDragMoved = false;
        document.addEventListener('mousedown', (e) => {
            if (CONFIG.MODES[currentMode] !== 'orbit') return;
            if (e.target.closest('#modeIndicator') || e.target.closest('#galleryHeader') || e.target.closest('#galleryFooter')) return;
            orbitDragging = true;
            orbitDragMoved = false;
            orbitDragStartX = e.clientX;
            orbitDragStartOffset = orbitOffset;
        });

        document.addEventListener('mousemove', (e) => {
            if (!orbitDragging) return;
            const dx = e.clientX - orbitDragStartX;
            if (Math.abs(dx) > 5) orbitDragMoved = true;
            orbitOffset = orbitDragStartOffset + dx * 0.005;
        });

        document.addEventListener('mouseup', () => {
            orbitDragging = false;
        });

        // Waterfall hover pause - on individual photo items
        document.getElementById('photoStage').addEventListener('mouseover', (e) => {
            if (CONFIG.MODES[currentMode] === 'waterfall' && e.target.closest('.photo-item')) {
                waterfallPaused = true;
            }
        });

        document.getElementById('photoStage').addEventListener('mouseout', (e) => {
            if (CONFIG.MODES[currentMode] === 'waterfall' && e.target.closest('.photo-item')) {
                waterfallPaused = false;
            }
        });

        // Globe interactions
        const gc = document.getElementById('globeCanvas');
        let globeClickMoved = false;
        gc.addEventListener('mousedown', (e) => {
            if (CONFIG.MODES[currentMode] !== 'globe') return;
            globeDragging = true;
            globeClickMoved = false;
            globeDragStartX = e.clientX;
            globeDragStartY = e.clientY;
            globeDragStartRotX = globeRotX;
            globeDragStartRotY = globeRotY;
        });
        gc.addEventListener('mousemove', (e) => {
            if (!globeDragging) return;
            const dx = e.clientX - globeDragStartX;
            const dy = e.clientY - globeDragStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) globeClickMoved = true;
            globeRotY = globeDragStartRotY + dx * 0.005;
            globeRotX = Math.max(-1.2, Math.min(1.2, globeDragStartRotX - dy * 0.005));
        });
        gc.addEventListener('mouseup', () => { globeDragging = false; });
        gc.addEventListener('mouseleave', () => { globeDragging = false; });
        gc.addEventListener('click', (e) => {
            if (globeClickMoved) return;
            handleGlobeClick(e);
        });
        gc.addEventListener('wheel', (e) => {
            if (CONFIG.MODES[currentMode] !== 'globe') return;
            e.preventDefault();
            globeZoom = Math.max(0.4, Math.min(3.5, globeZoom - e.deltaY * 0.003));
        }, { passive: false });

        // Resize
        window.addEventListener('resize', () => {
            if (!isTransitioning) {
                applyLayout(CONFIG.MODES[currentMode]);
            }
        });
    }

    // ===== START =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

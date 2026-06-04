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
        { sub: 'My eyes are painted red,', main: '我的双眼被描绘成红色，' },
        { sub: 'The canvas of my soul,', main: '是我灵魂的写照，' },
        { sub: 'Slowly breaking down, again,', main: '心再一次被慢慢撕碎，' },
        { sub: 'Today I heard the news,', main: '今天，我听到这个消息，' },
        { sub: 'The stories getting old,', main: '不过是老调重弹，' },
        { sub: 'When will we see the end?', main: '我们何时才能看到出口？' },
        { sub: 'Of the days, we bleed for what we need,', main: '这些日子，我们为了想要的而流血受伤，' },
        { sub: 'To forgive, forget, move on,', main: '去原谅，去忘记……继续前行，' },
        { sub: 'Cause we\'ve got,', main: '因为我们的，' },
        { sub: 'One life to live,', main: '人生仅有一次，' },
        { sub: 'One love to give,', main: '只能交付一次的爱情，' },
        { sub: 'One chance to keep from falling,', main: '只有一次远离堕落的机会，' },
        { sub: 'One heart to break,', main: '只能破碎一次的心，' },
        { sub: 'One soul to take us,', main: '一颗拯救我们的灵魂，' },
        { sub: 'Not for sake us,', main: '而不是抛弃我们的，' },
        { sub: 'Only one,', main: '仅此唯一。' },
        { sub: 'Only one,', main: '仅此唯一。' },
        { sub: 'The writting\'s on the wall,', main: '那墙上的文字，' },
        { sub: 'Those who came before,', main: '是昔日过往者的印记，' },
        { sub: 'Left pictures frozen still, in time,', main: '遗留下来的照片仍然被冻结着，终有一天，' },
        { sub: 'You say you want it all,', main: '你说你想要一切，' },
        { sub: 'But whose side you fighting for?', main: '但是你在为谁而战？' },
        { sub: 'I sit and wonder why,', main: '我坐在那困惑着这是为什么，' },
        { sub: 'There are nights, we sleep, while others they weep,', main: '那些夜晚，我们睡着，而另一些人却在哭泣，' },
        { sub: 'With regret, repent, be strong,', main: '带着遗憾，后悔，坚强起来，' },
        { sub: 'Cause we\'ve got,', main: '因为我们的，' },
        { sub: 'One life to live,', main: '人生仅有一次，' },
        { sub: 'One love to give,', main: '只能交付一次的爱情，' },
        { sub: 'One chance to keep from falling,', main: '只有一次远离堕落的机会，' },
        { sub: 'One heart to break,', main: '只能破碎一次的心，' },
        { sub: 'One soul to take us,', main: '一颗拯救我们的灵魂，' },
        { sub: 'Not for sake us,', main: '而不是抛弃我们的，' },
        { sub: 'Only One,', main: '仅此唯一。' },
        { sub: 'Only One,', main: '仅此唯一。' },
        { sub: 'Just you and I,', main: '只要你和我，' },
        { sub: 'Under one sky,', main: '在同一片天空下...' },
        { sub: 'One life to live,', main: '人生仅有一次，' },
        { sub: 'One love to give,', main: '只能交付一次的爱情，' },
        { sub: 'One chance to keep from falling,', main: '只有一次远离堕落的机会，' },
        { sub: 'One heart to break,', main: '只能破碎一次的心，' },
        { sub: 'One soul to take us,', main: '一颗拯救我们的灵魂，' },
        { sub: 'Not for sake us,', main: '而不是抛弃我们的，' },
        { sub: 'Only One,', main: '仅此唯一。' },
        { sub: 'One life to live,', main: '人生仅有一次，' },
        { sub: 'One love to give,', main: '只能交付一次的爱情，' },
        { sub: 'One chance to keep from falling,', main: '只有一次远离堕落的机会，' },
        { sub: 'Only One,', main: '仅此唯一。' },
        { sub: 'One heart to break,', main: '只能破碎一次的心，' },
        { sub: 'One soul to take us,', main: '一颗拯救我们的灵魂，' },
        { sub: 'Not for sake us,', main: '而不是抛弃我们的，' },
        { sub: 'Only One,', main: '仅此唯一。' },
        { sub: 'Only One,', main: '仅此唯一。' },
    ];

    // Globe data references (resolved at init time)
    let _globeTC = null;
    let _globeWC = null;
    let _globeCB = null;
    let _globeCountries = null;
    let _geoFeatures = null; // Natural Earth GeoJSON features

    // China flat map easter egg state
    let chinaMapMode = false;
    let chinaMapTransition = 0; // 0-1 for crossfade
    let chinaClickCount = 0;
    let chinaClickTimer = null;
    let chinaMapInitialized = false;
    let chinaProvinceFeatures = null;
    let chinaProjection = null;
    let chinaPathGen = null;
    let currentProvinceZoom = null;

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
        loadGeoData();
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

    async function loadGeoData() {
        try {
            const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            const topology = await res.json();
            if (window.topojson) {
                const geojson = topojson.feature(topology, topology.objects.countries);
                _geoFeatures = geojson.features;
            }
        } catch (e) {
            console.error('Failed to load geo data', e);
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
        const chinaOverlay = document.getElementById('chinaMapOverlay');
        if (chinaOverlay) chinaOverlay.classList.remove('active');
        photoElements.forEach(el => { el.style.pointerEvents = ''; });
        chinaMapMode = false;
        chinaMapTransition = 0;
        if (currentProvinceZoom) zoomOutToFull();
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

            // In China map mode, SVG overlay handles display - skip globe rendering
            if (chinaMapMode) {
                globeAnimId = requestAnimationFrame(tick);
                return;
            }

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

            // Country borders from Natural Earth GeoJSON (accurate)
            if (_geoFeatures && _geoFeatures.length > 0) {
                _geoFeatures.forEach(feature => {
                    const geom = feature.geometry;
                    if (!geom) return;
                    let polygons;
                    if (geom.type === 'Polygon') {
                        polygons = [geom.coordinates];
                    } else if (geom.type === 'MultiPolygon') {
                        polygons = geom.coordinates;
                    } else return;

                    // Check if this is China (id "156" in Natural Earth)
                    const id = feature.id || (feature.properties && feature.properties.iso_n3);
                    const isChina = (id === '156' || id === '158'); // 156=China, 158=Taiwan

                    polygons.forEach(polygon => {
                        const ring = polygon[0]; // outer ring
                        if (!ring || ring.length < 3) return;

                        let anyVisible = false;
                        const screenPts = ring.map(coord => {
                            const p = latLngToScreen(coord[1], coord[0], globeRotX, globeRotY, radius, cx, cy);
                            if (p.visible) anyVisible = true;
                            return p;
                        });
                        if (!anyVisible) return;

                        if (drawSmoothPolygon(gctx, screenPts)) {
                            if (isChina) {
                                const centerX = screenPts.reduce((s, p) => s + p.sx, 0) / screenPts.length;
                                const centerY = screenPts.reduce((s, p) => s + p.sy, 0) / screenPts.length;
                                const grad = gctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.5);
                                grad.addColorStop(0, 'rgba(200, 80, 60, 0.30)');
                                grad.addColorStop(0.7, 'rgba(180, 60, 50, 0.18)');
                                grad.addColorStop(1, 'rgba(150, 40, 40, 0.08)');
                                gctx.fillStyle = grad;
                                gctx.strokeStyle = 'rgba(255, 180, 100, 0.65)';
                                gctx.lineWidth = 1.3;
                                gctx.shadowColor = 'rgba(255, 180, 100, 0.25)';
                                gctx.shadowBlur = 3;
                            } else {
                                gctx.fillStyle = 'rgba(55, 130, 85, 0.18)';
                                gctx.strokeStyle = 'rgba(80, 170, 110, 0.30)';
                                gctx.lineWidth = 0.6;
                                gctx.shadowBlur = 0;
                            }
                            gctx.fill();
                            gctx.stroke();
                            gctx.shadowBlur = 0;
                        }
                    });
                });
            } else if (_globeCB.length > 0) {
                // Fallback to hand-crafted data
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

    // ===== CHINA SVG MAP =====
    function createSVGEl(tag, attrs) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    }

    function getVisitedProvinces() {
        const visited = new Set();
        if (!_globeTC) return visited;
        Object.keys(_globeTC).forEach(cityKey => {
            const adcode = window.CITY_TO_PROVINCE && window.CITY_TO_PROVINCE[cityKey];
            if (adcode) visited.add(adcode);
        });
        return visited;
    }

    function enterChinaMap() {
        chinaMapMode = true;
        const gc = document.getElementById('globeCanvas');
        gc.classList.remove('active');
        const overlay = document.getElementById('chinaMapOverlay');
        overlay.classList.add('active');
        const popup = document.getElementById('globePopup');
        popup.classList.remove('visible');
        if (!chinaMapInitialized) {
            initChinaMapSVG();
        } else {
            document.getElementById('chinaMapLoading').classList.add('hidden');
        }
        initChinaMapParticles();
    }

    function exitChinaMap() {
        chinaMapMode = false;
        const overlay = document.getElementById('chinaMapOverlay');
        overlay.classList.remove('active');
        const gc = document.getElementById('globeCanvas');
        gc.classList.add('active');
        const popup = document.getElementById('globePopup');
        popup.classList.remove('visible');
        if (currentProvinceZoom) zoomOutToFull();
        hideProvinceDetailPanel();
        pauseChinaParticles();
    }

    // ===== CHINA MAP PARTICLES =====
    let chinaParticleAnimId = null;
    let chinaParticlesInited = false;
    let chinaParticles = [];
    let chinaShootingStars = [];
    let lastShootingStarTime = 0;

    function initChinaMapParticles() {
        if (chinaParticlesInited) { resumeChinaParticles(); return; }
        chinaParticlesInited = true;
        const canvas = document.getElementById('chinaMapParticleCanvas');
        const ctx = canvas.getContext('2d');
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(devicePixelRatio, devicePixelRatio);

        const colors = [
            'rgba(255, 215, 0, ',
            'rgba(255, 235, 210, ',
            'rgba(255, 200, 160, ',
            'rgba(255, 180, 200, '
        ];

        for (let i = 0; i < 55; i++) {
            chinaParticles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -Math.random() * 0.2 - 0.05,
                size: Math.random() * 2 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: Math.random() * 0.4 + 0.1,
                alphaDir: Math.random() > 0.5 ? 1 : -1,
                phase: Math.random() * Math.PI * 2
            });
        }

        lastShootingStarTime = Date.now();

        function tick() {
            ctx.clearRect(0, 0, w, h);
            const now = Date.now();

            chinaParticles.forEach(p => {
                p.x += p.vx + Math.sin(p.phase) * 0.1;
                p.y += p.vy;
                p.phase += 0.01;
                p.alpha += p.alphaDir * 0.003;
                if (p.alpha > 0.5) { p.alpha = 0.5; p.alphaDir = -1; }
                if (p.alpha < 0.08) { p.alpha = 0.08; p.alphaDir = 1; }

                if (p.y < -10) p.y = h + 10;
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.alpha + ')';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = p.color + (p.alpha * 0.2) + ')';
                ctx.fill();
            });

            if (now - lastShootingStarTime > 8000 + Math.random() * 6000) {
                chinaShootingStars.push({
                    x: Math.random() * w * 0.8,
                    y: Math.random() * h * 0.3,
                    vx: 3 + Math.random() * 2,
                    vy: 1.5 + Math.random(),
                    life: 60,
                    maxLife: 60
                });
                lastShootingStarTime = now;
            }

            chinaShootingStars = chinaShootingStars.filter(s => {
                s.x += s.vx;
                s.y += s.vy;
                s.life--;
                const progress = s.life / s.maxLife;
                const speed = Math.hypot(s.vx, s.vy);
                const dirX = s.vx / speed;
                const dirY = s.vy / speed;
                const tailLen = 30 * progress;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - dirX * tailLen, s.y - dirY * tailLen);
                const grad = ctx.createLinearGradient(s.x, s.y, s.x - dirX * tailLen, s.y - dirY * tailLen);
                grad.addColorStop(0, `rgba(255, 235, 180, ${progress * 0.8})`);
                grad.addColorStop(1, 'rgba(255, 235, 180, 0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                return s.life > 0;
            });

            chinaParticleAnimId = requestAnimationFrame(tick);
        }
        chinaParticleAnimId = requestAnimationFrame(tick);
    }

    function resumeChinaParticles() {
        if (chinaParticleAnimId) return;
        const canvas = document.getElementById('chinaMapParticleCanvas');
        const ctx = canvas.getContext('2d');
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(devicePixelRatio, devicePixelRatio);

        chinaParticles.forEach(p => {
            if (p.x > w) p.x = Math.random() * w;
            if (p.y > h) p.y = Math.random() * h;
        });

        function tick() {
            ctx.clearRect(0, 0, w, h);
            const now = Date.now();

            chinaParticles.forEach(p => {
                p.x += p.vx + Math.sin(p.phase) * 0.1;
                p.y += p.vy;
                p.phase += 0.01;
                p.alpha += p.alphaDir * 0.003;
                if (p.alpha > 0.5) { p.alpha = 0.5; p.alphaDir = -1; }
                if (p.alpha < 0.08) { p.alpha = 0.08; p.alphaDir = 1; }

                if (p.y < -10) p.y = h + 10;
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.alpha + ')';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = p.color + (p.alpha * 0.2) + ')';
                ctx.fill();
            });

            if (now - lastShootingStarTime > 8000 + Math.random() * 6000) {
                chinaShootingStars.push({
                    x: Math.random() * w * 0.8,
                    y: Math.random() * h * 0.3,
                    vx: 3 + Math.random() * 2,
                    vy: 1.5 + Math.random(),
                    life: 60,
                    maxLife: 60
                });
                lastShootingStarTime = now;
            }

            chinaShootingStars = chinaShootingStars.filter(s => {
                s.x += s.vx;
                s.y += s.vy;
                s.life--;
                const progress = s.life / s.maxLife;
                const speed = Math.hypot(s.vx, s.vy);
                const dirX = s.vx / speed;
                const dirY = s.vy / speed;
                const tailLen = 30 * progress;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - dirX * tailLen, s.y - dirY * tailLen);
                const grad = ctx.createLinearGradient(s.x, s.y, s.x - dirX * tailLen, s.y - dirY * tailLen);
                grad.addColorStop(0, `rgba(255, 235, 180, ${progress * 0.8})`);
                grad.addColorStop(1, 'rgba(255, 235, 180, 0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                return s.life > 0;
            });

            chinaParticleAnimId = requestAnimationFrame(tick);
        }
        chinaParticleAnimId = requestAnimationFrame(tick);
    }

    function pauseChinaParticles() {
        if (chinaParticleAnimId) { cancelAnimationFrame(chinaParticleAnimId); chinaParticleAnimId = null; }
    }

    // ===== PROVINCE DETAIL PANEL =====
    function showProvinceDetailPanel(adcode) {
        const panel = document.getElementById('provinceDetailPanel');
        const provinceInfo = window.PROVINCE_CITY_MAP && window.PROVINCE_CITY_MAP[adcode];
        if (!provinceInfo) return;

        const provinceCities = provinceInfo.cities || [];
        let allEvents = [];
        provinceCities.forEach(cityName => {
            if (_globeTC && _globeTC[cityName]) {
                _globeTC[cityName].events.forEach(ev => {
                    allEvents.push({ city: cityName, dateKey: ev.dateKey, title: ev.title });
                });
            }
        });
        allEvents.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

        const visitedCities = provinceCities.filter(c => _globeTC && _globeTC[c]);

        document.getElementById('provincePanelName').textContent = provinceInfo.name;
        document.getElementById('provincePanelSub').textContent = provinceInfo.nameEn;

        const firstDate = allEvents.length > 0 ? allEvents[0].dateKey : '';
        document.getElementById('provincePanelStats').innerHTML =
            `<div class="stat-badge"><strong>${visitedCities.length}</strong>城市</div>` +
            `<div class="stat-badge"><strong>${allEvents.length}</strong>次旅行</div>` +
            (firstDate ? `<div class="stat-badge"><strong>${firstDate}</strong>首次</div>` : '');

        let tripsHtml = '<div class="trips-title">旅行足迹</div>';
        allEvents.forEach((ev, i) => {
            tripsHtml += `<div class="trip-item" style="animation-delay:${200 + i * 80}ms">
                <span class="trip-date">${ev.dateKey}</span>
                <span class="trip-title">${ev.title}</span>
            </div>`;
        });
        document.getElementById('provincePanelTrips').innerHTML = tripsHtml;

        const matchedPhotos = [];
        const addedPhotos = new Set();
        allEvents.forEach(ev => {
            imageList.forEach(img => {
                if (img.startsWith(ev.dateKey) && !addedPhotos.has(img) && matchedPhotos.length < 12) {
                    matchedPhotos.push(img);
                    addedPhotos.add(img);
                }
            });
        });

        let photosHtml = '';
        if (matchedPhotos.length > 0) {
            photosHtml = '<div class="photos-title">记忆碎片</div><div class="photo-grid">';
            matchedPhotos.forEach((img, i) => {
                photosHtml += `<div class="photo-thumb" data-img="${img}" style="animation-delay:${400 + i * 60}ms"><img src="images/thumbs/${img}" alt="" loading="lazy" onerror="this.src='images/${img}'"></div>`;
            });
            photosHtml += '</div>';
        }
        document.getElementById('provincePanelPhotos').innerHTML = photosHtml;

        panel.querySelectorAll('.photo-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const imgName = thumb.dataset.img;
                const popupEl = document.getElementById('galleryPopup');
                const popupImg = document.getElementById('galleryPopupImg');
                popupImg.src = `images/${imgName}`;
                popupEl.classList.add('visible');
            });
        });

        panel.classList.add('visible');
    }

    function hideProvinceDetailPanel() {
        document.getElementById('provinceDetailPanel').classList.remove('visible');
    }

    // ===== STATS HELPERS =====
    function animateCountUp(elementId, target, duration) {
        const el = document.getElementById(elementId);
        if (!el || target === 0) { if (el) el.textContent = '0'; return; }
        const start = Date.now();
        function step() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function computeAchievements(visitedProvinces, totalTrips) {
        const badges = [];
        if (totalTrips >= 1) badges.push('✨ 初次旅行');
        const northCodes = ['110000','120000','130000','140000','150000','210000','220000','230000','370000','610000','620000','630000','640000','650000'];
        const southCodes = ['440000','450000','460000','530000','520000','510000','500000','430000','350000','330000'];
        const hasNorth = northCodes.some(c => visitedProvinces.has(c));
        const hasSouth = southCodes.some(c => visitedProvinces.has(c));
        if (hasNorth && hasSouth) badges.push('🧭 南北纵横');
        if (visitedProvinces.size >= 17) badges.push('🏆 半壁江山');
        if (visitedProvinces.size >= 5) badges.push('🗺️ 旅行达人');
        return badges;
    }

    // ===== TRAVEL ROUTE LINES =====
    function buildChronologicalRoute() {
        if (!_globeTC || !_globeWC) return [];
        const cnCities = _globeWC.filter(c => c.country === 'CN');
        let allStops = [];
        Object.keys(_globeTC).forEach(cityName => {
            const city = cnCities.find(c => c.nameEn === cityName);
            if (!city) return;
            _globeTC[cityName].events.forEach(ev => {
                allStops.push({ cityName, lat: city.lat, lng: city.lng, dateKey: ev.dateKey });
            });
        });
        allStops.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        // Deduplicate consecutive same-city
        const deduped = [];
        allStops.forEach(s => {
            if (deduped.length === 0 || deduped[deduped.length - 1].cityName !== s.cityName) {
                deduped.push(s);
            }
        });
        return deduped;
    }

    function renderRouteLines(routeGroup) {
        const stops = buildChronologicalRoute();
        if (stops.length < 2 || !chinaProjection) return;

        const defs = createSVGEl('defs', {});
        const grad = createSVGEl('linearGradient', { id: 'routeGradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
        const stop1 = createSVGEl('stop', { offset: '0%', 'stop-color': '#ffd700', 'stop-opacity': '0.9' });
        const stop2 = createSVGEl('stop', { offset: '100%', 'stop-color': '#ff6b9d', 'stop-opacity': '0.9' });
        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);
        routeGroup.appendChild(defs);

        const points = stops.map(s => chinaProjection([s.lng, s.lat])).filter(p => p);
        if (points.length < 2) return;

        // Build smooth path with quadratic curves
        let pathD = `M ${points[0][0]},${points[0][1]}`;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const midX = (prev[0] + curr[0]) / 2;
            const midY = (prev[1] + curr[1]) / 2;
            const cpX = midX + ((i % 2 === 0 ? 1 : -1) * 12);
            const cpY = midY - Math.abs(curr[1] - prev[1]) * 0.3 - 10;
            pathD += ` Q ${cpX},${cpY} ${curr[0]},${curr[1]}`;
        }

        // Main gradient path
        const mainPath = createSVGEl('path', {
            d: pathD,
            class: 'route-segment',
            stroke: 'url(#routeGradient)'
        });
        routeGroup.appendChild(mainPath);
        // Set dasharray to actual path length for draw-in animation
        requestAnimationFrame(() => {
            const len = mainPath.getTotalLength ? mainPath.getTotalLength() : 2000;
            mainPath.style.strokeDasharray = len;
            mainPath.style.strokeDashoffset = len;
            mainPath.style.animation = `routeFadeIn 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`;
        });

        // Animated dash overlay
        const dashPath = createSVGEl('path', {
            d: pathD,
            class: 'route-dash'
        });
        routeGroup.appendChild(dashPath);

        // Traveling dot with animateMotion
        const dot = createSVGEl('circle', { r: '3.5', class: 'route-travel-dot' });
        mainPath.setAttribute('id', 'routeMainPath');
        const motionAnim = createSVGEl('animateMotion', {
            dur: `${Math.max(points.length * 2.5, 8)}s`,
            repeatCount: 'indefinite'
        });
        const mpath = createSVGEl('mpath', {});
        mpath.setAttribute('href', '#routeMainPath');
        motionAnim.appendChild(mpath);
        dot.appendChild(motionAnim);
        routeGroup.appendChild(dot);
    }

    async function initChinaMapSVG() {
        const loading = document.getElementById('chinaMapLoading');
        const svg = document.getElementById('chinaMapSvg');
        const w = window.innerWidth;
        const h = window.innerHeight;
        console.log('[ChinaMap] viewport:', w, 'x', h);

        try {
            if (typeof d3 === 'undefined' || !d3.geoMercator) {
                throw new Error('d3-geo not loaded');
            }
            const res = await fetch('china-geo.json');
            const geojson = await res.json();
            // Filter out nine-dash line (100000_JD) which stretches bounds
            chinaProvinceFeatures = geojson.features.filter(f => {
                const adcode = String(f.properties.adcode || '');
                return !adcode.includes('_') && adcode !== '100000';
            });

            // Custom projection: simple Mercator mapped to fill the screen
            const lngMin = 73, lngMax = 135, latMin = 18, latMax = 54;
            const mx = w * 0.05, mt = h * 0.08, mb = h * 0.05;
            const drawW = w - mx * 2;
            const drawH = h - mt - mb;
            function mercY(lat) {
                return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
            }
            const yMin = mercY(latMin), yMax = mercY(latMax);
            const geoW = (lngMax - lngMin) * Math.PI / 180;
            const geoH = yMax - yMin;
            const sc = Math.min(drawW / geoW, drawH / geoH);
            const realW = geoW * sc, realH = geoH * sc;
            const ox = mx + (drawW - realW) / 2;
            const oy = mt + (drawH - realH) / 2;

            chinaProjection = function(coords) {
                const x = ox + ((coords[0] - lngMin) * Math.PI / 180) * sc;
                const y = oy + (yMax - mercY(coords[1])) * sc;
                return [x, y];
            };
            chinaProjection.stream = function(s) {
                return {
                    point: function(lng, lat) { const p = chinaProjection([lng, lat]); s.point(p[0], p[1]); },
                    lineStart: function() { s.lineStart(); },
                    lineEnd: function() { s.lineEnd(); },
                    polygonStart: function() { s.polygonStart(); },
                    polygonEnd: function() { s.polygonEnd(); },
                    sphere: function() {}
                };
            };
            chinaPathGen = d3.geoPath().projection(chinaProjection);

            console.log('[ChinaMap] viewport:', w, 'x', h, ', scale:', sc, ', offset:', ox, oy);
            console.log('[ChinaMap] Beijing at:', chinaProjection([116.4, 39.9]));

            const visitedProvinces = getVisitedProvinces();

            // SVG glow filter for visited provinces
            const defs = createSVGEl('defs', {});
            const glowFilter = createSVGEl('filter', { id: 'visitedGlow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
            const feBlur = createSVGEl('feGaussianBlur', { stdDeviation: '3', result: 'blur' });
            const feComposite = createSVGEl('feComposite', { in: 'SourceGraphic', in2: 'blur', operator: 'over' });
            glowFilter.appendChild(feBlur);
            glowFilter.appendChild(feComposite);
            defs.appendChild(glowFilter);
            svg.appendChild(defs);

            // Provinces group
            const g = createSVGEl('g', { class: 'provinces-group' });
            g.id = 'provincesGroup';

            chinaProvinceFeatures.forEach((feature, i) => {
                const adcode = String(feature.properties.adcode);
                const isVisited = visitedProvinces.has(adcode);
                const pathD = chinaPathGen(feature);
                if (!pathD) return;

                const path = createSVGEl('path', {
                    d: pathD,
                    class: `province ${isVisited ? 'province-visited' : 'province-unvisited'}`,
                    'data-adcode': adcode,
                    'data-name': feature.properties.name
                });
                path.style.animationDelay = `${i * 25}ms`;

                path.addEventListener('mouseenter', (e) => onProvinceHover(e, feature));
                path.addEventListener('mousemove', (e) => moveTooltip(e));
                path.addEventListener('mouseleave', onProvinceLeave);
                path.addEventListener('click', (e) => onProvinceClick(e, feature, isVisited));
                g.appendChild(path);
            });
            svg.appendChild(g);

            // Route lines group (between provinces and city markers)
            const routeGroup = createSVGEl('g', { class: 'route-lines-group' });
            routeGroup.id = 'routeLinesGroup';
            renderRouteLines(routeGroup);
            svg.appendChild(routeGroup);

            // City markers group
            const cityGroup = createSVGEl('g', { class: 'city-markers-group' });
            cityGroup.id = 'cityMarkersGroup';
            renderCityMarkersSVG(cityGroup, visitedProvinces);
            svg.appendChild(cityGroup);

            // Update stats with animated countUp
            const totalCities = _globeTC ? Object.keys(_globeTC).filter(c => {
                const city = _globeWC && _globeWC.find(wc => wc.nameEn === c);
                return city && city.country === 'CN';
            }).length : 0;
            let totalTrips = 0;
            if (_globeTC) Object.keys(_globeTC).forEach(c => {
                const city = _globeWC && _globeWC.find(wc => wc.nameEn === c);
                if (city && city.country === 'CN') totalTrips += _globeTC[c].events.length;
            });
            const pct = Math.round((visitedProvinces.size / 34) * 100);

            animateCountUp('visitedCount', visitedProvinces.size, 2000);
            animateCountUp('visitedCityCount', totalCities, 2200);
            animateCountUp('totalTripCount', totalTrips, 2400);

            setTimeout(() => {
                document.getElementById('chinaProgressBar').style.width = pct + '%';
                document.getElementById('chinaProgressText').textContent = pct + '%';
            }, 500);

            // Achievements
            const achievements = computeAchievements(visitedProvinces, totalTrips);
            const achEl = document.getElementById('chinaAchievements');
            achEl.innerHTML = achievements.map((a, i) =>
                `<span class="china-badge" style="animation-delay:${3000 + i * 200}ms">${a}</span>`
            ).join('');

            // Bind back buttons
            document.getElementById('chinaBackBtn').addEventListener('click', exitChinaMap);
            document.getElementById('chinaBackProvinceBtn').addEventListener('click', zoomOutToFull);
            document.getElementById('provincePanelClose').addEventListener('click', hideProvinceDetailPanel);

            // Click on empty area dismisses popup
            svg.addEventListener('click', (e) => {
                if (!e.target.closest('.city-marker')) {
                    document.getElementById('globePopup').classList.remove('visible');
                }
            });

            loading.classList.add('hidden');
            chinaMapInitialized = true;
        } catch (e) {
            console.error('Failed to load China province GeoJSON', e);
            loading.innerHTML = '<p style="color:rgba(255,150,150,0.8)">地图加载失败，请刷新重试</p>';
        }
    }

    function renderCityMarkersSVG(group, visitedProvinces) {
        if (!_globeWC) return;
        const cnCities = _globeWC.filter(c => c.country === 'CN');

        cnCities.forEach((city, i) => {
            const isTravel = _globeTC && _globeTC[city.nameEn];
            const projected = chinaProjection([city.lng, city.lat]);
            if (!projected) return;
            const [cx, cy] = projected;

            const g = createSVGEl('g', {
                class: `city-marker ${isTravel ? 'city-marker-travel' : 'city-marker-other'}`,
                'data-city': city.nameEn
            });
            g.style.animationDelay = `${800 + i * 40}ms`;

            if (isTravel) {
                const glow = createSVGEl('circle', {
                    cx, cy, r: '12',
                    class: 'marker-glow'
                });
                g.appendChild(glow);
            }

            const dot = createSVGEl('circle', {
                cx, cy,
                r: isTravel ? '5' : '2.5',
                class: 'marker-dot'
            });
            g.appendChild(dot);

            const label = createSVGEl('text', {
                x: cx + (isTravel ? 10 : 6),
                y: cy + 4
            });
            label.textContent = city.name;
            if (isTravel) {
                const evtCount = _globeTC[city.nameEn].events.length;
                if (evtCount > 1) label.textContent += ` (${evtCount})`;
            }
            g.appendChild(label);

            if (isTravel) {
                g.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showCityPopup(city, e);
                });
            }

            group.appendChild(g);
        });
    }

    function showCityPopup(city, e) {
        const popup = document.getElementById('globePopup');
        const data = _globeTC[city.nameEn];
        if (!data) return;

        let html = `<span class="popup-close">&times;</span>`;
        html += `<div class="popup-city">${city.name}</div>`;
        data.events.forEach(ev => {
            html += `<div class="popup-event">`;
            html += `<span class="event-date">${ev.dateKey}</span>`;
            html += `<span class="event-title">${ev.title}</span>`;
            html += `<a class="event-link" href="index.html#gallery" data-date="${ev.dateKey}">照片</a>`;
            html += `</div>`;
        });
        popup.innerHTML = html;
        const w = window.innerWidth;
        const h = window.innerHeight;
        popup.style.left = Math.min(e.clientX + 10, w - 340) + 'px';
        popup.style.top = Math.min(e.clientY - 20, h - 300) + 'px';
        popup.classList.add('visible');
        popup.querySelector('.popup-close').addEventListener('click', () => {
            popup.classList.remove('visible');
        });
    }

    function onProvinceHover(e, feature) {
        const tooltip = document.getElementById('chinaTooltip');
        const name = feature.properties.name;
        const adcode = String(feature.properties.adcode);
        const provinceInfo = window.PROVINCE_CITY_MAP && window.PROVINCE_CITY_MAP[adcode];
        const isVisited = getVisitedProvinces().has(adcode);

        let html = `<div class="tooltip-name">${name}</div>`;
        if (provinceInfo) {
            html += `<div class="tooltip-sub">${provinceInfo.nameEn}${isVisited ? ' · 已去过' : ''}</div>`;
        }

        if (isVisited && provinceInfo && _globeTC) {
            const cities = provinceInfo.cities || [];
            const visitedCities = cities.filter(c => _globeTC[c]);
            let tripCount = 0;
            let firstDate = null;
            visitedCities.forEach(c => {
                const evts = _globeTC[c].events;
                tripCount += evts.length;
                evts.forEach(ev => {
                    if (!firstDate || ev.dateKey < firstDate) firstDate = ev.dateKey;
                });
            });
            html += '<div class="tooltip-divider"></div>';
            html += `<div class="tooltip-stats">${visitedCities.length} 城市 · ${tripCount} 次旅行</div>`;
            if (firstDate) html += `<div class="tooltip-stats">首次: ${firstDate}</div>`;
        } else if (!isVisited) {
            html += '<div class="tooltip-hint">等我们一起去探索吧~</div>';
        }

        tooltip.innerHTML = html;
        tooltip.classList.add('visible');
        moveTooltip(e);

        // Route highlight
        const routeGroup = document.getElementById('routeLinesGroup');
        if (routeGroup && isVisited) {
            routeGroup.classList.add('route-highlight');
        }
    }

    function moveTooltip(e) {
        const tooltip = document.getElementById('chinaTooltip');
        tooltip.style.left = (e.clientX + 16) + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
    }

    function onProvinceLeave() {
        document.getElementById('chinaTooltip').classList.remove('visible');
        const routeGroup = document.getElementById('routeLinesGroup');
        if (routeGroup) routeGroup.classList.remove('route-highlight');
    }

    function onProvinceClick(e, feature, isVisited) {
        if (!isVisited) {
            const path = e.currentTarget;
            path.style.animation = 'none';
            path.offsetHeight;
            path.style.animation = '';
            return;
        }
        // Click ripple effect
        const svg = document.getElementById('chinaMapSvg');
        const rect = svg.getBoundingClientRect();
        const ripple = createSVGEl('circle', {
            cx: e.clientX - rect.left,
            cy: e.clientY - rect.top,
            r: '5',
            class: 'click-ripple'
        });
        svg.appendChild(ripple);
        setTimeout(() => ripple.remove(), 800);

        const adcode = String(feature.properties.adcode);
        zoomToProvince(adcode, feature);
        showProvinceDetailPanel(adcode);
    }

    function zoomToProvince(adcode, feature) {
        currentProvinceZoom = adcode;
        const svg = document.getElementById('chinaMapSvg');
        const g = document.getElementById('provincesGroup');
        const cityGroup = document.getElementById('cityMarkersGroup');
        const routeGroup = document.getElementById('routeLinesGroup');
        const path = svg.querySelector(`[data-adcode="${adcode}"]`);
        if (!path) return;

        const bbox = path.getBBox();
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scale = Math.min(w / bbox.width, h / bbox.height) * 0.55;
        const tx = w / 2 - (bbox.x + bbox.width / 2) * scale;
        const ty = h / 2 - (bbox.y + bbox.height / 2) * scale;

        const transformStr = `translate(${tx}px, ${ty}px) scale(${scale})`;
        const transitionStr = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        g.style.transform = transformStr;

        svg.querySelectorAll('.province').forEach(p => {
            if (p.dataset.adcode === adcode) {
                p.classList.add('zoomed');
                p.classList.remove('dimmed');
            } else {
                p.classList.add('dimmed');
                p.classList.remove('zoomed');
            }
        });

        const provinceInfo = window.PROVINCE_CITY_MAP && window.PROVINCE_CITY_MAP[adcode];
        const provinceCities = provinceInfo ? provinceInfo.cities : [];
        cityGroup.querySelectorAll('.city-marker').forEach(marker => {
            const cityName = marker.dataset.city;
            if (provinceCities.includes(cityName)) {
                marker.style.opacity = '1';
                marker.style.pointerEvents = 'auto';
            } else {
                marker.style.opacity = '0';
                marker.style.pointerEvents = 'none';
            }
        });

        cityGroup.style.transform = transformStr;
        cityGroup.style.transition = transitionStr;

        if (routeGroup) {
            routeGroup.style.transform = transformStr;
            routeGroup.style.transition = transitionStr;
            routeGroup.style.opacity = '0.3';
        }

        document.getElementById('chinaBackProvinceBtn').classList.add('visible');
    }

    function zoomOutToFull() {
        currentProvinceZoom = null;
        const svg = document.getElementById('chinaMapSvg');
        const g = document.getElementById('provincesGroup');
        const cityGroup = document.getElementById('cityMarkersGroup');
        const routeGroup = document.getElementById('routeLinesGroup');

        g.style.transform = 'translate(0, 0) scale(1)';
        cityGroup.style.transform = 'translate(0, 0) scale(1)';
        if (routeGroup) {
            routeGroup.style.transform = 'translate(0, 0) scale(1)';
            routeGroup.style.opacity = '';
        }

        svg.querySelectorAll('.province').forEach(p => {
            p.classList.remove('dimmed', 'zoomed');
        });

        cityGroup.querySelectorAll('.city-marker').forEach(marker => {
            marker.style.opacity = '';
            marker.style.pointerEvents = '';
        });

        document.getElementById('chinaBackProvinceBtn').classList.remove('visible');
        document.getElementById('globePopup').classList.remove('visible');
        hideProvinceDetailPanel();
    }

    function rebuildChinaMap() {
        if (!chinaProvinceFeatures) return;
        const svg = document.getElementById('chinaMapSvg');
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Recalculate custom projection for new viewport
        const lngMin = 73, lngMax = 135, latMin = 18, latMax = 54;
        const mx2 = w * 0.05, mt2 = h * 0.08, mb2 = h * 0.05;
        const drawW2 = w - mx2 * 2, drawH2 = h - mt2 - mb2;
        function mercY2(lat) { return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)); }
        const yMin2 = mercY2(latMin), yMax2 = mercY2(latMax);
        const geoW2 = (lngMax - lngMin) * Math.PI / 180;
        const geoH2 = yMax2 - yMin2;
        const sc2 = Math.min(drawW2 / geoW2, drawH2 / geoH2);
        const realW2 = geoW2 * sc2, realH2 = geoH2 * sc2;
        const ox2 = mx2 + (drawW2 - realW2) / 2;
        const oy2 = mt2 + (drawH2 - realH2) / 2;
        chinaProjection = function(coords) {
            const x = ox2 + ((coords[0] - lngMin) * Math.PI / 180) * sc2;
            const y = oy2 + (yMax2 - mercY2(coords[1])) * sc2;
            return [x, y];
        };
        chinaProjection.stream = function(s) {
            return {
                point: function(lng, lat) { const p = chinaProjection([lng, lat]); s.point(p[0], p[1]); },
                lineStart: function() { s.lineStart(); },
                lineEnd: function() { s.lineEnd(); },
                polygonStart: function() { s.polygonStart(); },
                polygonEnd: function() { s.polygonEnd(); },
                sphere: function() {}
            };
        };
        chinaPathGen = d3.geoPath().projection(chinaProjection);

        // Update province paths
        svg.querySelectorAll('.province').forEach(path => {
            const adcode = path.dataset.adcode;
            const feature = chinaProvinceFeatures.find(f => String(f.properties.adcode) === adcode);
            if (feature) path.setAttribute('d', chinaPathGen(feature));
        });

        // Update city marker positions
        const cnCities = _globeWC.filter(c => c.country === 'CN');
        cnCities.forEach(city => {
            const marker = svg.querySelector(`.city-marker[data-city="${city.nameEn}"]`);
            if (!marker) return;
            const projected = chinaProjection([city.lng, city.lat]);
            if (!projected) return;
            const [cx, cy] = projected;
            marker.querySelectorAll('circle').forEach(circle => {
                circle.setAttribute('cx', cx);
                circle.setAttribute('cy', cy);
            });
            const text = marker.querySelector('text');
            if (text) {
                const isTravel = marker.classList.contains('city-marker-travel');
                text.setAttribute('x', cx + (isTravel ? 10 : 6));
                text.setAttribute('y', cy + 4);
            }
        });

        // Rebuild route lines with new projection
        const routeGroup = document.getElementById('routeLinesGroup');
        if (routeGroup) {
            routeGroup.innerHTML = '';
            renderRouteLines(routeGroup);
        }

        if (currentProvinceZoom) {
            zoomToProvince(currentProvinceZoom, chinaProvinceFeatures.find(f => String(f.properties.adcode) === currentProvinceZoom));
        }
    }

    function handleGlobeClick(e) {
        if (CONFIG.MODES[currentMode] !== 'globe') return;
        if (globeDragging) return;
        const gc = document.getElementById('globeCanvas');
        const rect = gc.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // In china map mode, SVG overlay handles all interactions
        if (chinaMapMode) return;

        // === Globe mode click handling ===
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w, h) * 0.32;
        const radius = baseRadius * globeZoom;

        // Check if click is on China area (for double-click easter egg)
        const chinaCenter = latLngToScreen(35, 104, globeRotX, globeRotY, radius, cx, cy);
        if (chinaCenter.visible) {
            const distToChina = Math.hypot(chinaCenter.sx - mx, chinaCenter.sy - my);
            if (distToChina < radius * 0.35) {
                chinaClickCount++;
                if (chinaClickCount >= 2) {
                    chinaClickCount = 0;
                    if (chinaClickTimer) { clearTimeout(chinaClickTimer); chinaClickTimer = null; }
                    enterChinaMap();
                    return;
                }
                if (chinaClickTimer) clearTimeout(chinaClickTimer);
                chinaClickTimer = setTimeout(() => { chinaClickCount = 0; }, 500);
            }
        }

        // City click detection
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
            popup.style.left = Math.min(e.clientX + 10, w - 340) + 'px';
            popup.style.top = Math.min(e.clientY - 20, h - 300) + 'px';
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
            if (chinaMapMode) return;
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
            if (globeClickMoved && !chinaMapMode) return;
            handleGlobeClick(e);
        });
        gc.addEventListener('wheel', (e) => {
            if (CONFIG.MODES[currentMode] !== 'globe') return;
            if (chinaMapMode) return;
            e.preventDefault();
            globeZoom = Math.max(0.4, Math.min(3.5, globeZoom - e.deltaY * 0.003));
        }, { passive: false });

        // Resize
        window.addEventListener('resize', () => {
            if (!isTransitioning) {
                applyLayout(CONFIG.MODES[currentMode]);
            }
            if (chinaMapInitialized && chinaMapMode) {
                rebuildChinaMap();
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

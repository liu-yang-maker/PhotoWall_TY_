(function () {
    const CONFIG = {
        START_DATE: new Date('2025-11-22T00:00:00'),
        PHOTOS_PER_MODE: 50,
        MODE_AUTO_INTERVAL: 35000,
        TRANSITION_DURATION: 1200,
        MODES: ['heart', 'mosaic', 'carousel', 'orbit', 'spiral', 'waterfall']
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

    // ===== INIT =====
    async function init() {
        await loadImageList();
        createPhotoElements();
        startTimer();
        initParticles();
        initLyrics();
        initBars();
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
        photoElements.forEach(el => el.classList.add('no-transition'));
        function animate() {
            if (!orbitPaused && !orbitDragging) {
                orbitOffset += 0.002;
            }
            positionOrbit(orbitOffset);
            orbitAnimId = requestAnimationFrame(animate);
        }
        orbitAnimId = requestAnimationFrame(animate);
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
        photoElements.forEach(el => el.classList.add('no-transition'));
        function animate() {
            spiralOffset += spiralSpeed;
            positionSpiral(spiralOffset);
            spiralAnimId = requestAnimationFrame(animate);
        }
        spiralAnimId = requestAnimationFrame(animate);
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
            startWaterfallAnimation();
        }, 50);
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

    // ===== MODE SWITCHING =====
    function switchMode(newMode) {
        if (newMode === currentMode) return;
        stopAutoRotate();
        if (mosaicMoveHandler) {
            document.removeEventListener('mousemove', mosaicMoveHandler);
            mosaicMoveHandler = null;
        }
        currentMode = newMode;
        applyLayout(CONFIG.MODES[currentMode]);
        updateModeTags();
        startAutoRotate();
    }

    function nextMode() {
        switchMode((currentMode + 1) % CONFIG.MODES.length);
    }

    function startAutoRotate() {
        stopAutoRotate();
        autoRotateTimer = setInterval(nextMode, CONFIG.MODE_AUTO_INTERVAL);
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

        // Resize
        window.addEventListener('resize', () => {
            applyLayout(CONFIG.MODES[currentMode]);
        });
    }

    // ===== START =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

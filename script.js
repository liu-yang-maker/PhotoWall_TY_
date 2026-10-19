const imageContainer = document.getElementById('galleryGrid');
let currentImageIndex = 0;
let loadedImages = [];
let leftArrow;
let rightArrow;

// 保存所有媒体文件名（Python 生成的 image_list.json，含图片和视频）
let imageList = [];

// 视频格式
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];

function isVideoFile(filename) {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
}

// 视频缩略图加载失败时的占位图（灰色背景 + 播放图标）
const VIDEO_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Crect fill='%23e8e8e8' width='180' height='180'/%3E%3Ctext x='50%25' y='50%25' fill='%23aaa' font-size='36' text-anchor='middle' dy='.35em' font-family='sans-serif'%3E▶%3C/text%3E%3C/svg%3E";

// 视频缩略图路径：图片用 thumbs，视频在浏览器内从第一帧提取
function getThumbPath(filename) {
    if (isVideoFile(filename)) {
        return null; // 视频不从这里取，由 extractVideoFirstFrame 处理
    }
    return `images/thumbs/${filename}`;
}

// 从视频第一帧提取缩略图（纯前端，无需 step2 预生成）
function extractVideoFirstFrame(filename, listIndex, resolve) {
    const videoSrc = `images/${filename}`;
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let done = false;
    const doResolve = (val) => {
        if (done) return;
        done = true;
        resolve(val);
    };

    const fallbackToPlaceholder = () => {
        const placeholderImg = new Image();
        placeholderImg.src = VIDEO_PLACEHOLDER;
        placeholderImg.onload = () =>
            doResolve(createVideoElement(placeholderImg, listIndex, filename));
        placeholderImg.onerror = () => doResolve(null);
    };

    const onSeeked = function () {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
        try {
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (w <= 0 || h <= 0) {
                fallbackToPlaceholder();
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            video.src = '';
            video.load();
            const thumbImg = new Image();
            thumbImg.src = dataUrl;
            thumbImg.onload = () =>
                doResolve(createVideoElement(thumbImg, listIndex, filename));
            thumbImg.onerror = fallbackToPlaceholder;
        } catch (e) {
            fallbackToPlaceholder();
        }
    };

    const onError = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
        video.src = '';
        fallbackToPlaceholder();
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    const timeoutId = setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        video.src = '';
        fallbackToPlaceholder();
    }, 8000);

    video.src = videoSrc;
    video.currentTime = 0;
}

// 情话库
const loveQuotes = [
    "遇见你的那一刻，星星都失去了颜色 ✨",
    "你是我今生最美的相遇，余生最好的陪伴 💖",
    "在这个世界上，只有你让我愿意打破所有规则 🌹",
    "陪伴是最长情的告白，相守是最温暖的承诺 💕",
    "余生很长，我想和你在一起浪费时光 ⏰",
    "因为是你，所以万里迢迢 🚀",
    "我的心跳和你的呼吸，是世界上最美的音乐 🎵",
    "你是我的今天，也是我所有的明天 🌅",
    "爱你是我做过最好的决定 💝",
    "想把全世界最好的都给你，却发现最好的就是你 🎁",
    "春风十里，不如你 🌸",
    "我喜欢你，认真且怂，从一而终 💗",
    "你是我的意外，也是我的宿命 🎲",
    "陪你到世界终结，看尽人间烟火 🎆",
    "所有的心动，都是因为你 💓",
    "你是我的唯一，也是我的永远 ♾️",
    "You are my unexpected encounter, but also my forever love.",
    "Choosing to love you is to love you forever!",
];

// 时间轴数据已抽到 timeline-data.js（index.html 与 anniversary.html 共用，需在 script.js 之前引入）

// 计算恋爱天数
function calculateLoveDays() {
    const startDate = new Date('2025-11-22');
    const today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const timeDiff = today - startDate;
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    document.getElementById('loveDays').innerText = days;
}

// 生成每日情话
function generateDailyQuote() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % loveQuotes.length;
    return loveQuotes[index];
}

// 随机生成情话
function generateRandomQuote() {
    const randomIndex = Math.floor(Math.random() * loveQuotes.length);
    return loveQuotes[randomIndex];
}

// 显示情话（打字机效果）
let typewriterTimer = null;
function displayQuote(quote) {
    const quoteText = document.getElementById('quoteText');
    if (typewriterTimer) clearInterval(typewriterTimer);

    quoteText.style.opacity = '0';
    quoteText.style.transform = 'translateY(10px)';

    setTimeout(() => {
        quoteText.style.opacity = '1';
        quoteText.style.transform = 'translateY(0)';
        quoteText.style.transition = 'all 0.4s ease';
        quoteText.innerText = '';
        let i = 0;
        typewriterTimer = setInterval(() => {
            if (i < quote.length) {
                quoteText.innerText += quote[i];
                i++;
            } else {
                clearInterval(typewriterTimer);
                typewriterTimer = null;
            }
        }, 60);
    }, 300);
}

// 自动轮换情话
let quoteInterval;
function startQuoteAutoRotate() {
    if (quoteInterval) {
        clearInterval(quoteInterval);
    }
    quoteInterval = setInterval(() => {
        displayQuote(generateRandomQuote());
    }, 5000);
}

const STORY_CITIES = {
    shanghai: '上海',
    beijing: '北京',
    taizhou: '台州',
    zhangjiakou: '张家口',
    dalian: '大连',
    yantai: '烟台',
    jiujiang: '九江',
    shenzhen: '深圳',
    xianggang: '香港',
};

let activeStoryIndex = -1;
let storySyncLock = 0;
let storyFollowGallery = false;
const STORY_FILM_LIMIT = 8;

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function linkifyHtml(escaped) {
    return escaped.replace(/https?:\/\/[^\s<]+/g, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
    });
}

function storyLinkHtml(item) {
    if (!item.link) return '';
    const label = escapeHtml(item.linkText || '翻开这一页');
    const href = escapeHtml(item.link);
    const external = /^https?:\/\//.test(item.link);
    const extra = external ? ' target="_blank" rel="noopener"' : '';
    return `<a class="story-weblink" href="${href}"${extra}>${label} &#8594;</a>`;
}

function photosForDate(dateKey) {
    if (!dateKey || !imageList || !imageList.length) return [];
    const photos = [];
    imageList.forEach((name, index) => {
        if (name.startsWith(dateKey)) photos.push({ name, index });
    });
    return photos;
}

function findStoryIndexByDate(dateKey) {
    if (!dateKey) return -1;
    const exact = timelineData.findIndex((item) => item.dateKey === dateKey);
    if (exact !== -1) return exact;
    let best = -1;
    timelineData.forEach((item, i) => {
        if (!item.dateKey || item.dateKey.startsWith('3030')) return;
        if (item.dateKey <= dateKey) best = i;
    });
    return best;
}

function storyRailLabel(item) {
    if (!item.dateKey || item.dateKey.startsWith('3030')) return '未完';
    const parts = item.date.split('.');
    return parts.length >= 3 ? `${parts[1]}.${parts[2]}` : item.date;
}

function scrollRailToNode(node) {
    const rail = document.getElementById('storyRail');
    if (!rail || !node) return;
    let left = rail.scrollLeft;
    let top = rail.scrollTop;
    const nodeLeft = node.offsetLeft;
    const nodeRight = nodeLeft + node.offsetWidth;
    const nodeTop = node.offsetTop;
    const nodeBottom = nodeTop + node.offsetHeight;
    if (nodeLeft < left) left = nodeLeft;
    else if (nodeRight > left + rail.clientWidth) left = nodeRight - rail.clientWidth;
    if (nodeTop < top) top = nodeTop;
    else if (nodeBottom > top + rail.clientHeight) top = nodeBottom - rail.clientHeight;
    if (left !== rail.scrollLeft || top !== rail.scrollTop) {
        rail.scrollTo({ left, top, behavior: 'smooth' });
    }
}

function clearPhotoLink() {
    document.querySelectorAll('.is-linked').forEach((el) => el.classList.remove('is-linked'));
}

function scrollToPhotoByDate(dateKey, focusIndex) {
    if (!dateKey) return false;
    const group = document.querySelector(`.gallery-date-group[data-date-key="${dateKey}"]`);
    if (!group) return false;

    const separator = group.previousElementSibling;
    let target = separator && separator.classList.contains('gallery-date-separator') ? separator : group;
    if (focusIndex != null) {
        const focused = group.querySelector(`[data-index="${focusIndex}"]`);
        const card = focused ? (focused.closest('.polaroid') || focused) : null;
        if (card) target = card;
    }

    storySyncLock = Date.now() + 1200;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    clearPhotoLink();
    group.classList.add('is-linked');
    if (separator && separator.classList.contains('gallery-date-separator')) {
        separator.classList.add('is-linked');
    }

    if (focusIndex != null) {
        const polaroid = group.querySelector(`img[data-index="${focusIndex}"]`)?.closest('.polaroid');
        if (polaroid) {
            polaroid.classList.add('highlight-photo');
            setTimeout(() => polaroid.classList.remove('highlight-photo'), 1600);
        }
    }
    return true;
}

function renderStoryStage(index) {
    const stage = document.getElementById('storyStage');
    const item = timelineData[index];
    if (!stage || !item) return;

    const photos = photosForDate(item.dateKey);
    const city = item.city ? STORY_CITIES[item.city] : '';
    const shown = photos.slice(0, STORY_FILM_LIMIT);
    const extra = photos.length - shown.length;

    let film = '';
    if (shown.length) {
        film = `<div class="story-film">${shown.map((photo) => {
            const video = isVideoFile(photo.name);
            const src = video ? VIDEO_PLACEHOLDER : `images/thumbs/${photo.name}`;
            const fallback = video ? '' : ` onerror="this.src='images/${photo.name}'"`;
            return `<button class="story-thumb${video ? ' is-video' : ''}" type="button" data-photo-index="${photo.index}" data-date-key="${item.dateKey}">
                <img src="${src}" alt="" loading="lazy"${fallback}>
            </button>`;
        }).join('')}${extra > 0 ? `<button class="story-more" type="button" data-date-key="${item.dateKey}">+${extra}</button>` : ''}</div>`;
    } else {
        const emptyText = item.dateKey && item.dateKey.startsWith('3030')
            ? '下一张照片，会接在这里。'
            : '这一段先写在字里，照片还在路上。';
        film = `<p class="story-empty">${emptyText}</p>`;
    }

    const jump = photos.length
        ? `<button class="story-jump" type="button" data-date-key="${item.dateKey}">去照片墙看这 ${photos.length} 张</button>`
        : '<span></span>';

    stage.innerHTML = `
        <div class="story-stage-top">
            <div class="story-stage-meta">
                <span class="story-stage-date">${escapeHtml(item.date)}</span>
                ${city ? `<span class="story-stage-city">${city}</span>` : ''}
            </div>
            <span class="story-stage-index">${String(index + 1).padStart(2, '0')} / ${String(timelineData.length).padStart(2, '0')}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${linkifyHtml(escapeHtml(item.description))}</p>
        ${storyLinkHtml(item)}
        ${film}
        <div class="story-actions">
            ${jump}
            <div class="story-steps">
                <button class="story-step" type="button" data-step="-1" ${index === 0 ? 'disabled' : ''}>上一段</button>
                <button class="story-step" type="button" data-step="1" ${index === timelineData.length - 1 ? 'disabled' : ''}>下一段</button>
            </div>
        </div>
    `;

    stage.querySelectorAll('.story-thumb').forEach((btn) => {
        btn.addEventListener('click', () => {
            const photoIndex = parseInt(btn.dataset.photoIndex, 10);
            const filename = imageList[photoIndex];
            if (!filename) return;
            const mediaType = isVideoFile(filename) ? 'video' : 'image';
            showPopup(`images/${filename}`, parseDateFromFilename(filename), photoIndex, mediaType);
        });
    });
    stage.querySelectorAll('.story-more, .story-jump').forEach((btn) => {
        btn.addEventListener('click', () => {
            scrollToPhotoByDate(btn.dataset.dateKey);
        });
    });
    stage.querySelectorAll('.story-step').forEach((btn) => {
        btn.addEventListener('click', () => {
            const next = index + parseInt(btn.dataset.step, 10);
            selectStory(next, { scrollPhotos: false });
        });
    });
}

function refreshStoryCounts() {
    document.querySelectorAll('.story-node').forEach((node) => {
        const item = timelineData[parseInt(node.dataset.index, 10)];
        const count = photosForDate(item && item.dateKey).length;
        const badge = node.querySelector('.story-node-count');
        if (!badge) return;
        badge.textContent = count ? String(count) : '';
        badge.classList.toggle('is-empty', !count);
    });
}

function selectStory(index, options) {
    if (index < 0 || index >= timelineData.length) return;
    const opts = options || {};
    activeStoryIndex = index;

    document.querySelectorAll('.story-node').forEach((node) => {
        const on = parseInt(node.dataset.index, 10) === index;
        node.classList.toggle('active', on);
        node.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) scrollRailToNode(node);
    });

    renderStoryStage(index);

    if (opts.scrollPhotos) {
        const item = timelineData[index];
        scrollToPhotoByDate(item.dateKey);
    }
}

function renderTimeline() {
    const rail = document.getElementById('storyRail');
    if (!rail) return;
    rail.innerHTML = '';

    timelineData.forEach((item, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'story-node';
        button.dataset.index = String(i);
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', 'false');
        button.innerHTML = `
            <span class="story-node-heart"></span>
            <span class="story-node-copy">
                <span class="story-node-date">${escapeHtml(storyRailLabel(item))}</span>
                <span class="story-node-title">${escapeHtml(item.title)}</span>
            </span>
            <span class="story-node-count is-empty"></span>
        `;
        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
        button.addEventListener('click', () => {
            selectStory(i, { scrollPhotos: false });
        });
        rail.appendChild(button);
    });

    const latest = timelineData.length > 1 && timelineData[timelineData.length - 1].dateKey.startsWith('3030')
        ? timelineData.length - 2
        : Math.max(timelineData.length - 1, 0);
    selectStory(latest, { scrollPhotos: false });
}

function galleryIsReading() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return false;
    const rect = gallery.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.45 && rect.bottom > window.innerHeight * 0.3;
}

function syncStoryFromGallery(dateKey) {
    if (!storyFollowGallery || Date.now() < storySyncLock) return;
    if (!galleryIsReading()) return;
    const index = findStoryIndexByDate(dateKey);
    if (index < 0 || index === activeStoryIndex) return;
    selectStory(index, { scrollPhotos: false });
}

function bindGalleryStorySync() {
    const groups = document.querySelectorAll('.gallery-date-group');
    if (!groups.length) return;

    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const key = entry.target.getAttribute('data-date-key');
            if (entry.isIntersecting) visible.set(key, entry.intersectionRatio);
            else visible.delete(key);
        });
        let bestKey = null;
        let bestRatio = 0;
        visible.forEach((ratio, key) => {
            if (ratio > bestRatio) {
                bestRatio = ratio;
                bestKey = key;
            }
        });
        if (bestKey) syncStoryFromGallery(bestKey);
    }, { threshold: [0.35, 0.6], rootMargin: '-30% 0px -45% 0px' });

    groups.forEach((group) => observer.observe(group));
    window.addEventListener('scroll', () => {
        if (galleryIsReading()) storyFollowGallery = true;
    }, { passive: true });

    document.querySelectorAll('.gallery-date-separator.has-story').forEach((separator) => {
        separator.addEventListener('click', () => {
            const index = parseInt(separator.dataset.storyIndex, 10);
            if (Number.isNaN(index)) return;
            selectStory(index, { scrollPhotos: false });
            document.getElementById('timeline').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// 加载 image_list.json
async function loadImageList() {
    try {
        const res = await fetch(`images/image_list.json?ts=${Date.now()}`);
        if (!res.ok) {
            console.error('Failed to load image_list.json');
            return;
        }
        const list = await res.json();
        if (Array.isArray(list)) {
            imageList = list;
        } else {
            console.error('image_list.json format error');
        }
    } catch (e) {
        console.error('Error loading image_list.json', e);
    }
}

// 旋转 class 列表
const ROTATION_CLASSES = ['rot-a', 'rot-b', 'rot-c', 'rot-d', 'rot-e'];

// 预构建日期分组 + 骨架屏结构
function buildGalleryStructure() {
    const galleryGrid = document.getElementById('galleryGrid');
    galleryGrid.innerHTML = '';

    let currentDate = null;
    let currentGroup = null;
    let posInGroup = 0;

    imageList.forEach((filename, index) => {
        const dateKey = filename.substring(0, 10); // "2025-11-14"

        if (dateKey !== currentDate) {
            currentDate = dateKey;
            posInGroup = 0;

            // 日期分隔标签（有对应故事时带上标题，点一下回到时间轴）
            const separator = document.createElement('div');
            separator.className = 'gallery-date-separator';
            const parts = dateKey.split('-');
            const storyIndex = timelineData.findIndex((item) => item.dateKey === dateKey);
            if (storyIndex !== -1) {
                separator.classList.add('has-story');
                separator.dataset.storyIndex = String(storyIndex);
            }
            const storyTitle = storyIndex !== -1 ? timelineData[storyIndex].title : '';
            separator.innerHTML = `<span class="date-separator-text">${parts[0]}.${parts[1]}.${parts[2]}</span>${storyTitle ? `<span class="date-separator-title">${escapeHtml(storyTitle)}</span>` : ''}`;
            galleryGrid.appendChild(separator);

            // 日期分组容器
            currentGroup = document.createElement('div');
            currentGroup.className = 'gallery-date-group';
            currentGroup.setAttribute('data-date-key', dateKey);
            galleryGrid.appendChild(currentGroup);
        }

        // 骨架屏占位
        const skeleton = document.createElement('div');
        skeleton.className = 'gallery-skeleton';
        skeleton.setAttribute('data-index', index);
        skeleton.style.transitionDelay = `${posInGroup * 0.05}s`;
        skeleton.innerHTML = '<div class="skeleton-img"></div><span class="skeleton-date"></span>';
        currentGroup.appendChild(skeleton);
        posInGroup++;
    });
}

// 懒加载：只有骨架屏进入视口附近时才加载对应图片
function loadAllImages() {
    if (!imageList || imageList.length === 0) return;

    buildGalleryStructure();

    const lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const skeleton = entry.target;
            const i = parseInt(skeleton.getAttribute('data-index'));
            lazyObserver.unobserve(skeleton);

            loadThumbnail(i).then(element => {
                if (!element) return;
                element.classList.add('gallery-fade-in');
                element.style.transitionDelay = skeleton.style.transitionDelay;
                skeleton.replaceWith(element);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        element.classList.add('visible');
                    });
                });
            });
        });
    }, { rootMargin: '200px 0px' });

    document.querySelectorAll('.gallery-skeleton').forEach(sk => {
        lazyObserver.observe(sk);
    });
}

function parseDateFromFilename(filename) {
    const match = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : '';
}

function loadThumbnail(listIndex) {
    return new Promise((resolve) => {
        if (!imageList[listIndex]) {
            resolve(null);
            return;
        }

        const filename = imageList[listIndex];

        // 视频：从前端提取第一帧作为缩略图
        if (isVideoFile(filename)) {
            extractVideoFirstFrame(filename, listIndex, resolve);
            return;
        }

        // 图片：从 thumbs 加载，失败则降级到原图
        const thumbPath = getThumbPath(filename);
        const thumbImg = new Image();
        thumbImg.src = thumbPath;

        thumbImg.onload = function () {
            resolve(createImageElement(thumbImg, listIndex, filename));
        };

        thumbImg.onerror = function () {
            thumbImg.src = `images/${filename}`;
            thumbImg.onload = function () {
                resolve(createImageElement(thumbImg, listIndex, filename));
            };
            thumbImg.onerror = function () {
                resolve(null);
            };
        };
    });
}

// 创建视频卡片元素（Polaroid 包裹 + 点击播放）
function createVideoElement(thumbImg, listIndex, filename) {
    const dateStr = parseDateFromFilename(filename);

    const polaroid = document.createElement('div');
    polaroid.className = 'polaroid video-card ' + ROTATION_CLASSES[listIndex % ROTATION_CLASSES.length];

    const imgElement = document.createElement('img');
    imgElement.dataset.large = `images/${filename}`;
    imgElement.src = thumbImg.src;
    imgElement.alt = filename;
    imgElement.setAttribute('data-index', listIndex);
    imgElement.setAttribute('data-date', dateStr);

    const dateLabel = document.createElement('span');
    dateLabel.className = 'polaroid-date';
    dateLabel.textContent = dateStr;

    loadedImages[listIndex] = {
        src: imgElement.dataset.large,
        date: dateStr,
        type: 'video',
    };

    polaroid.appendChild(imgElement);
    polaroid.appendChild(dateLabel);
    polaroid.addEventListener('click', function () {
        const storyIndex = findStoryIndexByDate(filename.substring(0, 10));
        if (storyIndex >= 0) selectStory(storyIndex, { scrollPhotos: false });
        showPopup(imgElement.dataset.large, dateStr, listIndex, 'video');
    });

    return polaroid;
}

// 创建图片卡片元素（Polaroid 包裹 + 日期标签）
function createImageElement(thumbImg, listIndex, filename) {
    const dateStr = parseDateFromFilename(filename);

    const polaroid = document.createElement('div');
    polaroid.className = 'polaroid ' + ROTATION_CLASSES[listIndex % ROTATION_CLASSES.length];

    const imgElement = document.createElement('img');
    imgElement.loading = 'lazy';
    imgElement.dataset.large = `images/${filename}`;
    imgElement.src = thumbImg.src;
    imgElement.alt = filename;
    imgElement.setAttribute('data-index', listIndex);
    imgElement.setAttribute('data-date', dateStr);

    const dateLabel = document.createElement('span');
    dateLabel.className = 'polaroid-date';
    dateLabel.textContent = dateStr;

    loadedImages[listIndex] = {
        src: imgElement.dataset.large,
        date: dateStr,
        type: 'image',
    };

    polaroid.appendChild(imgElement);
    polaroid.appendChild(dateLabel);
    polaroid.addEventListener('click', function () {
        const storyIndex = findStoryIndexByDate(filename.substring(0, 10));
        if (storyIndex >= 0) selectStory(storyIndex, { scrollPhotos: false });
        showPopup(imgElement.dataset.large, dateStr, listIndex, 'image');
    });

    return polaroid;
}

function showPopup(src, date, indexInList, mediaType = 'image') {
    currentImageIndex = indexInList;
    const popup = document.getElementById('popup');
    const popupImg = document.getElementById('popupImg');
    const popupVideo = document.getElementById('popupVideo');
    const imgDate = document.getElementById('imgDate');

    popup.style.display = 'flex';

    popupImg.style.display = 'none';
    popupImg.src = '';
    popupVideo.style.display = 'none';
    popupVideo.pause();
    popupVideo.src = '';
    imgDate.innerText = date || '';

    if (mediaType === 'video') {
        popupVideo.src = src;
        popupVideo.muted = false;
        popupVideo.volume = 1;
        popupVideo.style.display = 'block';
        popupVideo.load();
    } else {
        const fullImg = new Image();
        fullImg.crossOrigin = 'Anonymous';
        fullImg.src = src;

        fullImg.onload = function () {
            popupImg.src = src;
            popupImg.style.display = 'block';
        };

        fullImg.onerror = function () {
            imgDate.innerText = 'Load failed';
        };
    }

    leftArrow.style.display = 'flex';
    rightArrow.style.display = 'flex';

    if (currentImageIndex > 0) {
        leftArrow.classList.remove('disabled');
    } else {
        leftArrow.classList.add('disabled');
    }

    if (loadedImages[currentImageIndex + 1]) {
        rightArrow.classList.remove('disabled');
    } else {
        rightArrow.classList.add('disabled');
    }
}

function closePopup() {
    const popup = document.getElementById('popup');
    const popupImg = document.getElementById('popupImg');
    const popupVideo = document.getElementById('popupVideo');
    const imgDate = document.getElementById('imgDate');
    popup.style.display = 'none';
    popupImg.src = '';
    popupImg.style.display = 'none';
    popupVideo.pause();
    popupVideo.src = '';
    popupVideo.style.display = 'none';
    imgDate.innerText = '';

    leftArrow.style.display = 'none';
    rightArrow.style.display = 'none';
}

function showPreviousImage() {
    const prevIndex = currentImageIndex - 1;
    if (prevIndex >= 0) {
        if (loadedImages[prevIndex]) {
            currentImageIndex = prevIndex;
            const imgData = loadedImages[prevIndex];
            showPopup(imgData.src, imgData.date, prevIndex, imgData.type || 'image');
        } else {
            leftArrow.classList.add('disabled');
        }
    }
}

function showNextImage() {
    const nextIndex = currentImageIndex + 1;
    if (loadedImages[nextIndex]) {
        currentImageIndex = nextIndex;
        const imgData = loadedImages[nextIndex];
        showPopup(imgData.src, imgData.date, nextIndex, imgData.type || 'image');
    } else {
        rightArrow.classList.add('disabled');
    }
}

window.addEventListener('keydown', function (event) {
    const popup = document.getElementById('popup');
    if (!popup) return;
    if (popup.style.display === 'flex' || popup.style.display === 'block') {
        if (event.key === 'ArrowLeft') {
            showPreviousImage();
        } else if (event.key === 'ArrowRight') {
            showNextImage();
        } else if (event.key === 'Escape') {
            closePopup();
        }
    }
});

// 纪念日倒计时
function updateCountdowns() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    document.querySelectorAll('.date-item').forEach(item => {
        const month = parseInt(item.getAttribute('data-month'));
        const day = parseInt(item.getAttribute('data-day'));
        const countdownEl = item.querySelector('.countdown-text');
        if (!month || !day || !countdownEl) return;

        let nextDate = new Date(currentYear, month - 1, day);
        nextDate.setHours(0, 0, 0, 0);
        if (nextDate < today) {
            nextDate = new Date(currentYear + 1, month - 1, day);
        }

        const diff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        if (diff === 0) {
            countdownEl.textContent = 'Today!';
            item.classList.add('is-today');
        } else {
            countdownEl.textContent = diff + ' days to go';
        }
    });
}

// 自定义音乐播放器
function initMusicPlayer() {
    const bgm = document.getElementById('bgm');
    const toggleBtn = document.getElementById('musicToggle');
    const icon = document.getElementById('musicIcon');
    const vinyl = document.getElementById('vinylDisc');
    let isPlaying = false;

    toggleBtn.addEventListener('click', function () {
        if (isPlaying) {
            bgm.pause();
            icon.innerHTML = '&#9654;';
            vinyl.classList.remove('spinning');
        } else {
            bgm.play();
            icon.innerHTML = '&#9646;&#9646;';
            vinyl.classList.add('spinning');
        }
        isPlaying = !isPlaying;
    });

    bgm.addEventListener('ended', function () {
        bgm.currentTime = 0;
        bgm.play();
    });
}

// 滚动进入动画 (Intersection Observer)
function initScrollReveal() {
    const sections = document.querySelectorAll('#loveQuote, #dates, #timeline, #receiptStage, #gallery');
    sections.forEach(s => s.classList.add('scroll-reveal'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    sections.forEach(s => observer.observe(s));
}

// ===== 爱心互动彩蛋 =====

// 双击弹出甜蜜语录气泡
const bubbleQuotes = [
    "想你了", "抱抱你", "你最好看", "永远喜欢你", "你是我的小太阳",
    "今天也爱你", "mua~", "你笑起来真好看", "一直在你身边", "我的宝贝",
    "You are my everything", "Forever yours"
];

function initDoubleTapBubble() {
    document.addEventListener('dblclick', function (e) {
        // 不在弹窗或按钮上触发
        if (e.target.closest('#popup') || e.target.closest('button') || e.target.closest('a')) return;

        const bubble = document.createElement('div');
        bubble.className = 'love-bubble';
        bubble.textContent = bubbleQuotes[Math.floor(Math.random() * bubbleQuotes.length)];
        bubble.style.left = Math.min(e.clientX - 40, window.innerWidth - 280) + 'px';
        bubble.style.top = (e.clientY - 20) + 'px';
        document.body.appendChild(bubble);
        setTimeout(() => bubble.remove(), 2600);
    });
}

// 隐藏烟花彩蛋 (连续快速点击 5 次触发)
let rapidClickCount = 0;
let rapidClickTimer = null;

function initFireworkEasterEgg() {
    document.addEventListener('click', function () {
        rapidClickCount++;
        if (rapidClickTimer) clearTimeout(rapidClickTimer);
        rapidClickTimer = setTimeout(() => { rapidClickCount = 0; }, 800);

        if (rapidClickCount >= 5) {
            rapidClickCount = 0;
            launchFireworks();
        }
    });
}

function launchFireworks() {
    const canvas = document.createElement('canvas');
    canvas.className = 'firework-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const textEl = document.createElement('div');
    textEl.className = 'firework-text';
    textEl.textContent = 'I Love You Forever';
    document.body.appendChild(textEl);

    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#ff6f61', '#b76e79', '#c9b1ff', '#ffb6c1', '#ffeaa7', '#ff6b81', '#fab1a0'];

    // 创建多波烟花
    function burst(x, y) {
        const count = 60 + Math.floor(Math.random() * 40);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
            const speed = 2 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.012 + Math.random() * 0.01,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 2 + Math.random() * 2
            });
        }
    }

    // 发射多波
    burst(canvas.width * 0.3, canvas.height * 0.35);
    burst(canvas.width * 0.7, canvas.height * 0.3);
    setTimeout(() => burst(canvas.width * 0.5, canvas.height * 0.25), 300);
    setTimeout(() => burst(canvas.width * 0.2, canvas.height * 0.4), 600);
    setTimeout(() => burst(canvas.width * 0.8, canvas.height * 0.35), 600);

    let frame;
    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04; // gravity
            p.vx *= 0.99;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (particles.length > 0) {
            frame = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(frame);
            canvas.remove();
            textEl.style.transition = 'opacity 1s';
            textEl.style.opacity = '0';
            setTimeout(() => textEl.remove(), 1000);
        }
    }
    animate();
}

// 侧边导航滚动高亮
function initSideNav() {
    const dots = document.querySelectorAll('.side-nav-dot');
    const sectionIds = Array.from(dots).map(d => d.getAttribute('data-section'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                dots.forEach(d => d.classList.remove('active'));
                const active = document.querySelector(`.side-nav-dot[data-section="${id}"]`);
                if (active) active.classList.add('active');
            }
        });
    }, { threshold: 0.3, rootMargin: '-80px 0px -40% 0px' });

    sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });
}

// 隐藏加载动画
function hideLoadingScreen() {
    const loading = document.getElementById('loadingScreen');
    if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => { loading.style.display = 'none'; }, 800);
    }
}

// 页面加载完成后初始化（仅在主页执行）
window.onload = function () {
    if (!document.getElementById('galleryGrid')) return;

    // 隐藏加载动画
    hideLoadingScreen();

    // 计算恋爱天数
    calculateLoveDays();

    // 纪念日倒计时
    updateCountdowns();

    // 显示每日情话
    displayQuote(generateDailyQuote());
    startQuoteAutoRotate();

    // 渲染时间轴（带联动）
    renderTimeline();

    // 自定义音乐播放器
    initMusicPlayer();

    // 滚动进入动画
    initScrollReveal();

    // 侧边导航
    initSideNav();

    // 互动彩蛋
    initDoubleTapBubble();
    initFireworkEasterEgg();

    // 情话按钮事件
    document.getElementById('newQuoteBtn').addEventListener('click', function () {
        displayQuote(generateRandomQuote());
        startQuoteAutoRotate();
    });

    loadImageList().then(() => {
        refreshStoryCounts();
        if (activeStoryIndex >= 0) renderStoryStage(activeStoryIndex);
        loadAllImages();
        bindGalleryStorySync();
    });

    document.getElementById('closeBtn').addEventListener('click', closePopup);

    leftArrow = document.getElementById('leftArrow');
    rightArrow = document.getElementById('rightArrow');
    leftArrow.addEventListener('click', showPreviousImage);
    rightArrow.addEventListener('click', showNextImage);
    leftArrow.style.display = 'none';
    rightArrow.style.display = 'none';
};
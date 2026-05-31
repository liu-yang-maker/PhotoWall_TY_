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

// 时间轴数据（增加 dateKey 方便和照片联动，city 对应地球模式中的城市标记）
const timelineData = [
    {
        date: "2025.11.14",
        dateKey: "2025-11-14",
        city: "shanghai",
        title: "我们在上海",
        description: "你是天蝎的脑袋，嘿嘿我是天蝎尾巴，你爱吃点小辣，但是好像也不能吃太辣。我希望你高高兴兴的做自己的事，有自己的事业我当然为你一起骄傲，我想给你兜底是我的选择，但我不想限制你，不想给你什么压力。喜欢花花，喜欢美美的，干干净净的。你喜欢健身，重感情（和我很像，我很心疼，但我也很庆幸遇到的是你。）你喜欢听音乐，看美剧韩剧，我会一个一个补，一首一首听。"
    },
    {
        date: "2025.11.22",
        dateKey: "2025-11-22",
        city: "beijing",
        title: "我们在在北京，我们正式在一起了",
        description: "今天，我们正式牵起手，往同一个方向走了。谢谢你陪我过生日——带你去吃了我一直想带你去的餐厅，一起喝了Peets Coffee，选了一对简简单单的戒指。我们看了场电影，散了一段长长的步。夜晚的风很轻，路好像没有尽头。"
    },
    {
        date: "2025.12.08",
        dateKey: "2025-12-08",
        city: "shanghai",
        title: "我们在上海",
        description: "和你在一起的这四天，上海好像突然变成了我们的城市。看《疯狂动物城2》的时候，我轻轻叫你”partner”。第二天在外滩，我跟着你走过的路走，悄悄希望你的记忆里从此都有我。第三天在武康路，我...，但你笑着抱住我说”会一直和我在一起”。最后一天去你学校，走着你曾经走过的那些路，我们的未来会很长很坚定。"
    },
    {
        date: "2025.12.12",
        dateKey: "2025-12-12",
        city: null,
        title: "我们的圣诞主题网页上线",
        description: "https://liu-yang-maker.github.io/Christmas-tree-TY/"
    },
    {
        date: "2025.12.20",
        dateKey: "2025-12-20",
        city: "shanghai",
        title: "我们在上海",
        description: "我们一起看《阿凡达》，打扮圣诞树，冬至一起吃饺子，坐很久的公交漫游上海，也在愚园路的洋房里静静分享一个午后。我带你见了我身边的人，你也慢慢走进我的日常。这个冬天，因为有你，上海变得温暖而踏实。"
    },
    {
        date: "2025.12.29",
        dateKey: "2025-12-29",
        city: "taizhou",
        title: "我们在台州·第一次旅行",
        description: "这是我们第一次一起旅行，也是一起跨年。我们从上海出发，住在温岭海边的民宿，一起看海、爬山、走老街。在麒麟山看日落，在对戒台许愿，在紫阳街吃小吃，在城墙上手牵手走过。虽然有些地方没来得及去，但每一刻都因为你在身边而变得完整。这是我们第一次一起迎接新年，也让我更确信：以后每一年，我都想和你一起度过。"
    },
    {
        date: "2026.01.01",
        dateKey: "2026-01-01",
        city: "taizhou",
        title: "我们在新年·许下约定",
        description: "去岁千般皆如愿，今年万事定称心。”这是我们第一次一起跨年，你在身边，就是最好的新年礼物。我说了很多心里话，也听你讲了很多过去的故事。我时常担心爱得太快，却又庆幸相遇不晚。我想给你安全感，也想给你全部的我。未来的路还很长，但我想和你一起，一步一步把它走成我们的故事。"
    },
    {
        date: "2026.01.19",
        dateKey: "2026-01-19",
        city: null,
        title: "一个羞耻的表白网页上线",
        description: "https://liu-yang-maker.github.io/love_wxt_in_your_face/"
    },
    {
        date: "2026.01.30",
        dateKey: "2026-01-30",
        city: "shanghai",
        title: "我们在上海",
        description: "在坦诚与谅解中关系深化。我害怕你的犹豫，真心只愿共度此生；你读懂我的不安，放下过往的芥蒂，只求慢慢并肩而行。两次深夜的对话，一次是攥紧的承诺，一次是舒展的包容，用长久的陪伴回答所有关于未来的疑问。"
    },
    {
        date: "2026.02.06",
        dateKey: "2026-02-06",
        city: "beijing",
        title: "我们在北京",
        description: "见了你干妈、妹妹和很多好朋友们，带你走了很多我之前求学/工作走过的路，一起去了曲水兰亭，吃得好撑啊hhh"
    },
    {
        date: "2026.02.12",
        dateKey: "2026-02-12",
        city: "zhangjiakou",
        title: "我们在河北张家口",
        description: "我第一次去你家，见到了你爸爸妈妈，还有你的奶奶，很开心。一起走了走你小时候的路，还吃了莜面、涮羊肉、吃了你家现包的饺子。"
    },
    {
        date: "2026.02.17",
        dateKey: "2026-02-17",
        city: null,
        title: "我们的第一次一起过年（异地）",
        description: "我们各自回老家过年，虽然不在一个城市，但是感觉很幸福。祝福我的彤彤宝宝身体健康，马年大吉，和我一起白头！我们要去做很多事情，很多的惊喜幸运等着我们！也愿平淡的生活因为有你我的陪伴而精彩！我们要一直做彼此最亲密唯一的爱人。"
    },
    {
        date: "2026.02.24",
        dateKey: "2026-02-24",
        city: "beijing",
        title: "我们在北京",
        description: "好久没见面了，在北京短暂得见了两天，陪我去清华见了老板，一起看了电影，一起给鸣人准备去上海的手续。"
    },
    {
        date: "2026.02.28",
        dateKey: "2026-02-28",
        city: "shanghai",
        title: "我们在上海，结束了异地",
        description: "我们结束了异地，我们一起租好了房子，我搬到了上海，我们一起在附近散步，虽然下着雨，但我们能离得更近一些了。带你见了很多我的朋友，带你去了公司附近，一起在滨江绿地散步，还有很多事要一起做。"
    },
    {
        date: "2026.04.01",
        dateKey: "2026-04-01",
        city: "shanghai",
        title: "我们在上海，一起玩了很多东西",
        description: "在上海又攒了好多一起做的事：蓝蛙吃一顿、陕西南路慢慢逛、静安寺走一走，滨江绿道也去了好多次，每次吹风散步都像把平常的日子过成小小的约会。也带你见了我的高中同学和大学同学们，想让身边的人都知道，陪在我身边的就是你。"
    },
    {
        date: "2026.04.06",
        dateKey: "2026-04-06",
        city: "shanghai",
        title: "我们在上海，一起去了迪士尼",
        description: "我们又去安福路转转、静安大悦城逛逛，把周末一路带进夜色里，这几天好像怎么都不够长。终于一起去了上海迪士尼，像闯进童话里走了一整天，还看了那场互动情景剧，跟着笑、跟着起哄，人群里牵着你的手特别踏实。"
    },
    {
        date: "2026.04.29",
        dateKey: "2026-04-29",
        city: "shanghai",
        title: "我们在上海，四月底小结",
        description: "四月底小结，我一直在忙毕业的事，你一直在忙科研，虽然我们都很辛苦，但是很幸福。我们一起吃了蓝蛙、一起去了淮海路、一起喝了咖啡刺客、一起在西岸散步。"
    },
    {
        date: "2026.04.30",
        dateKey: "2026-04-30",
        city: "dalian",
        title: "我们在大连旅游",
        description: "第一次一起看北方的海，风比上海的大，但牵着你的手就觉得刚刚好。星海广场的夕阳、滨海路沿途的蓝、银沙滩踩过的浪，都变成了我们的。第一次吃海胆，鲜得睁大了眼睛；东北灵丹咖啡每一杯都是惊喜，和你一起什么都想试试看。"
    },
    {
        date: "2026.05.04",
        dateKey: "2026-05-04",
        city: "yantai",
        title: "我们在烟台旅游",
        description: "从大连到烟台，继续沿着海岸线走。爬烟台山俯瞰整片海湾，在浴场踩着浪花追来追去，去看了孤独的鲸——其实和你在一起就不觉得孤独。排了好长的队买老式面包，小炒鸡香到停不下筷子，海鲜更是一口接一口。整趟旅行都在吃、在笑、在走，最好的五一就是这样吧。"
    },
    {
        date: "2026.05.09",
        dateKey: "2026-05-09",
        city: "beijing",
        title: "我们在北京，我博士毕业了",
        description: "六年的博士生涯画上句号，你来北京陪我走过博士生的这最后一程。答辩结束的那一刻，没有想象中的激动，只是转头看到你在人群里对我笑，觉得这就够了。所有的辛苦都值得，因为终点站有你在等我。"
    },
    {
        date: "2026.05.20",
        dateKey: "2026-05-20",
        city: "shanghai",
        title: "我们在上海，我们第一次过520",
        description: "这是我们第一次一起过 520。那天是工作日，你在学校的实验室里，我在公司，各自都有忙不完的事，却还是在间隙里见了面。花、蛋糕、小礼物，想把喜欢从屏幕里拿出来，一件件放在你手里。再平凡的一天，因为有你，也像过节。"
    },
    {
        date: "2026.05.24",
        dateKey: "2026-05-24",
        city: "shanghai",
        title: "我们在上海，小猪咪来了",
        description: "小猪咪来了，鸣人慌了，希望他俩和谐相处。"
    },
    {
        date: "Our Story",
        dateKey: "3030-01-01",
        city: null,
        title: "我们的故事未完待续，不会结束",
        description: "我们的故事未完待续，不会结束。"
    },
];
window.timelineData = timelineData;

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

// 时间轴和相册联动：根据日期滚动到对应照片
function scrollToPhotoByDate(dateKey) {
    if (!imageList || imageList.length === 0) return;
    if (!dateKey) return;

    const targetIndex = imageList.findIndex((name) => name.startsWith(dateKey));
    if (targetIndex === -1) return;

    const targetImg = document.querySelector(`img[data-index="${targetIndex}"]`);
    if (targetImg) {
        const polaroid = targetImg.closest('.polaroid') || targetImg;
        polaroid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        polaroid.classList.add('highlight-photo');
        setTimeout(() => {
            polaroid.classList.remove('highlight-photo');
        }, 1500);
    }
}

// 渲染时间轴（点击某一条 → 滚动到对应日期的照片）
function renderTimeline() {
    const timelineContainer = document.getElementById('timelineContainer');
    timelineContainer.innerHTML = '';

    const line = document.createElement('div');
    line.className = 'timeline-line';
    timelineContainer.appendChild(line);

    timelineData.forEach((item, i) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.style.animationDelay = `${i * 0.15}s`;

        timelineItem.innerHTML = `
            <div class="timeline-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            </div>
            <div class="timeline-dot"></div>
            <div class="timeline-date">${item.date}</div>
        `;

        // 时间轴点击联动相册
        timelineItem.style.cursor = 'pointer';
        timelineItem.addEventListener('click', () => {
            if (item.dateKey) {
                scrollToPhotoByDate(item.dateKey);
            }
        });

        timelineContainer.appendChild(timelineItem);
    });

    requestAnimationFrame(() => {
        const totalWidth = timelineContainer.scrollWidth;
        line.style.width = `${totalWidth}px`;
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

            // 日期分隔标签
            const separator = document.createElement('div');
            separator.className = 'gallery-date-separator';
            const parts = dateKey.split('-');
            separator.innerHTML = `<span class="date-separator-text">${parts[0]}.${parts[1]}.${parts[2]}</span>`;
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

    loadImageList().then(loadAllImages);

    document.getElementById('closeBtn').addEventListener('click', closePopup);

    leftArrow = document.getElementById('leftArrow');
    rightArrow = document.getElementById('rightArrow');
    leftArrow.addEventListener('click', showPreviousImage);
    rightArrow.addEventListener('click', showNextImage);
    leftArrow.style.display = 'none';
    rightArrow.style.display = 'none';
};
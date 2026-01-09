const imageContainer = document.getElementById('gallery');
let index = 0;
let loading = false;
const batchSize = 10;
const initialBatchCount = 5;
const scrolldistance = 1000;
let currentImageIndex = 0;
let loadedImages = [];
let leftArrow;
let rightArrow;

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

// 时间轴数据 - 你可以根据实际情况修改这些数据
const timelineData = [
    {
        date: "2025.11.14",
        title: "我们在上海",
        description: "你是天蝎的脑袋，嘿嘿我是天蝎尾巴，你爱吃点小辣，但是好像也不能吃太辣。我希望你高高兴兴的做自己的事，有自己的事业我当然为你一起骄傲，我想给你兜底是我的选择，但我不想限制你，不想给你什么压力。喜欢花花，喜欢美美的，干干净净的。你喜欢健身，重感情（和我很像，我很心疼，但我也很庆幸遇到的是你。）你喜欢听音乐，看美剧韩剧，我会一个一个补，一首一首听。"
    },
    {
        date: "2025.11.22",
        title: "我们在在北京，我们正式在一起了",
        description: "今天，我们正式牵起手，往同一个方向走了。谢谢你陪我过生日——带你去吃了我一直想带你去的餐厅，一起喝了Peets Coffee，选了一对简简单单的戒指。我们看了场电影，散了一段长长的步。夜晚的风很轻，路好像没有尽头。"
    },
    {
        date: "2025.12.08",
        title: "我们在上海",
        description: "和你在一起的这四天，上海好像突然变成了我们的城市。看《疯狂动物城2》的时候，我轻轻叫你“partner”。第二天在外滩，我跟着你走过的路走，悄悄希望你的记忆里从此都有我。第三天在武康路，我...，但你笑着抱住我说“会一直和我在一起”。最后一天去你学校，走着你曾经走过的那些路，我们的未来会很长很坚定。"
    },
    {
        date: "2025.12.12",
        title: "我们的圣诞主题网页上线",
        description: "https://liu-yang-maker.github.io/Christmas-tree-TY/"
    },
    {
        date: "2025.12.20",
        title: "我们在上海",
        description: "我们一起看《阿凡达》，打扮圣诞树，冬至一起吃饺子，坐很久的公交漫游上海，也在愚园路的洋房里静静分享一个午后。我带你见了我身边的人，你也慢慢走进我的日常。这个冬天，因为有你，上海变得温暖而踏实。"
    },
    {
        date: "2025.12.29",
        title: "我们在台州·第一次旅行",
        description: "这是我们第一次一起旅行，也是一起跨年。我们从上海出发，住在温岭海边的民宿，一起看海、爬山、走老街。在麒麟山看日落，在对戒台许愿，在紫阳街吃小吃，在城墙上手牵手走过。虽然有些地方没来得及去，但每一刻都因为你在身边而变得完整。这是我们第一次一起迎接新年，也让我更确信：以后每一年，我都想和你一起度过。"
    },
    {
        date: "2026.01.01",
        title: "我们在新年·许下约定",
        description: "“去岁千般皆如愿，今年万事定称心。”这是我们第一次一起跨年，你在身边，就是最好的新年礼物。我说了很多心里话，也听你讲了很多过去的故事。我时常担心爱得太快，却又庆幸相遇不晚。我想给你安全感，也想给你全部的我。未来的路还很长，但我想和你一起，一步一步把它走成我们的故事。"
    },
    // {
    //     date: "2026.02.14",
    //     title: "第一个情人节",
    //     description: "玫瑰、巧克力和你，这个情人节有你，就是最浪漫的节日 🌹"
    // },
    // {
    //     date: "2026.05.20",
    //     title: "第一次旅行",
    //     description: "我们一起去了海边，看日出日落，留下了许多美好的照片 🏖️"
    // }
    // 你可以继续添加更多的时间轴事件
];

// 计算恋爱天数
function calculateLoveDays() {
    const startDate = new Date('2025-11-22'); // 修改为你们的恋爱纪念日
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

// 显示情话
function displayQuote(quote) {
    const quoteText = document.getElementById('quoteText');
    quoteText.style.opacity = '0';
    quoteText.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        quoteText.innerText = quote;
        quoteText.style.opacity = '1';
        quoteText.style.transform = 'translateY(0)';
        quoteText.style.transition = 'all 0.5s ease';
    }, 300);
}

// 渲染时间轴（横向时间轴 + 时间点 + 文本块）
function renderTimeline() {
    const timelineContainer = document.getElementById('timelineContainer');
    timelineContainer.innerHTML = '';

    // 先添加一条线，由下面的逻辑根据事件数量动态调节长度
    const line = document.createElement('div');
    line.className = 'timeline-line';
    timelineContainer.appendChild(line);

    timelineData.forEach((item, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.style.animationDelay = `${index * 0.15}s`;

        timelineItem.innerHTML = `
            <div class="timeline-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            </div>
            <div class="timeline-dot"></div>
            <div class="timeline-date">${item.date}</div>
        `;

        timelineContainer.appendChild(timelineItem);
    });

    // 等 DOM 更新完后，根据内容总宽度动态设置时间轴线的长度
    requestAnimationFrame(() => {
        const totalWidth = timelineContainer.scrollWidth;
        line.style.width = `${totalWidth}px`;
    });
}

// 图片加载相关函数（保持原有功能）
async function loadImages(batchCount = 1) {
    if (loading) return;
    loading = true;

    for (let b = 0; b < batchCount; b++) {
        const batchPromises = [];
        for (let i = 0; i < batchSize; i++) {
            batchPromises.push(loadThumbnail(index));
            index++;
        }
        const results = await Promise.all(batchPromises);

        results.forEach((img) => {
            if (img) imageContainer.appendChild(img);
        });

        const loadMore = results.some((img) => img);

        if (!loadMore) {
            window.removeEventListener('scroll', handleScroll);
            console.log('All images have been loaded and displayed.');
            break;
        }
    }
    loading = false;
}

function loadThumbnail(index) {
    return new Promise((resolve) => {
        const thumbImg = new Image();
        thumbImg.crossOrigin = 'Anonymous';
        thumbImg.src = `images/thumbs/${index}.jpg`;

        thumbImg.onload = function () {
            createImageElement(thumbImg, index, resolve);
        };

        thumbImg.onerror = function () {
            thumbImg.src = `images/${index}.jpg`;
            thumbImg.onload = function () {
                createImageElement(thumbImg, index, resolve);
            };
            thumbImg.onerror = function () {
                resolve(null);
            };
        };

        function createImageElement(thumbImg, index, resolve) {
            const imgElement = document.createElement('img');
            imgElement.dataset.large = `images/${index}.jpg`;
            imgElement.src = thumbImg.src;
            imgElement.alt = `Image ${index}`;
            imgElement.setAttribute('data-date', '');
            imgElement.setAttribute('data-index', index);

            EXIF.getData(thumbImg, function () {
                let exifDate = EXIF.getTag(this, 'DateTimeOriginal');
                if (exifDate) {
                    exifDate = exifDate.replace(/^(\d{4}):(\d{2}):(\d{2}).*$/, '$1.$2.$3');
                } else {
                    exifDate = '';
                }
                imgElement.setAttribute('data-date', exifDate);

                loadedImages[index] = {
                    src: imgElement.dataset.large,
                    date: exifDate,
                };
            });

            imgElement.addEventListener('click', function () {
                showPopup(imgElement.dataset.large, imgElement.getAttribute('data-date'), index);
            });

            imgElement.style.cursor = 'pointer';
            imgElement.classList.add('thumbnail');

            resolve(imgElement);
        }
    });
}

function showPopup(src, date, index) {
    currentImageIndex = index;
    const popup = document.getElementById('popup');
    const popupImg = document.getElementById('popupImg');
    const imgDate = document.getElementById('imgDate');

    popup.style.display = 'block';

    popupImg.style.display = 'none';
    imgDate.innerText = '';

    const fullImg = new Image();
    fullImg.crossOrigin = 'Anonymous';
    fullImg.src = src;

    fullImg.onload = function () {
        popupImg.src = src;
        popupImg.style.display = 'block';
        imgDate.innerText = date;
    };

    fullImg.onerror = function () {
        imgDate.innerText = 'Load failed';
    };

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
    const imgDate = document.getElementById('imgDate');
    popup.style.display = 'none';
    popupImg.src = '';
    imgDate.innerText = '';

    leftArrow.style.display = 'none';
    rightArrow.style.display = 'none';
}

function handleScroll() {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - scrolldistance) {
        loadImages();
    }
}

function showPreviousImage() {
    const prevIndex = currentImageIndex - 1;
    if (prevIndex >= 0) {
        if (loadedImages[prevIndex]) {
            currentImageIndex = prevIndex;
            const imgData = loadedImages[prevIndex];
            showPopup(imgData.src, imgData.date, prevIndex);
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
        showPopup(imgData.src, imgData.date, nextIndex);
    } else {
        rightArrow.classList.add('disabled');
    }
}

window.addEventListener('keydown', function (event) {
    const popup = document.getElementById('popup');
    if (popup.style.display === 'block') {
        if (event.key === 'ArrowLeft') {
            showPreviousImage();
        } else if (event.key === 'ArrowRight') {
            showNextImage();
        } else if (event.key === 'Escape') {
            closePopup();
        }
    }
});

// 页面加载完成后初始化所有功能
window.onload = function () {
    // 计算恋爱天数
    calculateLoveDays();
    
    // 显示每日情话
    displayQuote(generateDailyQuote());
    
    // 渲染时间轴
    renderTimeline();
    
    // 情话按钮事件
    document.getElementById('newQuoteBtn').addEventListener('click', function() {
        displayQuote(generateRandomQuote());
    });

    // 加载图片
    loadImages(initialBatchCount).then(() => {
        window.addEventListener('scroll', handleScroll);
    });

    document.getElementById('closeBtn').addEventListener('click', closePopup);

    leftArrow = document.getElementById('leftArrow');
    rightArrow = document.getElementById('rightArrow');

    leftArrow.addEventListener('click', showPreviousImage);
    rightArrow.addEventListener('click', showNextImage);

    leftArrow.style.display = 'none';
    rightArrow.style.display = 'none';
};

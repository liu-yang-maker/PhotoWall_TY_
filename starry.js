// 背景特效统一控制：爱心雨 / 星空 / 流星
(function () {
    const themeBtn = document.getElementById('themeBtn');
    const themeIcon = document.getElementById('themeIcon');
    const themes = ['hearts', 'stars', 'meteors'];
    const icons = {
        hearts: '💝',
        stars: '✨',
        meteors: '☄️'
    };

    let currentIndex = 0;

    function stopAll() {
        // hearts
        if (window.heartsController && typeof window.heartsController.stop === 'function') {
            window.heartsController.stop();
        }
        // stars
        if (typeof window.stopStars === 'function') {
            window.stopStars();
        }
        // meteors
        if (typeof window.stopMeteors === 'function') {
            window.stopMeteors();
        }
    }

    function applyTheme(theme) {
        stopAll();

        if (theme === 'hearts') {
            if (window.heartsController && typeof window.heartsController.start === 'function') {
                window.heartsController.start();
            }
        } else if (theme === 'stars') {
            if (typeof window.startStars === 'function') {
                window.startStars();
            }
        } else if (theme === 'meteors') {
            if (typeof window.startMeteors === 'function') {
                window.startMeteors();
            }
        }

        if (themeIcon) {
            themeIcon.textContent = icons[theme] || '💝';
        }

        document.body.setAttribute('data-bg-theme', theme);
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % themes.length;
            applyTheme(themes[currentIndex]);
        });
    }

    // 初始主题：爱心雨
    applyTheme('hearts');
})();


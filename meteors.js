(function() {
    let meteors = [];
    let stars = [];
    let animationId;
    let meteorInterval;
    let isRunning = false;
    const canvas = document.getElementById('heartCanvas');
    const context = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createBackgroundStars() {
        stars = [];
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.5 + 0.3
            });
        }
    }

    function drawBackgroundStars() {
        stars.forEach(star => {
            context.beginPath();
            context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            context.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            context.fill();
        });
    }

    function createMeteor() {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height * 0.3; // 从上半部分开始
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5; // 大致45度角
        const speed = Math.random() * 5 + 8;
        const length = Math.random() * 80 + 40;
        
        meteors.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            length: length,
            alpha: 1,
            life: 1,
            color: {
                r: Math.floor(Math.random() * 50 + 200),
                g: Math.floor(Math.random() * 50 + 200),
                b: Math.floor(Math.random() * 50 + 200)
            }
        });
    }

    function drawMeteor(meteor) {
        const gradient = context.createLinearGradient(
            meteor.x,
            meteor.y,
            meteor.x - meteor.vx * meteor.length / 10,
            meteor.y - meteor.vy * meteor.length / 10
        );
        
        gradient.addColorStop(0, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${meteor.alpha})`);
        gradient.addColorStop(0.5, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${meteor.alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0)`);
        
        context.strokeStyle = gradient;
        context.lineWidth = 3;
        context.lineCap = 'round';
        
        context.beginPath();
        context.moveTo(meteor.x, meteor.y);
        context.lineTo(
            meteor.x - meteor.vx * meteor.length / 10,
            meteor.y - meteor.vy * meteor.length / 10
        );
        context.stroke();
        
        // 添加光晕
        const glowGradient = context.createRadialGradient(
            meteor.x, meteor.y, 0,
            meteor.x, meteor.y, 15
        );
        glowGradient.addColorStop(0, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${meteor.alpha * 0.8})`);
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = glowGradient;
        context.beginPath();
        context.arc(meteor.x, meteor.y, 15, 0, Math.PI * 2);
        context.fill();
    }

    function updateMeteor(meteor) {
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        meteor.life -= 0.01;
        meteor.alpha = meteor.life;
        
        return meteor.life > 0 && 
               meteor.x < canvas.width + 100 && 
               meteor.y < canvas.height + 100;
    }

    function render() {
        // 深蓝夜空背景
        context.fillStyle = 'rgba(5, 5, 25, 0.15)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制背景星星
        drawBackgroundStars();
        
        // 更新和绘制流星
        for (let i = meteors.length - 1; i >= 0; i--) {
            const meteor = meteors[i];
            drawMeteor(meteor);
            
            if (!updateMeteor(meteor)) {
                meteors.splice(i, 1);
            }
        }
        
        if (isRunning) {
            animationId = requestAnimationFrame(render);
        }
    }

    function startMeteors() {
        if (isRunning) return;
        
        isRunning = true;
        resizeCanvas();
        createBackgroundStars();
        meteors = [];
        
        // 初始背景
        context.fillStyle = 'rgba(5, 5, 25, 1)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 定期创建流星
        meteorInterval = setInterval(() => {
            createMeteor();
        }, 800);
        
        // 初始创建一些流星
        for (let i = 0; i < 3; i++) {
            setTimeout(() => createMeteor(), i * 200);
        }
        
        render();
        
        // 点击创建流星
        canvas.addEventListener('click', createMeteor);
        
        window.addEventListener('resize', () => {
            if (isRunning) {
                resizeCanvas();
                createBackgroundStars();
            }
        });
    }

    function stopMeteors() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        if (meteorInterval) {
            clearInterval(meteorInterval);
        }
        meteors = [];
        stars = [];
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.removeEventListener('click', createMeteor);
    }

    // 导出控制函数
    window.startMeteors = startMeteors;
    window.stopMeteors = stopMeteors;
})();

(function() {
    let stars = [];
    let animationId;
    let isRunning = false;
    const canvas = document.getElementById('heartCanvas');
    const context = canvas.getContext('2d');
    const starCount = 200;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random(),
                alphaChange: (Math.random() - 0.5) * 0.02,
                twinkleSpeed: Math.random() * 0.05 + 0.01
            });
        }
    }

    function drawStar(star) {
        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        context.fill();
        
        // 添加光晕效果
        if (star.size > 1.5) {
            const gradient = context.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 3
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${star.alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
            context.fill();
        }
    }

    function drawConstellations() {
        // 绘制一些星座连线
        context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        context.lineWidth = 1;
        
        for (let i = 0; i < stars.length - 1; i++) {
            for (let j = i + 1; j < stars.length; j++) {
                const dx = stars[i].x - stars[j].x;
                const dy = stars[i].y - stars[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    context.beginPath();
                    context.moveTo(stars[i].x, stars[i].y);
                    context.lineTo(stars[j].x, stars[j].y);
                    context.globalAlpha = (1 - distance / 100) * 0.3;
                    context.stroke();
                    context.globalAlpha = 1;
                }
            }
        }
    }

    function render() {
        // 创建深色背景
        context.fillStyle = 'rgba(10, 10, 30, 0.1)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制星座连线
        drawConstellations();
        
        // 绘制和更新星星
        stars.forEach(star => {
            drawStar(star);
            
            // 闪烁效果
            star.alpha += star.alphaChange;
            if (star.alpha <= 0.1 || star.alpha >= 1) {
                star.alphaChange = -star.alphaChange;
            }
        });
        
        if (isRunning) {
            animationId = requestAnimationFrame(render);
        }
    }

    function startStars() {
        if (isRunning) return;
        
        isRunning = true;
        resizeCanvas();
        createStars();
        
        // 清除之前的内容
        context.fillStyle = 'rgba(10, 10, 30, 1)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        render();
        
        // 窗口大小改变时重新创建星星
        window.addEventListener('resize', () => {
            if (isRunning) {
                resizeCanvas();
                createStars();
            }
        });
    }

    function stopStars() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        stars = [];
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // 导出控制函数
    window.startStars = startStars;
    window.stopStars = stopStars;
})();

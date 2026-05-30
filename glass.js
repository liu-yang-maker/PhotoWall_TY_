(function () {
    const mount = document.getElementById('glassMount');
    const canvas = document.getElementById('glassCanvas');
    const ctx = canvas.getContext('2d');
    const restoreBtn = document.getElementById('glassRestore');

    let shards = [];
    let shattered = false;
    let animating = false;
    let W, H;

    function resize() {
        W = mount.clientWidth;
        H = mount.clientHeight;
        canvas.width = W * devicePixelRatio;
        canvas.height = H * devicePixelRatio;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        if (!shattered) drawGlass();
    }

    function drawGlass() {
        ctx.clearRect(0, 0, W, H);

        // Glass base - subtle gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, 'rgba(220, 235, 245, 0.88)');
        grad.addColorStop(0.3, 'rgba(240, 248, 255, 0.92)');
        grad.addColorStop(0.6, 'rgba(200, 225, 240, 0.85)');
        grad.addColorStop(1, 'rgba(230, 240, 250, 0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Reflections
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(W * 0.3, H * 0.25, W * 0.18, H * 0.08, -0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.ellipse(W * 0.7, H * 0.6, W * 0.12, H * 0.05, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Subtle edge highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(2, 2, W - 4, H - 4);

        // Inner glow
        const innerGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
        innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = innerGrad;
        ctx.fillRect(0, 0, W, H);
    }

    function generateShards(cx, cy) {
        shards = [];
        const numRings = 5;
        const numRadial = 16;
        const maxR = Math.max(W, H) * 0.9;

        // Generate points on concentric irregular rings
        const rings = [];
        rings.push([{ x: cx, y: cy }]);
        for (let r = 1; r <= numRings; r++) {
            const ring = [];
            const radius = (r / numRings) * maxR;
            const segments = numRadial + Math.floor(Math.random() * 4);
            for (let s = 0; s < segments; s++) {
                const angle = (Math.PI * 2 * s / segments) + (Math.random() - 0.5) * 0.3;
                const dist = radius * (0.7 + Math.random() * 0.5);
                ring.push({
                    x: cx + Math.cos(angle) * dist,
                    y: cy + Math.sin(angle) * dist
                });
            }
            rings.push(ring);
        }

        // Create triangular shards using Delaunay-like approach
        // Connect adjacent ring points to form triangles
        for (let r = 0; r < rings.length - 1; r++) {
            const inner = rings[r];
            const outer = rings[r + 1];

            for (let i = 0; i < outer.length; i++) {
                const p1 = outer[i];
                const p2 = outer[(i + 1) % outer.length];

                // Find closest inner point
                let closest = 0;
                let minDist = Infinity;
                for (let j = 0; j < inner.length; j++) {
                    const d = Math.hypot(inner[j].x - p1.x, inner[j].y - p1.y);
                    if (d < minDist) { minDist = d; closest = j; }
                }

                const p3 = inner[closest];
                const centroidX = (p1.x + p2.x + p3.x) / 3;
                const centroidY = (p1.y + p2.y + p3.y) / 3;

                shards.push({
                    points: [p1, p2, p3],
                    cx: centroidX,
                    cy: centroidY,
                    vx: (centroidX - cx) * 0.02 + (Math.random() - 0.5) * 2,
                    vy: (centroidY - cy) * 0.02 + (Math.random() - 0.5) * 1 + 1,
                    rotation: 0,
                    vr: (Math.random() - 0.5) * 0.15,
                    alpha: 1,
                    delay: Math.random() * 8
                });

                // Second triangle
                const p4 = inner[(closest + 1) % inner.length];
                if (p4) {
                    const cx2 = (p2.x + p3.x + p4.x) / 3;
                    const cy2 = (p2.y + p3.y + p4.y) / 3;
                    shards.push({
                        points: [p2, p3, p4],
                        cx: cx2,
                        cy: cy2,
                        vx: (cx2 - cx) * 0.02 + (Math.random() - 0.5) * 2,
                        vy: (cy2 - cy) * 0.02 + (Math.random() - 0.5) * 1 + 1.5,
                        rotation: 0,
                        vr: (Math.random() - 0.5) * 0.12,
                        delay: Math.random() * 6
                    });
                }
            }
        }
    }

    function drawCracks(cx, cy) {
        ctx.clearRect(0, 0, W, H);
        drawGlass();

        ctx.save();
        ctx.strokeStyle = 'rgba(180, 200, 210, 0.7)';
        ctx.lineWidth = 0.8;

        shards.forEach(shard => {
            ctx.beginPath();
            ctx.moveTo(shard.points[0].x, shard.points[0].y);
            for (let i = 1; i < shard.points.length; i++) {
                ctx.lineTo(shard.points[i].x, shard.points[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        });

        // Impact point
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.restore();
    }

    function animateShatter() {
        animating = true;
        let frame = 0;

        function tick() {
            frame++;
            ctx.clearRect(0, 0, W, H);

            let allDone = true;
            shards.forEach(shard => {
                if (shard.delay > 0) { shard.delay--; allDone = false; return; }

                shard.cx += shard.vx;
                shard.cy += shard.vy;
                shard.vy += 0.25;
                shard.rotation += shard.vr;
                shard.alpha = Math.max(0, shard.alpha - 0.012);

                if (shard.alpha <= 0) return;
                allDone = false;

                ctx.save();
                ctx.translate(shard.cx, shard.cy);
                ctx.rotate(shard.rotation);
                ctx.globalAlpha = shard.alpha;

                // Draw shard
                ctx.beginPath();
                const offsetX = -shard.cx;
                const offsetY = -shard.cy;
                ctx.moveTo(shard.points[0].x + offsetX, shard.points[0].y + offsetY);
                for (let i = 1; i < shard.points.length; i++) {
                    ctx.lineTo(shard.points[i].x + offsetX, shard.points[i].y + offsetY);
                }
                ctx.closePath();

                // Glass shard appearance
                const shardGrad = ctx.createLinearGradient(
                    shard.points[0].x + offsetX, shard.points[0].y + offsetY,
                    shard.points[1].x + offsetX, shard.points[1].y + offsetY
                );
                shardGrad.addColorStop(0, 'rgba(220, 240, 255, 0.85)');
                shardGrad.addColorStop(0.5, 'rgba(245, 250, 255, 0.9)');
                shardGrad.addColorStop(1, 'rgba(200, 225, 240, 0.8)');
                ctx.fillStyle = shardGrad;
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 0.5;
                ctx.stroke();

                ctx.restore();
            });

            if (allDone || frame > 180) {
                ctx.clearRect(0, 0, W, H);
                canvas.style.pointerEvents = 'none';
                animating = false;
                restoreBtn.classList.add('visible');
            } else {
                requestAnimationFrame(tick);
            }
        }
        tick();
    }

    function shatter(e) {
        if (shattered || animating) return;
        shattered = true;

        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        generateShards(cx, cy);
        drawCracks(cx, cy);

        setTimeout(() => animateShatter(), 300);
    }

    function restore() {
        shattered = false;
        shards = [];
        canvas.style.pointerEvents = 'auto';
        restoreBtn.classList.remove('visible');

        // Fade in glass
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 0.6s ease';
        drawGlass();
        requestAnimationFrame(() => {
            canvas.style.opacity = '1';
            setTimeout(() => { canvas.style.transition = ''; }, 600);
        });
    }

    // Init
    resize();
    canvas.addEventListener('click', shatter);
    restoreBtn.addEventListener('click', restore);
    window.addEventListener('resize', resize);
})();

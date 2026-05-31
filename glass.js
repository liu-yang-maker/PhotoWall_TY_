(function () {
    const mount = document.getElementById('glassMount');
    const canvas = document.getElementById('glassCanvas');
    const ctx = canvas.getContext('2d');
    const restoreBtn = document.getElementById('glassRestore');

    let W, H;
    let shards = [];
    let cracks = [];
    let clickCount = 0;
    let animating = false;
    let fullyShattered = false;
    let flyingShards = [];
    let dustParticles = [];
    let animId = null;
    let scratches = [];

    function resize() {
        W = mount.clientWidth;
        H = mount.clientHeight;
        canvas.width = W * devicePixelRatio;
        canvas.height = H * devicePixelRatio;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        if (!fullyShattered) {
            generateScratches();
            generateShards();
            render();
        }
    }

    function generateScratches() {
        scratches = [];
        for (let i = 0; i < 12; i++) {
            scratches.push({
                x: Math.random() * W,
                y: Math.random() * H,
                angle: Math.random() * Math.PI,
                len: 15 + Math.random() * 50,
                alpha: 0.03 + Math.random() * 0.04
            });
        }
    }

    // ===== VORONOI SHARDS =====
    function generateShards() {
        shards = [];
        const numPoints = 50;
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            points.push({
                x: 10 + Math.random() * (W - 20),
                y: 10 + Math.random() * (H - 20)
            });
        }
        for (let i = 0; i < numPoints; i++) {
            const cell = computeVoronoiCell(points[i], points, i);
            if (cell && cell.length >= 3) {
                const cx = cell.reduce((s, p) => s + p.x, 0) / cell.length;
                const cy = cell.reduce((s, p) => s + p.y, 0) / cell.length;
                shards.push({
                    vertices: cell,
                    cx: cx, cy: cy,
                    cracked: false, removed: false,
                    vx: 0, vy: 0, vr: 0, rotation: 0, alpha: 1,
                    offsetX: 0, offsetY: 0
                });
            }
        }
    }

    function computeVoronoiCell(point, allPoints, idx) {
        let polygon = [
            { x: -5, y: -5 }, { x: W + 5, y: -5 },
            { x: W + 5, y: H + 5 }, { x: -5, y: H + 5 }
        ];
        for (let i = 0; i < allPoints.length; i++) {
            if (i === idx) continue;
            const other = allPoints[i];
            const mx = (point.x + other.x) / 2;
            const my = (point.y + other.y) / 2;
            const dx = other.x - point.x;
            const dy = other.y - point.y;
            polygon = clipPolygon(polygon, mx, my, dx, dy);
            if (!polygon || polygon.length < 3) return null;
        }
        polygon = clipPolygon(polygon, W / 2, 0, 0, -1);
        polygon = clipPolygon(polygon, W / 2, H, 0, 1);
        polygon = clipPolygon(polygon, 0, H / 2, -1, 0);
        polygon = clipPolygon(polygon, W, H / 2, 1, 0);
        return polygon;
    }

    function clipPolygon(polygon, px, py, nx, ny) {
        if (!polygon || polygon.length < 3) return null;
        const output = [];
        for (let i = 0; i < polygon.length; i++) {
            const current = polygon[i];
            const next = polygon[(i + 1) % polygon.length];
            const dC = (current.x - px) * nx + (current.y - py) * ny;
            const dN = (next.x - px) * nx + (next.y - py) * ny;
            if (dC <= 0) {
                output.push(current);
                if (dN > 0) output.push(lineIntersect(current, next, px, py, nx, ny));
            } else if (dN <= 0) {
                output.push(lineIntersect(current, next, px, py, nx, ny));
            }
        }
        return output.length >= 3 ? output : null;
    }

    function lineIntersect(a, b, px, py, nx, ny) {
        const dA = (a.x - px) * nx + (a.y - py) * ny;
        const dB = (b.x - px) * nx + (b.y - py) * ny;
        const t = dA / (dA - dB);
        return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    }

    // ===== GLASS RENDERING (REALISTIC) =====
    function render() {
        ctx.clearRect(0, 0, W, H);

        // Draw intact shards (the glass body)
        const intactShards = shards.filter(s => !s.removed);
        if (intactShards.length > 0) {
            drawGlassBody(intactShards);
        }

        // Draw flying shards on top
        flyingShards.forEach(shard => {
            if (shard.alpha <= 0) return;
            drawFlyingShard(shard);
        });

        // Draw dust particles
        dustParticles.forEach(p => {
            if (p.alpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = `rgba(255, 255, 255, 1)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawGlassBody(intactShards) {
        // Layer 1: Base frosted glass (full coverage for intact shards)
        intactShards.forEach(shard => {
            ctx.save();
            ctx.beginPath();
            tracePath(shard.vertices);
            ctx.closePath();

            // Deep frosted glass gradient per shard
            const angle = Math.atan2(shard.cy - H / 2, shard.cx - W / 2);
            const gx = shard.cx + Math.cos(angle) * 30;
            const gy = shard.cy + Math.sin(angle) * 30;
            const grad = ctx.createRadialGradient(shard.cx, shard.cy, 0, gx, gy, 80);
            grad.addColorStop(0, 'rgba(242, 248, 254, 0.99)');
            grad.addColorStop(0.5, 'rgba(230, 240, 250, 0.98)');
            grad.addColorStop(1, 'rgba(220, 235, 248, 0.97)');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
        });

        // Layer 2: Depth/thickness effect (edges appear slightly green-blue like real glass)
        ctx.save();
        ctx.globalAlpha = 0.06;
        const edgeGrad = ctx.createLinearGradient(0, 0, W, H);
        edgeGrad.addColorStop(0, '#a8d8d0');
        edgeGrad.addColorStop(0.5, '#c8e8e0');
        edgeGrad.addColorStop(1, '#90c8c0');
        intactShards.forEach(shard => {
            ctx.beginPath();
            tracePath(shard.vertices);
            ctx.closePath();
            ctx.fillStyle = edgeGrad;
            ctx.fill();
        });
        ctx.restore();

        // Layer 3: Internal ice-crystal/frost pattern
        ctx.save();
        ctx.globalAlpha = 0.04;
        intactShards.forEach((shard, i) => {
            if (i % 3 !== 0) return;
            ctx.beginPath();
            ctx.arc(shard.cx + (Math.random() - 0.5) * 20, shard.cy + (Math.random() - 0.5) * 20,
                15 + Math.random() * 25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.fill();
        });
        ctx.restore();

        // Layer 4: Crack lines for cracked shards
        const crackedShards = intactShards.filter(s => s.cracked);
        if (crackedShards.length > 0) {
            drawCrackLines(crackedShards);
        }

        // Layer 5: Draw cumulative radial cracks
        drawRadialCracks();

        // Layer 6: Specular highlights (main light reflection)
        ctx.save();
        // Primary specular - elongated bright spot
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(W * 0.3, H * 0.2, W * 0.15, H * 0.04, -0.4, 0, Math.PI * 2);
        const specGrad = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.15);
        specGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = specGrad;
        ctx.fill();

        // Secondary specular
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.ellipse(W * 0.75, H * 0.65, W * 0.08, H * 0.025, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = specGrad;
        ctx.fill();

        // Corner highlight (Fresnel effect - glass edges reflect more)
        ctx.globalAlpha = 0.12;
        const fresnelGrad = ctx.createLinearGradient(0, 0, 0, H);
        fresnelGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        fresnelGrad.addColorStop(0.1, 'rgba(255, 255, 255, 0)');
        fresnelGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0)');
        fresnelGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
        ctx.fillStyle = fresnelGrad;
        ctx.fillRect(0, 0, W, H);

        // Side fresnel
        ctx.globalAlpha = 0.08;
        const sideGrad = ctx.createLinearGradient(0, 0, W, 0);
        sideGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        sideGrad.addColorStop(0.08, 'rgba(255, 255, 255, 0)');
        sideGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0)');
        sideGrad.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
        ctx.fillStyle = sideGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // Layer 7: Surface micro-scratches
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = 0.4;
        scratches.forEach(s => {
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + Math.cos(s.angle) * s.len, s.y + Math.sin(s.angle) * s.len);
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawCrackLines(crackedShards) {
        ctx.save();
        crackedShards.forEach(shard => {
            ctx.beginPath();
            tracePath(shard.vertices);
            ctx.closePath();
            // Dark crack line
            ctx.strokeStyle = 'rgba(60, 80, 100, 0.7)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            // Bright refraction edge alongside crack
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawRadialCracks() {
        if (cracks.length === 0) return;
        ctx.save();
        cracks.forEach(crack => {
            // Dark line (shadow side of crack)
            ctx.strokeStyle = 'rgba(40, 60, 80, 0.65)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            crack.lines.forEach(line => {
                ctx.moveTo(line[0].x, line[0].y);
                for (let i = 1; i < line.length; i++) {
                    ctx.lineTo(line[i].x, line[i].y);
                }
            });
            ctx.stroke();

            // Bright edge (refraction side)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            crack.lines.forEach(line => {
                ctx.moveTo(line[0].x + 0.8, line[0].y + 0.8);
                for (let i = 1; i < line.length; i++) {
                    ctx.lineTo(line[i].x + 0.8, line[i].y + 0.8);
                }
            });
            ctx.stroke();

            // Impact point white compression mark
            ctx.beginPath();
            ctx.arc(crack.cx, crack.cy, 4 + crack.intensity * 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(crack.cx, crack.cy, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
        });
        ctx.restore();
    }

    function drawFlyingShard(shard) {
        ctx.save();
        ctx.translate(shard.cx + shard.offsetX, shard.cy + shard.offsetY);
        ctx.rotate(shard.rotation);
        ctx.globalAlpha = shard.alpha;

        const offX = -(shard.cx + shard.offsetX);
        const offY = -(shard.cy + shard.offsetY);

        // Shard body
        ctx.beginPath();
        ctx.moveTo(shard.vertices[0].x + offX, shard.vertices[0].y + offY);
        for (let i = 1; i < shard.vertices.length; i++) {
            ctx.lineTo(shard.vertices[i].x + offX, shard.vertices[i].y + offY);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(
            shard.vertices[0].x + offX, shard.vertices[0].y + offY,
            (shard.vertices[1] || shard.vertices[0]).x + offX,
            (shard.vertices[1] || shard.vertices[0]).y + offY
        );
        grad.addColorStop(0, 'rgba(225, 242, 255, 0.92)');
        grad.addColorStop(0.4, 'rgba(248, 252, 255, 0.95)');
        grad.addColorStop(1, 'rgba(210, 232, 250, 0.88)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Thickness edge (shows glass has depth when flying)
        ctx.strokeStyle = 'rgba(180, 210, 230, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
    }

    function tracePath(vertices) {
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
    }

    // ===== CRACK GENERATION =====
    function generateRadialCrack(cx, cy, intensity) {
        const lines = [];
        const numArms = 5 + Math.floor(Math.random() * 4 + intensity * 2);
        for (let a = 0; a < numArms; a++) {
            const angle = (Math.PI * 2 * a / numArms) + (Math.random() - 0.5) * 0.5;
            const armLen = 40 + Math.random() * 80 + intensity * 30;
            const segments = 4 + Math.floor(Math.random() * 4);
            const line = [{ x: cx, y: cy }];

            let curX = cx, curY = cy, curAngle = angle;
            for (let s = 0; s < segments; s++) {
                const segLen = armLen / segments * (0.6 + Math.random() * 0.8);
                curAngle += (Math.random() - 0.5) * 0.4;
                curX += Math.cos(curAngle) * segLen;
                curY += Math.sin(curAngle) * segLen;
                line.push({ x: curX, y: curY });

                // Branch with some probability
                if (Math.random() < 0.3 && s > 0) {
                    const branchAngle = curAngle + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6);
                    const branchLen = 15 + Math.random() * 30;
                    const branch = [{ x: curX, y: curY }];
                    let bx = curX, by = curY, ba = branchAngle;
                    for (let b = 0; b < 2; b++) {
                        const bl = branchLen / 2;
                        ba += (Math.random() - 0.5) * 0.3;
                        bx += Math.cos(ba) * bl;
                        by += Math.sin(ba) * bl;
                        branch.push({ x: bx, y: by });
                    }
                    lines.push(branch);
                }
            }
            lines.push(line);
        }

        // Concentric ring cracks (spider web effect)
        const numRings = 1 + Math.floor(intensity);
        for (let r = 0; r < numRings; r++) {
            const radius = 20 + r * 25 + Math.random() * 15;
            const ringPoints = [];
            const ringSegs = 8 + Math.floor(Math.random() * 6);
            for (let s = 0; s <= ringSegs; s++) {
                const a = (Math.PI * 2 * s / ringSegs) + (Math.random() - 0.5) * 0.2;
                const rr = radius * (0.85 + Math.random() * 0.3);
                ringPoints.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
            }
            lines.push(ringPoints);
        }

        cracks.push({ cx, cy, intensity, lines });
    }

    function spawnDust(cx, cy, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            dustParticles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 0.5 + Math.random() * 1.5,
                alpha: 0.6 + Math.random() * 0.4,
                life: 30 + Math.random() * 30
            });
        }
    }

    // ===== CLICK HANDLING =====
    function handleClick(e) {
        if (fullyShattered || animating) return;

        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        clickCount++;

        // Generate radial cracks at impact point
        const intensity = Math.min(clickCount * 0.5, 3);
        generateRadialCrack(cx, cy, intensity);
        spawnDust(cx, cy, 8 + clickCount * 3);

        if (clickCount <= 3) {
            crackNearby(cx, cy, 2 + clickCount);
            render();
            startDustAnimation();
        } else if (clickCount <= 7) {
            crackNearby(cx, cy, 3);
            removeNearby(cx, cy, 2 + Math.floor((clickCount - 3) * 1.5));
        } else {
            shatterAll();
        }
    }

    function crackNearby(cx, cy, count) {
        const sorted = shards
            .filter(s => !s.cracked && !s.removed)
            .map(s => ({ shard: s, dist: Math.hypot(s.cx - cx, s.cy - cy) }))
            .sort((a, b) => a.dist - b.dist);
        for (let i = 0; i < Math.min(count, sorted.length); i++) {
            sorted[i].shard.cracked = true;
        }
    }

    function removeNearby(cx, cy, count) {
        const sorted = shards
            .filter(s => s.cracked && !s.removed)
            .map(s => ({ shard: s, dist: Math.hypot(s.cx - cx, s.cy - cy) }))
            .sort((a, b) => a.dist - b.dist);

        const toRemove = sorted.slice(0, Math.min(count, sorted.length));
        toRemove.forEach(item => {
            item.shard.removed = true;
            flyingShards.push({
                ...item.shard,
                offsetX: 0, offsetY: 0,
                vx: (item.shard.cx - cx) * 0.05 + (Math.random() - 0.5) * 3,
                vy: (item.shard.cy - cy) * 0.04 - 1 + Math.random() * 2,
                vr: (Math.random() - 0.5) * 0.18,
                rotation: 0, alpha: 1, delay: 0
            });
        });
        startAnimation();
    }

    function shatterAll() {
        animating = true;
        const remaining = shards.filter(s => !s.removed);
        remaining.forEach((shard, i) => {
            shard.removed = true;
            flyingShards.push({
                ...shard,
                offsetX: 0, offsetY: 0,
                vx: (shard.cx - W / 2) * 0.04 + (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 3 + 2,
                vr: (Math.random() - 0.5) * 0.2,
                rotation: 0, alpha: 1,
                delay: Math.random() * 8
            });
        });
        spawnDust(W / 2, H / 2, 30);
        startAnimation();
    }

    function startDustAnimation() {
        if (animId) return;
        animId = requestAnimationFrame(tickDust);
    }

    function tickDust() {
        let active = false;
        dustParticles.forEach(p => {
            if (p.alpha <= 0) return;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.vx *= 0.98;
            p.life--;
            if (p.life <= 0) p.alpha = 0;
            else p.alpha = Math.min(p.alpha, p.life / 20);
            if (p.alpha > 0) active = true;
        });
        render();
        if (active) {
            animId = requestAnimationFrame(tickDust);
        } else {
            animId = null;
            dustParticles = [];
        }
    }

    function startAnimation() {
        if (animId) cancelAnimationFrame(animId);
        animating = true;

        function tick() {
            let allDone = true;

            flyingShards.forEach(shard => {
                if (shard.alpha <= 0) return;
                if (shard.delay > 0) { shard.delay--; allDone = false; return; }
                shard.offsetX += shard.vx;
                shard.offsetY += shard.vy;
                shard.vy += 0.35;
                shard.vx *= 0.99;
                shard.rotation += shard.vr;
                shard.alpha -= 0.013;
                if (shard.alpha > 0) allDone = false;
            });

            dustParticles.forEach(p => {
                if (p.alpha <= 0) return;
                p.x += p.vx; p.y += p.vy;
                p.vy += 0.08; p.vx *= 0.98;
                p.life--;
                if (p.life <= 0) p.alpha = 0;
                else p.alpha = Math.min(p.alpha, p.life / 20);
                if (p.alpha > 0) allDone = false;
            });

            render();

            if (allDone) {
                animId = null;
                animating = false;
                dustParticles = [];
                const remaining = shards.filter(s => !s.removed);
                if (remaining.length === 0) {
                    fullyShattered = true;
                    ctx.clearRect(0, 0, W, H);
                    canvas.style.pointerEvents = 'none';
                    restoreBtn.classList.add('visible');
                }
            } else {
                animId = requestAnimationFrame(tick);
            }
        }
        animId = requestAnimationFrame(tick);
    }

    function restore() {
        fullyShattered = false;
        clickCount = 0;
        cracks = [];
        flyingShards = [];
        dustParticles = [];
        animating = false;
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        canvas.style.pointerEvents = 'auto';
        restoreBtn.classList.remove('visible');

        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 0.8s ease';
        generateShards();
        render();
        requestAnimationFrame(() => {
            canvas.style.opacity = '1';
            setTimeout(() => { canvas.style.transition = ''; }, 800);
        });
    }

    // Init
    resize();
    canvas.addEventListener('click', handleClick);
    restoreBtn.addEventListener('click', restore);
    window.addEventListener('resize', resize);
})();

/*
 * loveheart.js
 * 心形粒子互动展示：参数曲线播种 + 双拍跳动 + 指尖斥力 + 点击脉冲
 * 配色：冷青为主、内圈暖色微光（"特别"于左侧三栏明亮卡片）
 * 零依赖，2D Canvas，~3500 粒子，IntersectionObserver / visibilitychange 自动暂停
 */
(function () {
  const mount = document.getElementById('heartMount');
  if (!mount) return;

  // -----------------------------
  // 1. Canvas 与 DPR
  // -----------------------------
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  mount.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0, H = 0, DPR = 1;

  function resize() {
    const rect = mount.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width));
    H = Math.max(1, Math.floor(rect.height));
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutHeart();
  }

  // -----------------------------
  // 2. 心形参数方程 + 布局
  //    x = 16 sin³(t)
  //    y = 13 cos(t) − 5 cos(2t) − 2 cos(3t) − cos(4t)
  //    画布 y 向下为正，所以下面会取 -y
  // -----------------------------
  const HEART_X_RANGE = 16;   // sin³ 上界
  const HEART_Y_RANGE = 17;   // 经验上 y 振幅约 17
  let SCALE = 1;              // 自适应缩放
  let CX = 0, CY = 0;         // 心形几何中心（屏幕坐标）
  let HEART_W = 0, HEART_H = 0; // 心形在屏幕上的实际宽高（像素）

  function heartCurve(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: x, y: -y };
  }

  function layoutHeart() {
    // 留 margin：上 ~38px（hint）、下 ~24px（公式）、左右各 ~14px
    const padTop = 42;
    const padBottom = 32;
    const padX = 18;
    const availW = Math.max(60, W - padX * 2);
    const availH = Math.max(60, H - padTop - padBottom);
    // 心形宽 ≈ 2 * 16 = 32；高 ≈ y 上下振幅总和 ≈ 30
    const sX = availW / (HEART_X_RANGE * 2);
    const sY = availH / (HEART_Y_RANGE * 1.85); // 1.85 经验值，避免顶部突起被切
    SCALE = Math.min(sX, sY);
    HEART_W = HEART_X_RANGE * 2 * SCALE;
    HEART_H = HEART_Y_RANGE * 1.85 * SCALE;
    CX = W / 2;
    // 视觉中心稍微下移一点，让顶端凹陷靠近中线
    CY = padTop + availH * 0.5 + 6;

    // 重新计算粒子的目标 home 与重生缓存
    if (particles.length) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const c = heartCurve(p.t);
        p.homeX = CX + c.x * SCALE + p.scatterX;
        p.homeY = CY + c.y * SCALE + p.scatterY;
      }
    }
  }

  // -----------------------------
  // 3. 粒子初始化
  // -----------------------------
  const particles = [];

  function spawnParticle(reuse) {
    // 沿曲线均匀采样 t；t ∈ [0, 2π]
    const t = Math.random() * Math.PI * 2;
    // 径向高斯偏移：让"心形外缘"形成一团云而不是一根线
    // 使用 Box-Muller 生两个 N(0,1)
    const u1 = Math.max(1e-6, Math.random());
    const u2 = Math.random();
    const r = Math.sqrt(-2 * Math.log(u1)) * 0.65; // σ ≈ 0.65
    const ang = u2 * Math.PI * 2;
    const scatterX = Math.cos(ang) * r * SCALE * 0.6;
    const scatterY = Math.sin(ang) * r * SCALE * 0.6;
    const c = heartCurve(t);
    const homeX = CX + c.x * SCALE + scatterX;
    const homeY = CY + c.y * SCALE + scatterY;

    const obj = reuse || {};
    obj.t = t;
    obj.scatterX = scatterX;
    obj.scatterY = scatterY;
    obj.homeX = homeX;
    obj.homeY = homeY;
    // 初始位置：从家位置出发，再加点起步抖
    obj.x = homeX + (Math.random() - 0.5) * 4;
    obj.y = homeY + (Math.random() - 0.5) * 4;
    obj.vx = 0;
    obj.vy = 0;
    obj.size = 0.5 + Math.random() * 1.4;
    obj.phase = Math.random() * Math.PI * 2; // 个体抖动相位
    obj.phaseSpeed = 1.6 + Math.random() * 1.4;
    // 状态：'normal' 心上活动；'dust' 自由下落；'settled' 沉积在底部小台上
    obj.state = 'normal';
    obj.dustLife = 0;
    obj.settledLife = 0;
    obj.settledMaxLife = 0;
    // 内圈暖色权重（基于到几何中心的归一化半径）
    const dx = (homeX - CX) / (HEART_W * 0.5);
    const dy = (homeY - CY) / (HEART_H * 0.5);
    const rNorm = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    // r < 0.55 暖；外圈纯冷
    obj.warmW = rNorm < 0.55 ? (1 - rNorm / 0.55) : 0;
    return obj;
  }

  // -----------------------------
  // 底部小台：按 x 分桶记录"堆积高度"，制造起伏的小山丘剪影
  // -----------------------------
  const PILE_BIN_W = 8;          // px per bin
  let pileBins = [];             // 每个桶的累计抬升高度（px）
  const PILE_DECAY = 0.18;       // 每秒下沉速度（让积累不会无限堆，但要堆得起来）
  const PILE_SETTLE_RISE = 1.05; // 一颗粒子落定贡献的高度
  const PILE_NEIGHBOR_LEAK = 0.22; // 落定时把一点高度溢到相邻桶（自然铺开）
  const PILE_MAX = 70;           // 单桶最大堆高（防止极端集中堆出尖塔）

  function rebuildBins() {
    const n = Math.max(8, Math.ceil(W / PILE_BIN_W));
    if (pileBins.length !== n) {
      pileBins = new Array(n).fill(0);
    }
  }

  function baseFloorY(x) {
    // 微微起伏的"地平线"，比纯水平更有自然感
    return H - 14 - Math.sin(x * 0.045) * 2.3 - Math.sin(x * 0.013 + 1.2) * 1.6;
  }

  function getBinIndex(x) {
    if (!pileBins.length) return 0;
    return Math.max(0, Math.min(pileBins.length - 1, Math.floor(x / PILE_BIN_W)));
  }

  function rebuildParticles() {
    // 粒子数量按面积自适应（移动端 / 4 列窄格更省）
    const area = W * H;
    const target = Math.round(Math.max(1500, Math.min(4200, area * 0.018)));
    if (particles.length < target) {
      while (particles.length < target) particles.push(spawnParticle());
    } else if (particles.length > target) {
      particles.length = target;
    } else {
      for (let i = 0; i < particles.length; i++) spawnParticle(particles[i]);
    }
  }

  // -----------------------------
  // 4. 心跳节律（双拍 lub-dub）
  // -----------------------------
  const BEAT_PERIOD = 1.05; // 秒/拍
  function heartbeat(timeS) {
    // 两个高次幂峰：lub 强、dub 弱并相位偏移
    const phase = (timeS % BEAT_PERIOD) / BEAT_PERIOD; // 0..1
    const lub = Math.pow(Math.max(0, Math.sin(phase * Math.PI * 2)), 60);
    const dubPhase = (((timeS - 0.18) % BEAT_PERIOD) + BEAT_PERIOD) % BEAT_PERIOD / BEAT_PERIOD;
    const dub = Math.pow(Math.max(0, Math.sin(dubPhase * Math.PI * 2)), 60) * 0.55;
    return Math.min(1, lub + dub);
  }

  // -----------------------------
  // 5. 鼠标 / 触屏交互
  // -----------------------------
  let pointer = { x: -1e6, y: -1e6, active: false };
  // 点击产生瞬时脉冲：影响所有粒子的爆发与色温偏暖
  let clickPulse = { x: 0, y: 0, t: -1, life: 0 };

  function setPointerFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  }
  canvas.addEventListener('pointerenter', (e) => { pointer.active = true; setPointerFromEvent(e); });
  canvas.addEventListener('pointermove',  (e) => { pointer.active = true; setPointerFromEvent(e); });
  canvas.addEventListener('pointerleave', () => { pointer.active = false; pointer.x = -1e6; pointer.y = -1e6; });
  canvas.addEventListener('pointerdown',  (e) => {
    setPointerFromEvent(e);
    clickPulse.x = pointer.x;
    clickPulse.y = pointer.y;
    clickPulse.t = performance.now() / 1000;
    clickPulse.life = 0.7; // 脉冲持续时长
  });

  // -----------------------------
  // 6. 主循环（受控暂停）
  // -----------------------------
  let running = false;
  let rafId = 0;
  let lastT = 0;
  let timeAccum = 0;

  function start() {
    if (running) return;
    running = true;
    lastT = performance.now();
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastT) / 1000));
    lastT = now;
    timeAccum += dt;
    decayPile(dt);
    update(dt);
    render();
    rafId = requestAnimationFrame(tick);
  }

  function decayPile(dt) {
    // 整个山丘缓慢"沉降"：模拟粒子被吸回心形 / 风吹散
    if (!pileBins.length) return;
    const drop = PILE_DECAY * dt;
    for (let i = 0; i < pileBins.length; i++) {
      if (pileBins[i] > 0) pileBins[i] = Math.max(0, pileBins[i] - drop);
    }
  }

  // -----------------------------
  // 7. 更新（弹簧回 home + 抖动 + 指尖斥力 + 心跳缩放 + 星尘脱发）
  // -----------------------------
  function update(dt) {
    const beat = heartbeat(timeAccum);
    const scaleK = 1 + 0.045 * beat; // 心跳膨胀系数

    // 点击脉冲衰减
    let pulseStrength = 0;
    if (clickPulse.t > 0) {
      const age = (performance.now() / 1000) - clickPulse.t;
      if (age < clickPulse.life) {
        pulseStrength = 1 - age / clickPulse.life;
      } else {
        clickPulse.t = -1;
      }
    }

    const SPRING = 6.5;       // 回弹劲度
    const DAMP = Math.exp(-3.6 * dt); // 阻尼（与 dt 一致的离散衰减）
    const POINTER_R = 70;     // 指尖影响半径
    const POINTER_R2 = POINTER_R * POINTER_R;
    const POINTER_K = 1100;   // 指尖斥力强度系数
    const PULSE_R = 200;
    const PULSE_R2 = PULSE_R * PULSE_R;
    const PULSE_K = 6500;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (p.state === 'settled') {
        // 沉积态：粒子停在底部小台上，仅做极轻微的"呼吸"位移；寿命到则回家重生
        p.settledLife -= dt;
        if (p.settledLife <= 0) {
          spawnParticle(p);
          continue;
        }
        // 微抖（让小台不像一排死贴）
        p.phase += p.phaseSpeed * 0.35 * dt;
        p.x += Math.cos(p.phase) * 0.18;
        // y 轻轻下沉跟随小台沉降
        p.y = Math.min(H - 2, p.y + PILE_DECAY * 0.55 * dt);
        continue;
      }

      if (p.state === 'dust') {
        // 自由下落：真实重力 + 微弱空气阻力
        p.vy += 280 * dt;          // gravity (px/s²)
        p.vx *= Math.exp(-0.9 * dt); // 空气阻力
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.dustLife -= dt;

        // 触及当前 x 处的"地表"：进入沉积态、为该桶贡献高度
        const bi = getBinIndex(p.x);
        const elev = pileBins[bi] || 0;
        const surfaceY = baseFloorY(p.x) - elev;
        if (p.y >= surfaceY) {
          p.y = surfaceY - Math.random() * 1.2;
          p.vx = 0;
          p.vy = 0;
          p.state = 'settled';
          p.settledMaxLife = 4 + Math.random() * 4;
          p.settledLife = p.settledMaxLife;
          // 贡献堆积高度，并溢到相邻桶 → 形成自然铺开的山丘曲线
          pileBins[bi] = Math.min(PILE_MAX, pileBins[bi] + PILE_SETTLE_RISE);
          if (bi - 1 >= 0) {
            pileBins[bi - 1] = Math.min(PILE_MAX, pileBins[bi - 1] + PILE_SETTLE_RISE * PILE_NEIGHBOR_LEAK);
          }
          if (bi + 1 < pileBins.length) {
            pileBins[bi + 1] = Math.min(PILE_MAX, pileBins[bi + 1] + PILE_SETTLE_RISE * PILE_NEIGHBOR_LEAK);
          }
          continue;
        }

        // 兜底：飞出画布或寿命耗尽时回家
        if (p.dustLife <= 0 || p.y > H + 14 || p.x < -20 || p.x > W + 20) {
          spawnParticle(p);
        }
        continue;
      }

      // 心跳缩放后的目标位置（围绕心形几何中心）
      const tx = CX + (p.homeX - CX) * scaleK;
      const ty = CY + (p.homeY - CY) * scaleK;

      // 弹簧回家
      let ax = (tx - p.x) * SPRING;
      let ay = (ty - p.y) * SPRING;

      // 个体抖动力（让粒子始终是"活的"）
      p.phase += p.phaseSpeed * dt;
      ax += Math.cos(p.phase) * 14;
      ay += Math.sin(p.phase * 1.3 + 0.7) * 14;

      // 指尖斥力（鼠标在 canvas 内时）
      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_R2 && d2 > 1) {
          const inv = 1 / Math.sqrt(d2);
          const falloff = 1 - d2 / POINTER_R2; // 0~1
          const f = POINTER_K * falloff * inv;
          ax += dx * f;
          ay += dy * f;
        }
      }

      // 点击脉冲：以点击点为中心向外扩散
      if (pulseStrength > 0) {
        const dx = p.x - clickPulse.x;
        const dy = p.y - clickPulse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PULSE_R2 && d2 > 1) {
          const inv = 1 / Math.sqrt(d2);
          const falloff = 1 - d2 / PULSE_R2;
          const f = PULSE_K * falloff * pulseStrength * inv;
          ax += dx * f;
          ay += dy * f;
        }
      }

      // Verlet-ish 显式积分 + 阻尼
      p.vx = (p.vx + ax * dt) * DAMP;
      p.vy = (p.vy + ay * dt) * DAMP;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 少量粒子转入星尘脱发模式（自然下落到底部小台）
      if (Math.random() < 0.00022) {
        p.state = 'dust';
        p.dustLife = 4.0 + Math.random() * 2.0;
        p.vx = (Math.random() - 0.5) * 22;
        p.vy = 30 + Math.random() * 40;
      }
    }

    // 暴露给 render
    update._pulse = pulseStrength;
    update._beat = beat;
  }

  // -----------------------------
  // 8. 渲染
  // -----------------------------
  function render() {
    // 背景：用两层半透明覆盖造出"轻微余晖"，比直接 clear 更柔
    // 第一层：偏冷的整体衰减
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(8, 16, 24, 0.32)';
    ctx.fillRect(0, 0, W, H);
    // 第二层：心形中心位置加一团极淡冷青光
    const radial = ctx.createRadialGradient(CX, CY, 6, CX, CY, Math.max(HEART_W, HEART_H) * 0.55);
    radial.addColorStop(0, 'rgba(40, 90, 110, 0.06)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    // 粒子：加性混合让发光更自然
    ctx.globalCompositeOperation = 'lighter';
    const beat = update._beat || 0;
    const pulse = update._pulse || 0;

    // 颜色基底：冷青；点击短暂偏暖；心跳峰值时整体亮一档
    const baseAlpha = 0.55 + 0.18 * beat;
    const warmBoost = 0.3 + 0.7 * pulse; // 点击瞬时强化暖色
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      let alpha = baseAlpha;
      let r, g, b;

      if (p.state === 'settled') {
        // 沉积粒子：偏冷银白，alpha 随寿命淡出，永远比心形粒子稍弱以拉开层次
        const k = Math.max(0, Math.min(1, p.settledLife / Math.max(0.001, p.settledMaxLife)));
        alpha = (0.32 + 0.18 * k);
        r = 200; g = 226; b = 232;
      } else if (p.state === 'dust') {
        // 飘落途中略偏暖（从心里掉下来），alpha 跟随寿命衰减
        alpha = baseAlpha * Math.max(0.2, Math.min(1, p.dustLife / 4));
        r = 188; g = 224; b = 224;
      } else {
        // 心形粒子：冷青基底 + 暖心覆盖
        const w = Math.min(1, p.warmW * (1 - 0.4 * beat) + 0.35 * warmBoost * (1 - p.warmW));
        r = Math.round(132 + (255 - 132) * w);
        g = Math.round(226 + (192 - 226) * w);
        b = Math.round(222 + (196 - 222) * w);
      }

      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 公式彩蛋（极淡）
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(220, 235, 240, 0.18)';
    ctx.font = '10px ui-monospace, "JetBrains Mono", "Menlo", monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('x = 16 sin\u00B3 t', 12, H - 24);
    ctx.fillText('y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t', 12, H - 10);
  }

  // -----------------------------
  // 9. 暂停 / 恢复（IO + visibility）
  // -----------------------------
  let inView = true;
  let docVisible = !document.hidden;

  const io = (typeof IntersectionObserver !== 'undefined')
    ? new IntersectionObserver((entries) => {
        for (const e of entries) inView = e.isIntersecting;
        sync();
      }, { threshold: 0.05 })
    : null;
  if (io) io.observe(mount);

  document.addEventListener('visibilitychange', () => {
    docVisible = !document.hidden;
    sync();
  });

  function sync() {
    if (inView && docVisible) start();
    else stop();
  }

  // -----------------------------
  // 10. 启动
  // -----------------------------
  resize();
  rebuildBins();
  rebuildParticles();
  // 重新计算 home（依赖布局）
  for (let i = 0; i < particles.length; i++) spawnParticle(particles[i]);

  window.addEventListener('resize', () => {
    resize();
    rebuildBins();
    rebuildParticles();
  }, { passive: true });

  start();
})();

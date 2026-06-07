/* global THREE */
(() => {
  if (!window.THREE) {
    console.error('Three.js not loaded. Make sure three.min.js is included before curtain.js');
    return;
  }

  const mount = document.getElementById('curtainMount');
  if (!mount) return;

  const PHOTO_URL = 'images/2025-11-14_001.jpg';

  // -----------------------------
  // 1. 幕布织物程序纹理（避免塑料感、强化"布"的阅读）
  // -----------------------------
  function createFabricTexture(width = 768, height = 1280) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');

    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#4a2e3a');
    base.addColorStop(0.5, '#3d2530');
    base.addColorStop(1, '#352028');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // 纵向丝缕（深色丝绒纹理）
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * width;
      const w = 0.6 + Math.random() * 1.8;
      const a = 0.03 + Math.random() * 0.06;
      ctx.fillStyle = `rgba(255,220,220,${a})`;
      ctx.fillRect(x, 0, w, height);
      ctx.fillStyle = `rgba(0,0,0,${a * 0.5})`;
      ctx.fillRect(x + w * 0.5, 0, w * 0.4, height);
    }

    // 横向织纹
    for (let j = 0; j < 110; j++) {
      const y = Math.random() * height;
      ctx.fillStyle = `rgba(255,200,200,${0.02 + Math.random() * 0.03})`;
      ctx.fillRect(0, y, width, 0.6);
    }

    // 颗粒噪声（深色布料用更细腻的噪点）
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);

    // 顶部"挂杆"暗带
    const top = ctx.createLinearGradient(0, 0, 0, 60);
    top.addColorStop(0, 'rgba(0,0,0,0.25)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, width, 60);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  // -----------------------------
  // 2. Verlet 物理（与 receipt.js 同构，独立一份避免相互耦合）
  // -----------------------------
  class Particle {
    constructor(x, y, z, invMass = 1) {
      this.pos = new THREE.Vector3(x, y, z);
      this.prev = new THREE.Vector3(x, y, z);
      this.acc = new THREE.Vector3(0, 0, 0);
      this.invMass = invMass;
    }
    addForce(f) { this.acc.addScaledVector(f, this.invMass); }
    verlet(dt, damping) {
      if (this.invMass === 0) {
        this.acc.set(0, 0, 0);
        this.prev.copy(this.pos);
        return;
      }
      const vx = (this.pos.x - this.prev.x) * damping;
      const vy = (this.pos.y - this.prev.y) * damping;
      const vz = (this.pos.z - this.prev.z) * damping;
      const nextX = this.pos.x + vx + this.acc.x * dt * dt;
      const nextY = this.pos.y + vy + this.acc.y * dt * dt;
      const nextZ = this.pos.z + vz + this.acc.z * dt * dt;
      this.prev.set(this.pos.x, this.pos.y, this.pos.z);
      this.pos.set(nextX, nextY, nextZ);
      this.acc.set(0, 0, 0);
    }
  }

  class DistanceConstraint {
    constructor(a, b, restLength, stiffness) {
      this.a = a;
      this.b = b;
      this.rest = restLength;
      this.stiff = stiffness;
    }
    solve() {
      const a = this.a, b = this.b;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const dz = b.pos.z - a.pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const diff = (dist - this.rest) / dist;
      const w1 = a.invMass, w2 = b.invMass, wsum = w1 + w2;
      if (wsum === 0) return;
      const s = this.stiff;
      const cx = dx * diff * s, cy = dy * diff * s, cz = dz * diff * s;
      if (w1 !== 0) {
        a.pos.x += (cx * w1) / wsum;
        a.pos.y += (cy * w1) / wsum;
        a.pos.z += (cz * w1) / wsum;
      }
      if (w2 !== 0) {
        b.pos.x -= (cx * w2) / wsum;
        b.pos.y -= (cy * w2) / wsum;
        b.pos.z -= (cz * w2) / wsum;
      }
    }
  }

  // 比 receipt 更柔的"布"：bend 系数更小，shear 略弱，integration damping 略低
  class Curtain {
    constructor(opts) {
      const {
        segX = 28,
        segY = 38,
        width = 3.2,
        height = 4.2,
        origin = new THREE.Vector3(0, 2.0, 0),
      } = opts || {};
      this.segX = segX;
      this.segY = segY;
      this.width = width;
      this.height = height;
      this.origin = origin.clone();

      this.particles = [];
      this.constraints = [];
      this._topPinned = [];
      this._topPinPositions = [];

      for (let j = 0; j <= segY; j++) {
        for (let i = 0; i <= segX; i++) {
          const u = i / segX, v = j / segY;
          const x = (u - 0.5) * width + origin.x;
          const y = origin.y - v * height;
          const z = origin.z;
          this.particles.push(new Particle(x, y, z, 1));
        }
      }

      const idx = (i, j) => j * (segX + 1) + i;
      const dx = width / segX;
      const dy = height / segY;

      for (let j = 0; j <= segY; j++) {
        for (let i = 0; i <= segX; i++) {
          if (i < segX) this.constraints.push(new DistanceConstraint(this.particles[idx(i, j)], this.particles[idx(i + 1, j)], dx, 0.92));
          if (j < segY) this.constraints.push(new DistanceConstraint(this.particles[idx(i, j)], this.particles[idx(i, j + 1)], dy, 0.92));
        }
      }
      const diag = Math.sqrt(dx * dx + dy * dy);
      for (let j = 0; j < segY; j++) {
        for (let i = 0; i < segX; i++) {
          this.constraints.push(new DistanceConstraint(this.particles[idx(i, j)], this.particles[idx(i + 1, j + 1)], diag, 0.4));
          this.constraints.push(new DistanceConstraint(this.particles[idx(i + 1, j)], this.particles[idx(i, j + 1)], diag, 0.4));
        }
      }
      // bend 系数更小，避免过纸感
      for (let j = 0; j <= segY; j++) {
        for (let i = 0; i <= segX; i++) {
          if (i + 2 <= segX) this.constraints.push(new DistanceConstraint(this.particles[idx(i, j)], this.particles[idx(i + 2, j)], dx * 2, 0.12));
          if (j + 2 <= segY) this.constraints.push(new DistanceConstraint(this.particles[idx(i, j)], this.particles[idx(i, j + 2)], dy * 2, 0.12));
        }
      }

      // 顶边整行固定（挂杆）
      for (let i = 0; i <= segX; i++) {
        const p = this.particles[idx(i, 0)];
        p.invMass = 0;
        this._topPinned.push(p);
        this._topPinPositions.push(p.pos.clone());
      }
    }

    getParticleByUV(u, v) {
      const i = Math.round(THREE.MathUtils.clamp(u, 0, 1) * this.segX);
      const j = Math.round(THREE.MathUtils.clamp(v, 0, 1) * this.segY);
      return this.particles[j * (this.segX + 1) + i];
    }

    enforceTopEdge() {
      for (let i = 0; i < this._topPinned.length; i++) {
        const p = this._topPinned[i];
        const pin = this._topPinPositions[i];
        p.pos.copy(pin);
        p.prev.copy(pin);
      }
    }

    step(dt, iters, gravity, wind, damping) {
      for (const p of this.particles) {
        if (p.invMass !== 0) {
          p.addForce(gravity);
          p.addForce(wind);
        }
        p.verlet(dt, damping);
      }
      for (let k = 0; k < iters; k++) {
        this.enforceTopEdge();
        for (const c of this.constraints) c.solve();
      }
      this.enforceTopEdge();
    }
  }

  // -----------------------------
  // 3. Three.js 舞台（透明背景，与卡片融合）
  // -----------------------------
  const scene = new THREE.Scene();
  // 背景透明，让 .curtain-shell 的渐变直接当"墙面/挂布的环境"
  scene.background = null;

  // 4 列布局下窄格 (~336px wide) 的横向取景会被压扁，把相机往后挪一点保护构图
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 1.4, 9.2);
  camera.lookAt(0, 0.7, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  // 场景里照片是 MeshBasicMaterial，不参与光照与阴影；关闭 shadowMap 节省 GPU
  renderer.shadowMap.enabled = false;
  mount.appendChild(renderer.domElement);

  // 灯光：与 receipt 区块协调，整体偏暖白
  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(-2.6, 5.2, 4.0);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xffffff, 0.32);
  fill.position.set(3.4, 2.0, 4.8);
  scene.add(fill);

  // -----------------------------
  // 4. 背后双人照片平面（contain 适配，外圈柔色边）
  // -----------------------------
  const PHOTO_W = 2.8;
  const PHOTO_H = 2.4; // 占位，加载完按真实宽高比覆写
  const PHOTO_Y = 0.5; // 居中于新幕布范围（top 2.0 / bottom -1.6）
  const photoMat = new THREE.MeshBasicMaterial({
    color: 0xfaf6ee,
  });
  const photoGeo = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H);
  const photoMesh = new THREE.Mesh(photoGeo, photoMat);
  photoMesh.position.set(0, PHOTO_Y, -0.32);
  scene.add(photoMesh);

  // 装饰相框边（比照片略大的米色衬底，做"画框"感）
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xefe7d6 });
  const frameGeo = new THREE.PlaneGeometry(PHOTO_W + 0.18, PHOTO_H + 0.18);
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.set(0, PHOTO_Y, -0.34);
  scene.add(frameMesh);

  const loader = new THREE.TextureLoader();
  loader.load(
    PHOTO_URL,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;

      const iw = tex.image && tex.image.width ? tex.image.width : 4;
      const ih = tex.image && tex.image.height ? tex.image.height : 3;
      const aspect = iw / ih;

      // 在 PHOTO_W x PHOTO_H 这块"画框区域"里以 contain 方式适配照片
      const frameAspect = PHOTO_W / PHOTO_H;
      let pw = PHOTO_W, ph = PHOTO_H;
      if (aspect > frameAspect) {
        pw = PHOTO_W;
        ph = PHOTO_W / aspect;
      } else {
        ph = PHOTO_H;
        pw = PHOTO_H * aspect;
      }
      photoMesh.geometry.dispose();
      photoMesh.geometry = new THREE.PlaneGeometry(pw, ph);

      photoMat.color.set(0xffffff);
      photoMat.map = tex;
      photoMat.needsUpdate = true;
    },
    undefined,
    (err) => {
      console.warn('Curtain photo failed to load:', err);
    }
  );

  // -----------------------------
  // 5. 幕布（Verlet 网格 + PhysicalMaterial）
  // -----------------------------
  const fabricTex = createFabricTexture();

  const curtainMat = new THREE.MeshPhysicalMaterial({
    map: fabricTex,
    color: 0x5a3e4a,
    roughness: 0.82,
    metalness: 0.0,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xdda0a0),
    sheenRoughness: 0.55,
    clearcoat: 0.06,
    clearcoatRoughness: 0.8,
    transparent: true,
    opacity: 0.99,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const curtain = new Curtain({
    segX: 28,
    segY: 36,
    width: 3.4,
    height: 3.6,
    origin: new THREE.Vector3(0, 2.0, 0.06),
  });
  const curtainGeo = new THREE.PlaneGeometry(curtain.width, curtain.height, curtain.segX, curtain.segY);
  curtainGeo.translate(0, -curtain.height / 2, 0);
  curtainGeo.translate(curtain.origin.x, curtain.origin.y, curtain.origin.z);

  const curtainMesh = new THREE.Mesh(curtainGeo, curtainMat);
  curtainMesh.renderOrder = 2;
  scene.add(curtainMesh);

  // 木质挂杆：横向圆柱体，比幕布略宽，落在幕布顶上一点点
  const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, 3.7, 18);
  rodGeo.rotateZ(Math.PI / 2);
  const rodMat = new THREE.MeshStandardMaterial({
    color: 0x9b8769,
    roughness: 0.55,
    metalness: 0.35,
  });
  const rod = new THREE.Mesh(rodGeo, rodMat);
  rod.position.set(0, 2.07, 0.05);
  scene.add(rod);

  // 杆头两端的小球体收口（finial），更有"实体挂杆"质感
  const finialGeo = new THREE.SphereGeometry(0.075, 16, 12);
  const finialL = new THREE.Mesh(finialGeo, rodMat);
  finialL.position.set(-1.85, 2.07, 0.05);
  scene.add(finialL);
  const finialR = new THREE.Mesh(finialGeo, rodMat);
  finialR.position.set(1.85, 2.07, 0.05);
  scene.add(finialR);

  const curtainPosAttr = curtainMesh.geometry.attributes.position;
  function syncCurtainGeometry() {
    let k = 0;
    for (let j = 0; j <= curtain.segY; j++) {
      for (let i = 0; i <= curtain.segX; i++) {
        const p = curtain.particles[k++];
        curtainPosAttr.setXYZ(k - 1, p.pos.x, p.pos.y, p.pos.z);
      }
    }
    curtainPosAttr.needsUpdate = true;
  }

  // -----------------------------
  // 6. 拾取与拖拽（与 receipt.js 同款）
  // -----------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const _camDir = new THREE.Vector3();
  const _dragHit = new THREE.Vector3();
  const grabPlane = new THREE.Plane();
  const grabTarget = new THREE.Vector3();

  let grabbed = null;
  let isDown = false;

  function ndcFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function pick(e) {
    ndcFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(curtainMesh, false);
    if (!hits.length) return null;
    const hit = hits[0];

    const uv = hit.uv;
    let best = curtain.getParticleByUV(uv.x, 1 - uv.y);
    let bestD2 = best.pos.distanceToSquared(hit.point);
    const i0 = Math.round(THREE.MathUtils.clamp(uv.x, 0, 1) * curtain.segX);
    const j0 = Math.round(THREE.MathUtils.clamp(1 - uv.y, 0, 1) * curtain.segY);
    const idx = (i, j) => j * (curtain.segX + 1) + i;
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || i > curtain.segX || j < 0 || j > curtain.segY) continue;
        const p = curtain.particles[idx(i, j)];
        const d2 = p.pos.distanceToSquared(hit.point);
        if (d2 < bestD2) { bestD2 = d2; best = p; }
      }
    }

    camera.getWorldDirection(_camDir);
    grabPlane.setFromNormalAndCoplanarPoint(_camDir, hit.point);
    grabTarget.copy(hit.point);
    return best;
  }

  function onDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDown = true;
    renderer.domElement.setPointerCapture?.(e.pointerId);
    const p = pick(e);
    if (!p) return;
    if (p.invMass === 0) return;
    grabbed = p;
    grabbed.invMass = 0;
  }
  function onMove(e) {
    if (!isDown || !grabbed) return;
    ndcFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(grabPlane, _dragHit)) {
      grabTarget.copy(_dragHit);
    }
  }
  function onUp(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDown = false;
    renderer.domElement.releasePointerCapture?.(e.pointerId);
    if (grabbed) {
      grabbed.invMass = 1;
      grabbed = null;
    }
  }

  renderer.domElement.addEventListener('pointerdown', onDown, { passive: true });
  renderer.domElement.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });

  // -----------------------------
  // 7. resize / 主循环
  // -----------------------------
  function resize() {
    const rect = mount.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let lastT = performance.now();
  let tAccum = 0;
  let normalCD = 0;
  const gravity = new THREE.Vector3(0, -7.2, 0); // 比小票更轻盈
  const wind = new THREE.Vector3();

  function animate(now) {
    const rawDt = (now - lastT) / 1000;
    lastT = now;
    const dt = Math.min(1 / 30, Math.max(1 / 240, rawDt));
    tAccum += dt;

    const ws = 0.55 + (grabbed ? 0.45 : 0.0);
    wind.set(
      Math.sin(tAccum * 0.55) * 0.28,
      Math.sin(tAccum * 0.9) * 0.05,
      (Math.sin(tAccum * 1.0) * 0.55 + Math.sin(tAccum * 1.9) * 0.22) * ws
    );

    if (grabbed) {
      grabbed.pos.copy(grabTarget);
      grabbed.prev.copy(grabTarget);
    }

    const iters = grabbed ? 6 : 8;
    const damping = grabbed ? 0.982 : 0.99;
    curtain.step(dt, iters, gravity, wind, damping);

    syncCurtainGeometry();

    normalCD -= dt;
    if (normalCD <= 0) {
      curtainMesh.geometry.computeVertexNormals();
      normalCD = grabbed ? 0.08 : 0.13;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

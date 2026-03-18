/* global THREE */
(() => {
  if (!window.THREE) {
    console.error('Three.js not loaded. Make sure three.min.js is included before receipt.js');
    return;
  }

  const mount = document.getElementById('receiptMount');
  if (!mount) return;

  // -----------------------------
  // Thermal paper texture (canvas)
  // -----------------------------
  const RECEIPT_QUOTES = [
    '你是我日常里\n最确定的心动。',
    '我把喜欢写进\n每一次呼吸里。',
    '今天也想抱抱你。\n明天也是。',
    '你出现之后，\n世界开始偏向温柔。',
    '愿我们把平凡\n过成闪闪发光。',
  ];

  function createThermalPaperTexture(width = 1024, height = 2048) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d', { alpha: false });

    // base
    ctx.fillStyle = '#fbfaf6';
    ctx.fillRect(0, 0, width, height);

    // subtle warm gradient
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.35, 'rgba(245,244,238,0.35)');
    g.addColorStop(1, 'rgba(240,238,232,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // noise (thermal paper grain)
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    // low-cost noise: step pixels
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const n = (Math.random() - 0.5) * 10; // subtle
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        // keep alpha 255
      }
    }
    ctx.putImageData(img, 0, 0);

    // header area
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 110, width, 2);

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.font = '700 44px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RECEIPT OF LOVE', width / 2, 86);

    // small meta text
    ctx.font = '400 24px Montserrat, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(
      now.getHours()
    )}:${pad2(now.getMinutes())}`;
    ctx.fillText(`TIME: ${stamp}`, 56, 150);
    ctx.fillText('FROM: Tong & Yang', 56, 186);
    ctx.fillText('TO: Our Future', 56, 222);

    // dotted separators
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.font = '400 26px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('- - - - - - - - - - - - - - - - - - - - - - - - -', width / 2, 270);

    // quote block
    const q = RECEIPT_QUOTES[Math.floor(Math.random() * RECEIPT_QUOTES.length)];
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.font = '600 54px Pacifico, cursive';
    const lines = q.split('\n');
    let y = 390;
    for (const line of lines) {
      ctx.fillText(line, 70, y);
      y += 86;
    }

    // body text
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.font = '400 26px Montserrat, sans-serif';
    const body = [
      'ITEM                     QTY     LOVE',
      '--------------------------------------',
      '想你                      1       ∞',
      '拥抱                      1       ∞',
      '陪伴                      1       ∞',
      '偏爱                      1       ∞',
      '--------------------------------------',
      'TOTAL                            ∞',
      '',
      '备注：小票可抓取折叠，',
      '      顶边永远平直固定。',
      '',
      'THANK YOU FOR EXISTING.',
    ];
    y = 680;
    for (const line of body) {
      ctx.fillText(line, 70, y);
      y += 44;
    }

    // serrated bottom edge hint
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 0; x < width; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, height - 34);
      ctx.lineTo(x + 13, height - 10);
      ctx.lineTo(x + 26, height - 34);
      ctx.closePath();
      ctx.fill();
    }

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
  // Verlet cloth (receipt paper)
  // -----------------------------
  class Particle {
    constructor(x, y, z, invMass = 1) {
      this.pos = new THREE.Vector3(x, y, z);
      this.prev = new THREE.Vector3(x, y, z);
      this.acc = new THREE.Vector3(0, 0, 0);
      this.invMass = invMass; // 0 => fixed
    }

    addForce(f) {
      this.acc.addScaledVector(f, this.invMass);
    }

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
      const a = this.a;
      const b = this.b;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const dz = b.pos.z - a.pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const diff = (dist - this.rest) / dist;

      const w1 = a.invMass;
      const w2 = b.invMass;
      const wsum = w1 + w2;
      if (wsum === 0) return;

      const s = this.stiff;
      const corrX = dx * diff * s;
      const corrY = dy * diff * s;
      const corrZ = dz * diff * s;

      if (w1 !== 0) {
        a.pos.x += (corrX * w1) / wsum;
        a.pos.y += (corrY * w1) / wsum;
        a.pos.z += (corrZ * w1) / wsum;
      }
      if (w2 !== 0) {
        b.pos.x -= (corrX * w2) / wsum;
        b.pos.y -= (corrY * w2) / wsum;
        b.pos.z -= (corrZ * w2) / wsum;
      }
    }
  }

  class ReceiptCloth {
    constructor(opts) {
      const {
        segX = 26,
        segY = 64,
        width = 2.3,
        height = 4.2,
        origin = new THREE.Vector3(0, 1.9, 0),
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

      // build particle grid (top row j=0)
      for (let j = 0; j <= segY; j++) {
        for (let i = 0; i <= segX; i++) {
          const u = i / segX;
          const v = j / segY;
          const x = (u - 0.5) * width + origin.x;
          const y = origin.y - v * height;
          const z = origin.z;
          const invMass = 1;
          const p = new Particle(x, y, z, invMass);
          this.particles.push(p);
        }
      }

      const idx = (i, j) => j * (segX + 1) + i;
      const dx = width / segX;
      const dy = height / segY;

      // structural constraints
      for (let j = 0; j <= segY; j++) {
        for (let i = 0; i <= segX; i++) {
          if (i < segX) {
            this.constraints.push(
              new DistanceConstraint(
                this.particles[idx(i, j)],
                this.particles[idx(i + 1, j)],
                dx,
                0.95
              )
            );
          }
          if (j < segY) {
            this.constraints.push(
              new DistanceConstraint(
                this.particles[idx(i, j)],
                this.particles[idx(i, j + 1)],
                dy,
                0.95
              )
            );
          }
        }
      }

      // shear constraints (diagonals)
      const diag = Math.sqrt(dx * dx + dy * dy);
      for (let j = 0; j < segY; j++) {
        for (let i = 0; i < segX; i++) {
          this.constraints.push(
            new DistanceConstraint(this.particles[idx(i, j)], this.particles[idx(i + 1, j + 1)], diag, 0.55)
          );
          this.constraints.push(
            new DistanceConstraint(this.particles[idx(i + 1, j)], this.particles[idx(i, j + 1)], diag, 0.55)
          );
        }
      }

      // bend constraints (two steps) to feel like paper, not cloth
      for (let j = 0; j <= segY; j++) {
        for (let i = 0; i <= segX; i++) {
          if (i + 2 <= segX) {
            this.constraints.push(
              new DistanceConstraint(
                this.particles[idx(i, j)],
                this.particles[idx(i + 2, j)],
                dx * 2,
                0.28
              )
            );
          }
          if (j + 2 <= segY) {
            this.constraints.push(
              new DistanceConstraint(
                this.particles[idx(i, j)],
                this.particles[idx(i, j + 2)],
                dy * 2,
                0.28
              )
            );
          }
        }
      }

      // pin entire top edge: ALL particles on row j=0
      for (let i = 0; i <= segX; i++) {
        const p = this.particles[idx(i, 0)];
        p.invMass = 0; // fixed
        this._topPinned.push(p);
        this._topPinPositions.push(p.pos.clone());
      }
    }

    getParticleByUV(u, v) {
      const i = Math.round(THREE.MathUtils.clamp(u, 0, 1) * this.segX);
      const j = Math.round(THREE.MathUtils.clamp(v, 0, 1) * this.segY);
      return this.particles[j * (this.segX + 1) + i];
    }

    enforceTopEdgeStraight() {
      // Hard constraint every iteration: top edge stays perfectly straight + level.
      // Not just 3 points: we restore ALL top-row particles to their pinned positions.
      for (let i = 0; i < this._topPinned.length; i++) {
        const p = this._topPinned[i];
        const pin = this._topPinPositions[i];
        p.pos.copy(pin);
        p.prev.copy(pin);
      }
    }

    step(dt, solverIters, gravity, wind, damping) {
      // apply forces + integrate
      for (const p of this.particles) {
        if (p.invMass !== 0) {
          p.addForce(gravity);
          p.addForce(wind);
        }
        p.verlet(dt, damping);
      }

      // solve constraints iteratively
      for (let k = 0; k < solverIters; k++) {
        // critical: keep top edge straight throughout solving
        this.enforceTopEdgeStraight();
        for (const c of this.constraints) c.solve();
      }

      // final enforce (avoid any drift)
      this.enforceTopEdgeStraight();
    }
  }

  // -----------------------------
  // Three.js stage
  // -----------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 1.4, 8.0);
  camera.lookAt(0, 0.8, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  mount.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(-2.8, 5.6, 3.6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 0.1;
  dir.shadow.camera.far = 30;
  dir.shadow.camera.left = -6;
  dir.shadow.camera.right = 6;
  dir.shadow.camera.top = 6;
  dir.shadow.camera.bottom = -6;
  scene.add(dir);

  // gentle fill light to reveal paper printing
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(3.6, 2.2, 5.2);
  scene.add(fill);

  // soft ground shadow receiver (transparent)
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.22 });
  const groundGeo = new THREE.PlaneGeometry(10, 10);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.2;
  ground.receiveShadow = true;
  scene.add(ground);

  // receipt cloth
  const texture = createThermalPaperTexture();
  texture.anisotropy = 8;

  const paperMat = new THREE.MeshPhysicalMaterial({
    map: texture,
    color: 0xfaf6ee,
    roughness: 0.92,
    metalness: 0.0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.65,
    sheen: 0.0,
    side: THREE.DoubleSide,
  });

  // geometry resolution (balanced for performance)
  const cloth = new ReceiptCloth({ segX: 26, segY: 66, width: 2.25, height: 4.5, origin: new THREE.Vector3(0, 2.1, 0) });
  const geo = new THREE.PlaneGeometry(cloth.width, cloth.height, cloth.segX, cloth.segY);
  // Move plane so its top edge is at y = origin.y
  geo.translate(0, -cloth.height / 2, 0);
  geo.translate(cloth.origin.x, cloth.origin.y, cloth.origin.z);

  const mesh = new THREE.Mesh(geo, paperMat);
  // Slight tilt so highlights/shadows read as "paper weight"
  mesh.rotation.x = -0.06;
  mesh.rotation.y = 0.04;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  scene.add(mesh);

  // map particles -> geometry positions
  const posAttr = mesh.geometry.attributes.position;

  function syncGeometryFromParticles() {
    // PlaneGeometry vertex order matches grid order row-major (y segments).
    let k = 0;
    for (let j = 0; j <= cloth.segY; j++) {
      for (let i = 0; i <= cloth.segX; i++) {
        const p = cloth.particles[k++];
        posAttr.setXYZ(k - 1, p.pos.x, p.pos.y, p.pos.z);
      }
    }
    posAttr.needsUpdate = true;
  }

  // -----------------------------
  // Interaction: grab / drag / release
  // -----------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const _camDir = new THREE.Vector3();
  const _dragIntersect = new THREE.Vector3();

  let grabbed = null;
  let grabbedWasFixed = false;
  let grabPlane = new THREE.Plane();
  let grabTarget = new THREE.Vector3();
  let isPointerDown = false;

  // convert pointer coordinates to NDC
  function updatePointerFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointer.x = x * 2 - 1;
    pointer.y = -(y * 2 - 1);
  }

  function pickParticle(e) {
    updatePointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(mesh, false);
    if (!hits.length) return null;
    const hit = hits[0];

    // Use UV to get a good initial guess, then refine by local neighborhood search.
    const uv = hit.uv;
    let p0 = cloth.getParticleByUV(uv.x, 1 - uv.y);
    let best = p0;
    let bestD2 = best.pos.distanceToSquared(hit.point);

    // refine around guessed grid cell (up to 2 rings)
    const segX = cloth.segX;
    const segY = cloth.segY;
    const i0 = Math.round(THREE.MathUtils.clamp(uv.x, 0, 1) * segX);
    const j0 = Math.round(THREE.MathUtils.clamp(1 - uv.y, 0, 1) * segY);
    const idx = (i, j) => j * (segX + 1) + i;
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const i = i0 + di;
        const j = j0 + dj;
        if (i < 0 || i > segX || j < 0 || j > segY) continue;
        const p = cloth.particles[idx(i, j)];
        const d2 = p.pos.distanceToSquared(hit.point);
        if (d2 < bestD2) {
          bestD2 = d2;
          best = p;
        }
      }
    }

    // define drag plane: perpendicular to camera, passing through hit point
    camera.getWorldDirection(_camDir);
    grabPlane.setFromNormalAndCoplanarPoint(_camDir, hit.point);
    grabTarget.copy(hit.point);

    return best;
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    isPointerDown = true;
    renderer.domElement.setPointerCapture?.(e.pointerId);

    const p = pickParticle(e);
    if (!p) return;
    // do not allow grabbing fixed top edge; still allow near it but not the pinned row
    if (p.invMass === 0) return;

    grabbed = p;
    grabbedWasFixed = false;
    // make it temporarily fixed to follow cursor
    grabbed.invMass = 0;
  }

  function onPointerMove(e) {
    if (!isPointerDown || !grabbed) return;
    updatePointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(grabPlane, _dragIntersect)) {
      grabTarget.copy(_dragIntersect);
    }
  }

  function onPointerUp(e) {
    if (e.button !== 0) return;
    isPointerDown = false;
    renderer.domElement.releasePointerCapture?.(e.pointerId);
    if (grabbed) {
      // restore dynamic
      grabbed.invMass = 1;
      grabbed = null;
      grabbedWasFixed = false;
    }
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
  renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });

  // -----------------------------
  // Resize & render loop
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
  let normalCooldown = 0;
  const gravity = new THREE.Vector3(0, -9.2, 0);
  const wind = new THREE.Vector3();

  function animate(now) {
    const rawDt = (now - lastT) / 1000;
    lastT = now;
    const dt = Math.min(1 / 30, Math.max(1 / 240, rawDt)); // clamp
    tAccum += dt;

    // forces
    // gentle wind wobble, mostly in z to create folds
    const windStrength = 0.65 + (grabbed ? 0.35 : 0.0);
    wind.set(
      Math.sin(tAccum * 0.7) * 0.35,
      0,
      (Math.sin(tAccum * 1.15) * 0.6 + Math.sin(tAccum * 2.2) * 0.25) * windStrength
    );

    // drag pin update
    if (grabbed) {
      grabbed.pos.copy(grabTarget);
      grabbed.prev.copy(grabTarget);
    }

    // solver iterations: keep stable but responsive while dragging
    const iters = grabbed ? 7 : 9;
    const damping = grabbed ? 0.985 : 0.992;
    cloth.step(dt, iters, gravity, wind, damping);

    syncGeometryFromParticles();

    // normals: expensive; update at reduced rate
    normalCooldown -= dt;
    if (normalCooldown <= 0) {
      mesh.geometry.computeVertexNormals();
      normalCooldown = grabbed ? 0.08 : 0.12;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();


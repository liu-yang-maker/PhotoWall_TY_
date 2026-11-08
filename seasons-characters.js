/*
 * seasons-characters.js
 * 晓彤和洋（Q 版小人，牵着手、随季节换装），鸣人（灰白拿破仑矮脚猫）和来宝（白猫）。
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const SKIN = '#f9d9c6';

let gradientMap = null;
function toonGradient() {
    if (gradientMap) return gradientMap;
    gradientMap = new THREE.DataTexture(new Uint8Array([92, 168, 226]), 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
    return gradientMap;
}
const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });

const OUTLINE = new THREE.MeshBasicMaterial({ color: '#2a1d1f', side: THREE.BackSide });
OUTLINE.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.011;');
};

function part(geo, mat, parent, { p, r, s, outline = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    if (s) m.scale.set(s[0], s[1], s[2]);
    if (outline) {
        const o = new THREE.Mesh(geo, OUTLINE);
        o.raycast = () => {};
        m.add(o);
    }
    parent.add(m);
    return m;
}
const sphere = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 5, 12);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => x * x * (3 - 2 * x);
function easeOutBack(x) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
function blendColor(out, pal, w) {
    out.setRGB(0, 0, 0);
    for (let s = 0; s < 4; s++) {
        out.r += pal[s].r * w[s];
        out.g += pal[s].g * w[s];
        out.b += pal[s].b * w[s];
    }
    return out;
}

// 季节小配饰：在对应季节弹出来，其它季节缩回去
function accessory(obj, seasons) {
    obj.visible = false;
    obj.scale.setScalar(0.0001);
    return { obj, seasons, s: 0, base: 1 };
}
function updateAccessory(a, w, dt) {
    let sum = 0;
    for (const s of a.seasons) sum += w[s];
    const target = sum > 0.5 ? 1 : 0;
    a.s += (target - a.s) * Math.min(1, dt * 5);
    if (Math.abs(target - a.s) < 0.002) a.s = target;
    a.obj.visible = a.s > 0.01;
    a.obj.scale.setScalar(Math.max(0.0001, a.base * (target ? easeOutBack(a.s) : a.s)));
}

// ---------- 小人 ----------
function makeFlower(parent, p, petalColor) {
    const g = new THREE.Group();
    g.position.set(p[0], p[1], p[2]);
    const pm = toon(petalColor);
    for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        part(sphere(0.032, 8, 6), pm, g, { p: [Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0], s: [1, 1, 0.45], outline: false });
    }
    part(sphere(0.022, 8, 6), toon('#ffd34d'), g, { p: [0, 0, 0.012], outline: false });
    parent.add(g);
    return g;
}

function makeStrawHat(brim, ribbon) {
    const g = new THREE.Group();
    const straw = toon('#efd28d');
    part(new THREE.CylinderGeometry(brim, brim, 0.018, 32), straw, g);
    part(new THREE.CylinderGeometry(0.2, 0.235, 0.15, 24), straw, g, { p: [0, 0.08, 0] });
    part(new THREE.CylinderGeometry(0.238, 0.238, 0.045, 24, 1, true), toon(ribbon), g, { p: [0, 0.03, 0], outline: false });
    return g;
}

function makeScarf(neckY, color) {
    const g = new THREE.Group();
    const mat = toon(color);
    part(new THREE.TorusGeometry(0.135, 0.052, 10, 24), mat, g, { p: [0, neckY, 0], r: [Math.PI / 2, 0, 0] });
    part(new THREE.BoxGeometry(0.075, 0.2, 0.035), mat, g, { p: [0.07, neckY - 0.11, 0.13], r: [0.15, 0, 0.18] });
    g.userData.mat = mat;
    return g;
}

function makePerson(cfg) {
    const girl = cfg.girl;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const pal = {};
    for (const k of ['top', 'upper', 'sleeve', 'legs', 'shoes']) pal[k] = cfg.palette[k].map((h) => new THREE.Color(h));
    const mats = {
        top: toon(cfg.palette.top[0]),
        upper: toon(cfg.palette.upper[0]),
        sleeve: toon(cfg.palette.sleeve[0]),
        legs: toon(cfg.palette.legs[0]),
        shoes: toon(cfg.palette.shoes[0]),
        skin: toon(SKIN),
        hair: toon(cfg.hair)
    };

    // 腿
    const hipY = girl ? 0.36 : 0.42;
    const legLen = girl ? 0.2 : 0.25, legR = girl ? 0.052 : 0.06;
    const legs = [], shoes = [];
    for (const s of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set((girl ? 0.075 : 0.085) * s, hipY, 0);
        body.add(pivot);
        part(capsule(legR, legLen), mats.legs, pivot, { p: [0, 0.02 - legLen / 2 - legR, 0] });
        shoes.push(part(sphere(girl ? 0.062 : 0.068, 12, 10), mats.shoes, pivot, { p: [0, -hipY + 0.04, 0.03], s: [1, 0.68, 1.5] }));
        legs.push(pivot);
    }

    // 身体
    if (girl) {
        part(new THREE.CylinderGeometry(0.12, 0.28, 0.44, 22), mats.top, body, { p: [0, 0.53, 0] });
        part(sphere(0.125, 18, 12), mats.top, body, { p: [0, 0.74, 0], s: [1.05, 0.62, 0.85] });
        part(new THREE.CylinderGeometry(0.143, 0.143, 0.026, 22, 1, true), toon('#ffffff'), body, { p: [0, 0.67, 0], outline: false });
    } else {
        part(new THREE.CylinderGeometry(0.155, 0.17, 0.38, 20), mats.top, body, { p: [0, 0.61, 0] });
        part(new THREE.CylinderGeometry(0.172, 0.165, 0.09, 20), mats.legs, body, { p: [0, 0.43, 0] });
        part(sphere(0.16, 18, 12), mats.top, body, { p: [0, 0.8, 0], s: [1.05, 0.55, 0.82] });
    }
    const neckY = girl ? 0.79 : 0.85;
    part(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 8), mats.skin, body, { p: [0, neckY, 0], outline: false });

    // 手臂
    const shoulderX = girl ? 0.155 : 0.19, shoulderY = girl ? 0.72 : 0.79;
    const ar = girl ? [0.043, 0.04, 0.048] : [0.05, 0.046, 0.054];
    const al = girl ? 0.1 : 0.12;
    const arms = [];
    for (const s of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(shoulderX * s, shoulderY, 0);
        body.add(pivot);
        part(capsule(ar[0], al), mats.upper, pivot, { p: [0, -(al / 2 + ar[0]) + 0.02, 0] });
        part(capsule(ar[1], al), mats.sleeve, pivot, { p: [0, -(al * 1.5 + ar[0] * 2) + 0.04, 0] });
        part(sphere(ar[2], 10, 8), mats.skin, pivot, { p: [0, -(al * 2 + ar[0] * 2) + 0.02, 0] });
        arms.push(pivot);
    }

    // 头
    const head = new THREE.Group();
    head.position.set(0, girl ? 1.0 : 1.08, 0);
    body.add(head);
    part(sphere(0.27, 28, 22), mats.skin, head, { s: [1, 0.94, 0.96] });
    const eyeMat = toon('#2b1d1a');
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const blushMat = new THREE.MeshBasicMaterial({ color: '#ff9fb0', transparent: true, opacity: 0.55 });
    for (const s of [-1, 1]) {
        const eye = part(sphere(0.034, 12, 10), eyeMat, head, { p: [0.095 * s, -0.01, 0.245], s: [1, 1.25, 0.6], outline: false });
        part(sphere(0.012, 6, 5), shine, eye, { p: [0.012, 0.016, 0.025], outline: false });
        part(sphere(0.045, 10, 8), blushMat, head, { p: [0.165 * s, -0.075, 0.205], s: [1, 0.6, 0.3], r: [0, 0.6 * s, 0], outline: false });
    }
    part(new THREE.TorusGeometry(0.028, 0.008, 6, 12, Math.PI), toon('#8a3b3b'), head, { p: [0, -0.085, 0.258], r: [0, 0, Math.PI], outline: false });

    // 头发
    let bangs = null;
    if (girl) {
        part(new THREE.SphereGeometry(0.293, 28, 18, 0, TAU, 0, Math.PI * 0.6), mats.hair, head, { r: [-0.45, 0, 0] });
        for (let i = 0; i < 5; i++) {
            const x = -0.16 + i * 0.08;
            part(sphere(0.075, 12, 8), mats.hair, head, { p: [x, 0.15 - Math.abs(x) * 0.3, 0.228 - Math.abs(x) * 0.32], s: [1, 0.62, 0.55], outline: false });
        }
        part(capsule(0.19, 0.3), mats.hair, head, { p: [0, -0.2, -0.1], s: [1.2, 1, 0.62] });
        for (const s of [-1, 1]) part(capsule(0.055, 0.24), mats.hair, head, { p: [0.235 * s, -0.15, 0.03], r: [0, 0, 0.1 * s] });
    } else {
        part(new THREE.SphereGeometry(0.29, 28, 18, 0, TAU, 0, Math.PI * 0.5), mats.hair, head, { r: [-0.55, 0, 0] });
        bangs = new THREE.Group();
        head.add(bangs);
        for (let i = 0; i < 4; i++) {
            const x = -0.15 + i * 0.09;
            part(sphere(0.075, 12, 8), mats.hair, bangs, { p: [x, 0.19 - Math.abs(x + 0.03) * 0.25, 0.185 - Math.abs(x) * 0.2], s: [1.1, 0.5, 0.6], r: [0.3, 0, -0.35], outline: false });
        }
        part(new THREE.ConeGeometry(0.035, 0.09, 8), mats.hair, bangs, { p: [0.04, 0.29, 0.0], r: [-0.5, 0, -0.5] });
        part(sphere(0.2, 16, 12), mats.hair, head, { p: [0, -0.12, -0.12], s: [1.1, 0.7, 0.8] });
    }

    // 季节配饰
    const acc = [];
    if (bangs) acc.push(accessory(bangs, [0, 1, 2]));
    if (girl) {
        const clip = new THREE.Group();
        makeFlower(clip, [0, 0, 0], '#ff9fbf');
        clip.position.set(0.2, 0.17, 0.14);
        clip.rotation.set(-0.3, 0.6, 0);
        head.add(clip);
        acc.push(accessory(clip, [0]));
    }
    const hat = makeStrawHat(girl ? 0.43 : 0.36, girl ? '#e97b8f' : '#3c5a8a');
    hat.position.set(0, 0.2, -0.02);
    hat.rotation.x = -0.12;
    head.add(hat);
    acc.push(accessory(hat, [1]));

    const scarf = makeScarf(neckY - 0.01, girl ? '#e0a83a' : '#8a5a3c');
    body.add(scarf);
    acc.push(accessory(scarf, [2, 3]));
    const scarfPal = [null, null, new THREE.Color(girl ? '#e0a83a' : '#8a5a3c'), new THREE.Color('#c8323c')];

    if (girl) {
        const muff = new THREE.Group();
        const fluff = toon('#ffd6e0');
        for (const s of [-1, 1]) part(sphere(0.085, 14, 10), fluff, muff, { p: [0.285 * s, 0, 0] });
        part(new THREE.TorusGeometry(0.29, 0.016, 6, 24, Math.PI), toon('#f7a8bd'), muff, {});
        head.add(muff);
        acc.push(accessory(muff, [3]));
    } else {
        const beanie = new THREE.Group();
        const knit = toon('#d8d2c4');
        part(new THREE.SphereGeometry(0.284, 24, 14, 0, TAU, 0, Math.PI * 0.4), knit, beanie);
        part(new THREE.TorusGeometry(0.262, 0.032, 8, 24), knit, beanie, { p: [0, 0.085, 0], r: [Math.PI / 2, 0, 0] });
        part(sphere(0.06, 12, 10), toon('#ffffff'), beanie, { p: [0, 0.295, 0] });
        beanie.position.set(0, 0.04, -0.02);
        beanie.rotation.x = -0.22;
        head.add(beanie);
        acc.push(accessory(beanie, [3]));
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    shadow.scale.set(0.26, 0.22, 1);
    root.add(shadow);

    const tmpC = new THREE.Color();
    const scarfC = new THREE.Color();
    let lookT = 0;
    return {
        root, body, head, legs, arms, shoes, hipY, girl,
        headY: head.position.y,
        update(dt, t, w, ph, amp, holdSide) {
            for (const k of ['top', 'upper', 'sleeve', 'legs', 'shoes']) mats[k].color.copy(blendColor(tmpC, pal[k], w));
            const ws = w[2] + w[3];
            if (ws > 0.001) {
                scarfC.copy(scarfPal[2]).multiplyScalar(w[2] / ws).add(tmpC.copy(scarfPal[3]).multiplyScalar(w[3] / ws));
                scarf.userData.mat.color.copy(scarfC);
            }
            for (const a of acc) updateAccessory(a, w, dt);

            const sw = Math.sin(ph);
            legs[0].rotation.x = sw * 0.55 * amp;
            legs[1].rotation.x = -sw * 0.55 * amp;
            body.position.y = Math.abs(Math.cos(ph)) * 0.03 * amp + Math.sin(t * 2) * 0.004;
            body.rotation.z = sw * 0.03 * amp;
            // 外侧手臂摆动，内侧牵手
            const outer = holdSide > 0 ? 0 : 1, inner = 1 - outer;
            arms[outer].rotation.x = (outer ? 1 : -1) * sw * 0.45 * amp;
            arms[outer].rotation.z = (outer ? 1 : -1) * 0.12;
            arms[inner].rotation.x = -0.15 + Math.sin(ph) * 0.06 * amp;
            arms[inner].rotation.z = cfg.holdZ;

            // 偶尔转头看对方
            lookT -= dt;
            if (lookT < -6 - Math.random() * 4) lookT = 2.2;
            const look = lookT > 0 ? smooth(clamp01(Math.min(lookT, 2.2 - lookT) * 3)) : 0;
            head.rotation.y = look * 0.5 * holdSide;
            head.rotation.z = -look * 0.12 * holdSide + Math.sin(t * 1.3) * 0.02;
            head.rotation.x = Math.sin(ph * 2) * 0.02 * amp;
        }
    };
}

// ---------- 猫 ----------
function makeCat(cfg) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const M = {
        main: toon(cfg.main),
        belly: toon(cfg.belly),
        paw: toon(cfg.paw),
        inner: toon(cfg.inner),
        nose: toon('#f29aa8'),
        pupil: toon('#1c130d'),
        iris: toon(cfg.iris)
    };
    const R = cfg.bodyR, L = cfg.bodyLen, hr = cfg.headR;
    const by = cfg.legLen + R;
    body.userData.baseY = 0;

    part(capsule(R, L), M.main, body, { p: [0, by, 0], r: [Math.PI / 2, 0, 0], s: [1.06, 1, 1] });
    part(capsule(R * 0.72, L * 0.85), M.belly, body, { p: [0, by - R * 0.38, 0.01], r: [Math.PI / 2, 0, 0], outline: false });
    part(sphere(R * 0.9, 14, 10), M.belly, body, { p: [0, by - R * 0.15, L / 2 + R * 0.45], s: [0.92, 0.95, 0.8], outline: false });
    if (cfg.saddle) part(sphere(R * 0.75, 14, 10), toon(cfg.saddle), body, { p: [0, by + R * 0.55, -L * 0.1], s: [1.1, 0.5, 1.6], outline: false });

    const head = new THREE.Group();
    head.position.set(0, by + R * 0.95, L / 2 + R * 0.85);
    body.add(head);
    part(sphere(hr, 22, 16), M.main, head, { s: [1.1, 0.97, 1] });
    for (const s of [-1, 1]) part(sphere(hr * 0.4, 12, 10), M.belly, head, { p: [s * hr * 0.3, -hr * 0.33, hr * 0.72], outline: false });
    part(sphere(hr * 0.3, 10, 8), M.belly, head, { p: [0, -hr * 0.52, hr * 0.6], outline: false });
    if (cfg.blaze) part(sphere(hr * 0.22, 10, 8), M.belly, head, { p: [0, hr * 0.4, hr * 0.9], s: [0.55, 1.5, 0.35], outline: false });
    part(sphere(hr * 0.13, 8, 6), M.nose, head, { p: [0, -hr * 0.12, hr * 0.98], s: [1.3, 0.8, 0.8], outline: false });
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const eyes = [];
    for (const s of [-1, 1]) {
        const eye = part(sphere(hr * 0.24, 14, 10), M.iris, head, { p: [s * hr * 0.42, hr * 0.12, hr * 0.84], s: [1, 1.08, 0.55], outline: false });
        part(sphere(hr * 0.15, 10, 8), M.pupil, eye, { p: [0, 0, hr * 0.13], s: [0.8, 1.15, 0.6], outline: false });
        part(sphere(hr * 0.06, 6, 5), shine, eye, { p: [hr * 0.07, hr * 0.08, hr * 0.2], outline: false });
        eyes.push(eye);
        const ear = part(new THREE.ConeGeometry(hr * 0.42, hr * 0.7, 12), M.main, head, {
            p: [s * hr * 0.58, hr * 0.72, -hr * 0.05], r: [-0.1, 0, -s * 0.42], s: [cfg.earScale, cfg.earScale, cfg.earScale * 0.6]
        });
        part(new THREE.ConeGeometry(hr * 0.27, hr * 0.48, 10), M.inner, ear, { p: [0, -hr * 0.05, hr * 0.12], outline: false });
    }
    const wpts = [];
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        wpts.push(s * hr * 0.45, -hr * 0.25, hr * 0.9, s * hr * 1.35, -hr * (0.12 + 0.13 * k), hr * 0.8);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wpts, 3));
    const whiskers = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: cfg.whisker, transparent: true, opacity: 0.8 }));
    whiskers.raycast = () => {};
    head.add(whiskers);

    const legs = [];
    const lx = R * 0.55, lz = L / 2 + R * 0.15;
    const legH = cfg.legLen + 0.04;
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const pv = new THREE.Group();
        pv.position.set(sx * lx, cfg.legLen + 0.02, sz * lz);
        body.add(pv);
        part(new THREE.CylinderGeometry(0.034, 0.03, legH, 8), M.main, pv, { p: [0, -legH / 2, 0] });
        part(sphere(0.038, 10, 8), M.paw, pv, { p: [0, -cfg.legLen - 0.005, 0.012], s: [1, 0.7, 1.25] });
        legs.push(pv);
    }

    const tail = [];
    const tailBase = new THREE.Group();
    tailBase.position.set(0, by + R * 0.3, -L / 2 - R * 0.8);
    body.add(tailBase);
    let parent = tailBase;
    for (let i = 0; i < 5; i++) {
        const seg = new THREE.Group();
        if (i > 0) seg.position.y = 0.062;
        parent.add(seg);
        part(capsule(0.027 - i * 0.002, 0.045), i === 4 && cfg.tailTip ? toon(cfg.tailTip) : M.main, seg, { p: [0, 0.031, 0] });
        tail.push(seg);
        parent = seg;
    }

    if (cfg.bell) {
        const collar = new THREE.Group();
        collar.position.set(0, by + R * 0.6, L / 2 + R * 0.62);
        collar.rotation.x = Math.PI / 2 + 0.5;
        body.add(collar);
        part(new THREE.TorusGeometry(hr * 0.66, 0.013, 8, 22), toon('#d94a5a'), collar, { outline: false });
        const bell = new THREE.Mesh(sphere(0.024, 12, 10), new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.7, roughness: 0.3, emissive: '#5a3a00' }));
        bell.position.set(0, hr * 0.7, -0.01);
        collar.add(bell);
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    shadow.scale.set(0.15, 0.24, 1);
    root.add(shadow);

    return {
        root, body, head, legs, tail, eyes, shadow, by,
        walk(ph, amp, t, waddle) {
            const sw = Math.sin(ph);
            legs[0].rotation.x = sw * 0.7 * amp;
            legs[3].rotation.x = sw * 0.7 * amp;
            legs[1].rotation.x = -sw * 0.7 * amp;
            legs[2].rotation.x = -sw * 0.7 * amp;
            body.rotation.z = sw * waddle * amp;
            head.rotation.z = -sw * waddle * 0.6 * amp;
        },
        wagTail(t, k) {
            tail.forEach((seg, i) => {
                seg.rotation.x = (i === 0 ? -0.9 : 0.26) + Math.sin(t * 2.2 - i * 0.6) * 0.14 * k;
                seg.rotation.z = Math.sin(t * 1.7 - i * 0.55) * 0.28 * k;
            });
        }
    };
}

// ---------- 小道具：爱心、呼气、蝴蝶、萤火 ----------
function heartGeometry() {
    const s = new THREE.Shape();
    s.moveTo(25, 25);
    s.bezierCurveTo(25, 25, 20, 0, 0, 0);
    s.bezierCurveTo(-30, 0, -30, 35, -30, 35);
    s.bezierCurveTo(-30, 55, -10, 77, 25, 95);
    s.bezierCurveTo(60, 77, 80, 55, 80, 35);
    s.bezierCurveTo(80, 35, 80, 0, 50, 0);
    s.bezierCurveTo(35, 0, 25, 25, 25, 25);
    const g = new THREE.ShapeGeometry(s, 12);
    g.center();
    g.scale(0.0028, -0.0028, 1);
    return g;
}

function makeMiniButterfly() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.03, 0.07, 0.12, 0.08, 0.11, 0.015);
    shape.bezierCurveTo(0.12, -0.04, 0.06, -0.07, 0, 0);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: '#bfe3ff', emissive: '#4a6a88', side: THREE.DoubleSide });
    const g = new THREE.Group();
    const wr = new THREE.Mesh(geo, mat), wl = new THREE.Mesh(geo, mat);
    wl.scale.x = -1;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.05, 3, 6), new THREE.MeshLambertMaterial({ color: '#3a2a2a' }));
    body.rotation.x = Math.PI / 2;
    g.add(wr, wl, body);
    g.userData = { wr, wl };
    return g;
}

// ---------- 队伍 ----------
export function createParty() {
    const group = new THREE.Group();
    const yawGroup = new THREE.Group();
    yawGroup.scale.setScalar(1.45);
    group.add(yawGroup);

    const girl = makePerson({
        girl: true,
        hair: '#3d2a22',
        holdZ: 0.46,
        palette: {
            top: ['#f6b9c7', '#fffaf1', '#a8434b', '#f2ebe1'],
            upper: ['#fbd6df', SKIN, '#a8434b', '#efe7dc'],
            sleeve: ['#fbd6df', SKIN, '#a8434b', '#efe7dc'],
            legs: [SKIN, SKIN, '#5b4040', '#e9e3db'],
            shoes: ['#ffffff', '#d6a77a', '#6b4433', '#8a5a44']
        }
    });
    girl.root.position.set(-0.29, 0, 0);
    const boy = makePerson({
        girl: false,
        hair: '#231b17',
        holdZ: -0.39,
        palette: {
            top: ['#a9c9e8', '#ffffff', '#b48a5a', '#2e3a55'],
            upper: ['#a9c9e8', '#ffffff', '#b48a5a', '#2e3a55'],
            sleeve: ['#a9c9e8', SKIN, '#b48a5a', '#2e3a55'],
            legs: ['#d9c9a8', '#6f8fb5', '#4f4337', '#3b3f4a'],
            shoes: ['#f4f4f4', '#f4f4f4', '#5a3a2a', '#3a2a22']
        }
    });
    boy.root.position.set(0.31, 0, 0);

    const mingren = makeCat({
        main: '#8e9299', belly: '#f7f5f2', paw: '#f7f5f2', inner: '#f2b3bc', iris: '#d9a23a', whisker: '#ffffff',
        saddle: '#7b8087', blaze: true, legLen: 0.055, bodyLen: 0.17, bodyR: 0.105, headR: 0.125, earScale: 0.85
    });
    const laibao = makeCat({
        main: '#efebe6', belly: '#f7f4f0', paw: '#f7f4f0', inner: '#f6b8c2', iris: '#7fb8e6', whisker: '#b9b1a8',
        bell: true, legLen: 0.11, bodyLen: 0.19, bodyR: 0.095, headR: 0.115, earScale: 1
    });
    const catHome = {
        mingren: new THREE.Vector3(0.82, 0, -0.62),
        laibao: new THREE.Vector3(-0.8, 0, -0.5)
    };
    mingren.root.position.copy(catHome.mingren);
    laibao.root.position.copy(catHome.laibao);

    yawGroup.add(girl.root, boy.root, mingren.root, laibao.root);

    girl.root.userData.pick = {
        name: '晓彤', height: 2.05,
        lines: ['春天和你看花', '夏天想吃你剥的西瓜', '秋天的麦田里牵着你', '冬天把手揣进你口袋']
    };
    boy.root.userData.pick = {
        name: '洋', height: 2.2,
        lines: ['花开了，你也来了', '晚风很好，你更好', '把日子收成金黄给你', '下雪了，一起白头吧']
    };
    mingren.root.userData.pick = {
        name: '鸣人 · 灰白拿破仑矮脚', height: 0.72,
        lines: ['腿短，但追得上蝴蝶……吧', '拍萤火虫中，请勿打扰', '麦浪太高，蹦起来才看得见', '短腿陷进雪里，蹦着走']
    };
    laibao.root.userData.pick = {
        name: '来宝 · 小白猫', height: 0.78,
        lines: ['扑蝴蝶！差一点点', '趴在野餐垫边上吹晚风', '在麦浪里跳来跳去', '和雪一样白，找不到我了吧']
    };

    // 爱心
    const heartGeo = heartGeometry();
    const hearts = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a9a').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        m.visible = false;
        group.add(m);
        return { m, age: -1, x: 0 };
    });
    let nextHeart = 4;
    function popHeart() {
        const h = hearts.find((it) => it.age < 0) || hearts[0];
        h.age = 0;
        h.x = (Math.random() - 0.5) * 0.25;
        h.m.visible = true;
    }
    girl.root.userData.pick.onPick = popHeart;
    boy.root.userData.pick.onPick = popHeart;

    // 冬天呼出的白气
    const puffMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    const puffs = [0, 1, 2, 3, 4, 5].map(() => {
        const m = new THREE.Mesh(sphere(0.032, 10, 8), puffMat());
        m.visible = false;
        yawGroup.add(m);
        return { m, age: -1, x: 0, y: 0 };
    });
    let nextPuff = 1, puffWho = 0;

    // 春天在来宝头上飞的蝴蝶，夏天在鸣人身边的萤火虫
    const fly = makeMiniButterfly();
    yawGroup.add(fly);
    const firefly = new THREE.Mesh(sphere(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe680').multiplyScalar(5) }));
    yawGroup.add(firefly);

    let yaw = 0, amp = 0, ph = 0, catPh = 0, appearS = 0;
    let lastStep = 0, lastCatStep = 0;
    const tmp = new THREE.Vector3();
    const camQ = new THREE.Quaternion();
    const parentQ = new THREE.Quaternion();
    const steps = [];

    function catBehave(cat, home, dt, t, w, which) {
        const offset = which === 'mingren' ? 0 : 1.7;
        const fol = Math.sin(t * 0.37 + offset) * 0.08;
        cat.root.position.set(home.x + fol, 0, home.z + Math.cos(t * 0.29 + offset) * 0.07);
        const munchkin = which === 'mingren';
        cat.walk(catPh * (munchkin ? 1.4 : 1) + offset, amp, t, munchkin ? 0.09 : 0.04);
        cat.wagTail(t + offset, 1 + (1 - amp) * 0.6);

        let jump = 0, pitch = 0, sink = 0;
        // 春：来宝扑蝴蝶
        if (which === 'laibao' && w[0] > 0.5) {
            const p = (t % 4.6) / 4.6;
            if (p > 0.68 && p < 0.86) {
                const k = (p - 0.68) / 0.18;
                jump = Math.sin(k * Math.PI) * 0.3;
                pitch = -0.55 * Math.sin(k * Math.PI);
                cat.legs[0].rotation.x = cat.legs[1].rotation.x = -1.1 * Math.sin(k * Math.PI);
            }
        }
        // 夏：鸣人立起来拍萤火虫
        if (which === 'mingren' && w[1] > 0.5) {
            const p = (t % 3.8) / 3.8;
            if (p > 0.55 && p < 0.92) {
                const k = Math.sin(((p - 0.55) / 0.37) * Math.PI);
                pitch = -0.6 * k;
                jump = 0.04 * k;
                cat.legs[0].rotation.x = -1.5 * k + Math.sin(t * 18) * 0.35 * k;
                cat.legs[1].rotation.x = -0.6 * k;
            }
        }
        // 秋：在麦浪里一蹦一蹦
        if (w[2] > 0.5) {
            const period = munchkin ? 2.1 : 2.6;
            const p = ((t + offset) % period) / period;
            if (p < 0.3) {
                const k = Math.sin((p / 0.3) * Math.PI);
                jump = Math.max(jump, k * (munchkin ? 0.26 : 0.32));
                pitch = -0.25 * Math.cos((p / 0.3) * Math.PI);
            }
        }
        // 冬：鸣人短腿陷进雪里蹦着走；来宝偶尔抖一抖雪
        if (w[3] > 0.5) {
            if (munchkin) {
                jump = Math.max(jump, Math.abs(Math.sin(catPh * 1.4)) * 0.07 * Math.max(amp, 0.35));
                sink = 0.035;
            } else {
                const p = (t % 5.5) / 5.5;
                if (p > 0.8 && p < 0.9) cat.head.rotation.z = Math.sin(t * 40) * 0.35;
            }
        }
        // 停下来的时候坐着
        const sit = (1 - amp) * (jump > 0 ? 0 : 1);
        cat.body.position.y = jump - sink - sit * 0.01;
        cat.body.rotation.x = pitch - sit * 0.22;
        cat.shadow.scale.set(0.15 * (1 - jump), 0.24 * (1 - jump), 1);
        return jump;
    }

    return {
        group,
        update(dt, t, info) {
            const { weights: w, surfaceSpeed, groundY, appear, camera } = info;
            steps.length = 0;

            appearS += (appear - appearS) * Math.min(1, dt * 4);
            group.visible = appearS > 0.01;
            group.scale.setScalar(Math.max(0.0001, easeOutBack(clamp01(appearS))));
            group.position.y += (groundY - group.position.y) * Math.min(1, dt * 6);

            // 面朝走的方向（稍微侧向镜头），停下来就面向镜头
            const v = surfaceSpeed;
            const moving = Math.abs(v) > 0.06;
            const targetYaw = moving ? (v > 0 ? -0.95 : 0.95) : 0;
            yaw += (targetYaw - yaw) * Math.min(1, dt * 2.6);
            yawGroup.rotation.y = yaw;
            const targetAmp = moving ? clamp01(Math.abs(v) / 0.32) : 0;
            amp += (targetAmp - amp) * Math.min(1, dt * 3);
            const rate = Math.min(16, (Math.abs(v) / 0.2) * Math.PI);
            ph += rate * dt;
            catPh += rate * 1.25 * dt;

            girl.update(dt, t, w, ph, amp, 1);
            boy.update(dt, t, w, ph + 0.15, amp, -1);

            const jL = catBehave(laibao, catHome.laibao, dt, t, w, 'laibao');
            catBehave(mingren, catHome.mingren, dt, t, w, 'mingren');

            // 脚印
            if (w[3] > 0.4 && amp > 0.3) {
                const stepNo = Math.floor(ph / Math.PI);
                if (stepNo !== lastStep) {
                    lastStep = stepNo;
                    for (const p of [girl, boy]) {
                        p.shoes[stepNo & 1].getWorldPosition(tmp);
                        steps.push({ pos: tmp.clone(), yaw, kind: 'shoe' });
                    }
                }
                const cs = Math.floor(catPh / Math.PI);
                if (cs !== lastCatStep) {
                    lastCatStep = cs;
                    for (const c of [laibao, mingren]) {
                        c.legs[cs & 1].getWorldPosition(tmp);
                        steps.push({ pos: tmp.clone(), yaw, kind: 'paw' });
                        c.legs[2 + ((cs + 1) & 1)].getWorldPosition(tmp);
                        steps.push({ pos: tmp.clone(), yaw, kind: 'paw' });
                    }
                }
            } else {
                lastStep = Math.floor(ph / Math.PI);
                lastCatStep = Math.floor(catPh / Math.PI);
            }

            // 春天的小蝴蝶
            const fw = w[0];
            fly.visible = fw > 0.05;
            if (fly.visible) {
                const lp = laibao.root.position;
                fly.position.set(lp.x + Math.sin(t * 1.3) * 0.16, 0.5 + Math.sin(t * 2.3) * 0.1 + jL * 1.4, lp.z + 0.12 + Math.cos(t * 1.1) * 0.18);
                fly.scale.setScalar(smooth(clamp01((fw - 0.05) * 2)));
                fly.rotation.y = t * 1.3;
                const flap = 0.2 + Math.abs(Math.sin(t * 16)) * 1.0;
                fly.userData.wr.rotation.z = flap;
                fly.userData.wl.rotation.z = -flap;
            }
            // 夏天的萤火
            const sw = w[1];
            firefly.visible = sw > 0.05;
            if (firefly.visible) {
                const mp = mingren.root.position;
                firefly.position.set(mp.x + Math.sin(t * 0.9) * 0.18, 0.42 + Math.sin(t * 1.7) * 0.08, mp.z + 0.24 + Math.cos(t * 1.2) * 0.1);
                const blink = Math.pow(Math.max(0, Math.sin(t * 2.3)), 3);
                firefly.scale.setScalar((0.5 + blink) * smooth(clamp01((sw - 0.05) * 2)));
            }

            // 爱心
            nextHeart -= dt;
            if (nextHeart <= 0 && appearS > 0.9) { popHeart(); nextHeart = 7 + Math.random() * 4; }
            camera.getWorldQuaternion(camQ);
            group.parent && group.parent.getWorldQuaternion(parentQ);
            for (const h of hearts) {
                if (h.age < 0) continue;
                h.age += dt;
                const k = h.age / 2.4;
                if (k >= 1) { h.age = -1; h.m.visible = false; continue; }
                h.m.position.set(h.x + Math.sin(h.age * 3) * 0.05, 2.4 + k * 0.8, 0.1);
                h.m.scale.setScalar(easeOutBack(clamp01(k * 4)) * (1 + Math.sin(h.age * 9) * 0.06));
                h.m.material.opacity = k < 0.7 ? 0.95 : 0.95 * (1 - (k - 0.7) / 0.3);
                h.m.quaternion.copy(parentQ).invert().multiply(camQ);
            }

            // 冬天的白气
            nextPuff -= dt;
            if (w[3] > 0.5 && nextPuff <= 0) {
                nextPuff = 1.3 + Math.random() * 0.6;
                const p = puffs.find((it) => it.age < 0);
                if (p) {
                    const who = puffWho++ % 2 ? boy : girl;
                    p.age = 0;
                    p.x = who.root.position.x;
                    p.side = who === boy ? 1 : -1;
                    p.y = who.headY - 0.08 + who.body.position.y;
                    p.m.visible = true;
                }
            }
            for (const p of puffs) {
                if (p.age < 0) continue;
                p.age += dt;
                const k = p.age / 1.6;
                if (k >= 1) { p.age = -1; p.m.visible = false; continue; }
                p.m.position.set(p.x + p.side * (0.2 + k * 0.32), p.y + k * 0.28, 0.3 + k * 0.1);
                p.m.scale.setScalar(1 + k * 2.6);
                p.m.material.opacity = 0.32 * (1 - k) * Math.min(1, k * 5);
            }

            return steps;
        }
    };
}

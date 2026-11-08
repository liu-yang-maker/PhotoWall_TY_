/*
 * seasons.js
 * 四季年轮：悬浮在星空里的圆盘，春夏秋冬四个扇区，一圈一圈地转。
 * 晓彤和洋牵着手走在上面，鸣人和来宝跟在后面（见 seasons-characters.js）。
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createParty } from './seasons-characters.js';

// ---------- 常量 ----------
const R = 10;                 // 圆盘半径
const WELL_R = 1.3;           // 中心小井
const PATH_R = 6.2;           // 我们走的那一圈小路
const PATH_W = 0.55;
const GROW_SPAN = 12.5;       // 开场生长覆盖的半径
const HALF_PI = Math.PI / 2;
const TAU = Math.PI * 2;
const LOVE_START = new Date('2025-11-22');

const IS_MOBILE = window.matchMedia('(max-width: 760px)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q = IS_MOBILE ? 0.42 : 1;

const SEASONS = [
    {
        char: '春', name: '春意盎然', en: 'SPRING · WHERE FLOWERS MEET YOU',
        poem: '春风十里，花开得刚刚好。<br>花开的时候，最想见你。'
    },
    {
        char: '夏', name: '蝉鸣晚风', en: 'SUMMER · FIREFLIES AND YOU',
        poem: '晚风、西瓜和萤火虫，<br>都比不上你在身边。'
    },
    {
        char: '秋', name: '麦浪金黄', en: 'AUTUMN · A FIELD OF GOLD',
        poem: '麦子一浪一浪地黄了，<br>把平凡的日子，收成我们。'
    },
    {
        char: '冬', name: '落雪白头', en: 'WINTER · SNOW ON OUR HAIR',
        poem: '落雪的时候一起走，<br>一不小心，就白了头。'
    }
];
// 各季节在圆盘本地坐标里的中心角：春在正前方，顺着旋转依次到来
const SEASON_THETA = [HALF_PI, Math.PI, Math.PI * 1.5, 0];

// ---------- 小工具 ----------
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
function smoothstep(e0, e1, x) {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
}
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function easeOutBack(x) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
const col = (hex) => new THREE.Color(hex);
const mod = (a, n) => ((a % n) + n) % n;

function hash2(ix, iy) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.3 + vnoise(x * 4.3 + 9.1, y * 4.3 + 7.7) * 0.15;

// 本地角度 → 季节坐标 [0,4)：0 春、1 夏、2 秋、3 冬
const seasonCoord = (theta) => mod((theta - HALF_PI) / HALF_PI, 4);
function seasonWeights(u, w = 0.12, out = [0, 0, 0, 0]) {
    let sum = 0;
    for (let s = 0; s < 4; s++) {
        let d = Math.abs(u - s) % 4;
        if (d > 2) d = 4 - d;
        const t = clamp01((0.5 + w - d) / (2 * w));
        out[s] = t * t * (3 - 2 * t);
        sum += out[s];
    }
    for (let s = 0; s < 4; s++) out[s] /= sum || 1;
    return out;
}
const weightsAt = (x, z, w, out) => seasonWeights(seasonCoord(Math.atan2(z, x)), w, out);
function pickSeason(w, r) {
    let acc = 0;
    for (let s = 0; s < 4; s++) { acc += w[s]; if (r <= acc) return s; }
    return 3;
}
const polar = (r, th) => ({ x: r * Math.cos(th), z: r * Math.sin(th) });

const _w = [0, 0, 0, 0];
function snowHeight(x, z) {
    const r = Math.hypot(x, z);
    if (r < WELL_R + 0.1 || r > R - 0.4) return 0;
    const w = weightsAt(x, z, 0.08, _w)[3];
    if (w <= 0) return 0;
    const edge = smoothstep(R - 0.4, R - 0.95, r) * smoothstep(WELL_R + 0.1, WELL_R + 0.7, r);
    const path = 1 - 0.6 * smoothstep(PATH_W, 0, Math.abs(r - PATH_R));
    return w * edge * path * (0.05 + 0.11 * fbm(x * 0.7, z * 0.7));
}

function loveDays() {
    return Math.max(0, Math.floor((Date.now() - LOVE_START.getTime()) / 86400000));
}

function softDotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ---------- 共享 uniform ----------
const U = {
    time: { value: 0 },
    grow: { value: 0 },
    pr: { value: 1 }
};

// 风吹 + 生长：注入到 Lambert 材质里，所有植被共用
const WIND_GLSL = /* glsl */`
attribute float aRootY;
uniform float uTime;
uniform float uGrow;
uniform float uAmp;
uniform float uUp;
vec3 windDisp(vec3 p) {
    float t = uTime;
    float w = sin(p.x * 0.42 + t * 1.3) * 0.55
            + sin(p.z * 0.57 - t * 0.9 + p.x * 0.23) * 0.3
            + sin((p.x + p.z) * 2.3 + t * 3.4) * 0.15;
    float gust = sin(p.x * 0.11 - t * 0.35 + p.z * 0.07) * 0.5 + 0.5;
    w *= 0.55 + gust * 0.9;
    return vec3(w * 0.92, 0.0, w * 0.38 + sin(p.x * 1.7 + t * 2.1) * 0.08);
}
`;
const PROJECT_GLSL = /* glsl */`
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    vec3 origin = ( instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
#else
    vec3 origin = vec3( 0.0 );
#endif
vec3 root = origin - vec3( 0.0, aRootY, 0.0 );
float growK = clamp( ( uGrow * ${GROW_SPAN.toFixed(1)} - length( root.xz ) ) / 2.2, 0.0, 1.0 );
growK = growK * growK * ( 3.0 - 2.0 * growK );
mvPosition.xyz = root + ( mvPosition.xyz - root ) * growK;
float hy = max( mvPosition.y - root.y, 0.0 );
vec3 wd = windDisp( root ) * uAmp * hy * hy;
mvPosition.xyz += wd;
mvPosition.y -= length( wd.xz ) * 0.35;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;
function swayMaterial(material, amp, up) {
    material.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = U.time;
        sh.uniforms.uGrow = U.grow;
        sh.uniforms.uAmp = { value: amp };
        sh.uniforms.uUp = { value: up };
        sh.vertexShader = WIND_GLSL + sh.vertexShader
            .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize( mix( vec3( normal ), vec3( 0.0, 1.0, 0.0 ), uUp ) );')
            .replace('#include <project_vertex>', PROJECT_GLSL);
        sh.fragmentShader = sh.fragmentShader.replace(
            '#include <normal_fragment_begin>',
            '#include <normal_fragment_begin>\n    normal = normalize( vNormal );'
        );
    };
    return material;
}

// ---------- 渲染器 ----------
const canvas = document.getElementById('scene');
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
    document.getElementById('fallback').hidden = false;
    document.getElementById('loader').classList.add('done');
    throw e;
}
const PR = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.75 : 2);
U.pr.value = PR;
renderer.setPixelRatio(PR);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#03040b');
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 700);

const rt = new THREE.WebGLRenderTarget(window.innerWidth * PR, window.innerHeight * PR, {
    type: THREE.HalfFloatType,
    samples: IS_MOBILE ? 2 : 4
});
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(PR);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.65, 0.55, 1.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight('#e4ecff', '#4a3a28', 1.7));
const sun = new THREE.DirectionalLight('#fff0d8', 2.7);
sun.position.set(-7, 14, 9);
scene.add(sun);
const backLight = new THREE.DirectionalLight('#9db8ff', 1.0);
backLight.position.set(8, 5, -12);
scene.add(backLight);

const DOT = softDotTexture();
const floatGroup = new THREE.Group();   // 整体轻轻浮动
const disc = new THREE.Group();         // 随四季旋转
scene.add(floatGroup);
floatGroup.add(disc);

const props = [];    // 开场按半径依次弹出
const zones = [];    // 树和道具占的地方，草让开
const updaters = []; // 每帧回调 (dt, t)

function addProp(obj, r, th, zoneR) {
    const p = polar(r, th);
    obj.position.x = p.x;
    obj.position.z = p.z;
    disc.add(obj);
    props.push({ obj, r, s0: obj.scale.x });
    if (zoneR) zones.push({ x: p.x, z: p.z, r: zoneR });
    return obj;
}
const faceOut = (obj, th) => { obj.rotation.y = HALF_PI - th; };
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });

// ---------- 星空 ----------
function buildSky() {
    const nebula = new THREE.Mesh(
        new THREE.SphereGeometry(320, 48, 24),
        new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: { uTime: U.time },
            defines: { OCTAVES: IS_MOBILE ? 3 : 5 },
            vertexShader: /* glsl */`
                varying vec3 vDir;
                void main() {
                    vDir = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`,
            fragmentShader: /* glsl */`
                uniform float uTime;
                varying vec3 vDir;
                float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
                float noise(vec3 x) {
                    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
                }
                float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
                void main() {
                    vec3 d = normalize(vDir);
                    vec3 col = mix(vec3(0.004, 0.006, 0.018), vec3(0.014, 0.022, 0.055), smoothstep(-0.4, 0.8, d.y));
                    float band = exp(-pow((d.y - 0.12 - 0.3 * d.x) * 2.1, 2.0));
                    float n = fbm(d * 3.0 + vec3(0.0, 0.0, uTime * 0.004));
                    float n2 = fbm(d * 7.0 + 3.0);
                    col += vec3(0.11, 0.06, 0.17) * pow(n, 3.0) * band * 1.7;
                    col += vec3(0.03, 0.08, 0.17) * pow(n2, 4.0) * band * 1.3;
                    col += vec3(0.05, 0.035, 0.02) * smoothstep(0.2, -0.6, d.y) * 0.6;
                    gl_FragColor = vec4(col, 1.0);
                }`
        })
    );
    scene.add(nebula);

    const n = Math.round(3600 * (IS_MOBILE ? 0.55 : 1));
    const rng = mulberry32(7);
    const pos = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n), color = new Float32Array(n * 3);
    const tints = [col('#ffffff'), col('#cfe0ff'), col('#ffe9c9'), col('#ffd6e4')];
    for (let i = 0; i < n; i++) {
        const u = rng() * 2 - 1, a = rng() * TAU, rr = 160 + rng() * 120;
        const s = Math.sqrt(1 - u * u);
        pos.set([Math.cos(a) * s * rr, u * rr, Math.sin(a) * s * rr], i * 3);
        const big = rng() < 0.04;
        size[i] = big ? 3.2 + rng() * 2.5 : 1.0 + rng() * 1.8;
        phase[i] = rng();
        const c = tints[Math.floor(rng() * tints.length)].clone().multiplyScalar(big ? 2.6 : 0.8 + rng() * 1.1);
        color.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    const stars = new THREE.Points(geo, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.time, uPR: U.pr },
        vertexShader: /* glsl */`
            attribute float aSize; attribute float aPhase; attribute vec3 aColor;
            uniform float uTime; uniform float uPR;
            varying vec3 vCol;
            void main() {
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mv;
                float tw = 0.6 + 0.4 * sin(uTime * (0.6 + aPhase * 1.4) + aPhase * 40.0);
                gl_PointSize = aSize * uPR * (0.8 + 0.3 * tw);
                vCol = aColor * tw;
            }`,
        fragmentShader: /* glsl */`
            varying vec3 vCol;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.0, d);
                gl_FragColor = vec4(vCol, a * a);
            }`
    }));
    stars.frustumCulled = false;
    scene.add(stars);
    updaters.push((dt) => { stars.rotation.y += dt * 0.004; });
}

// 漂浮的粒子：圆盘上的季节花粉 / 圆盘周围的星尘共用一个 shader
function sparkleMaterial({ h, y0, intensity, growFade }) {
    return new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: U.time, uPR: U.pr, uGrow: U.grow,
            uH: { value: h }, uY0: { value: y0 }, uI: { value: intensity }, uGF: { value: growFade ? 1 : 0 }
        },
        vertexShader: /* glsl */`
            uniform float uTime; uniform float uPR; uniform float uGrow; uniform float uH; uniform float uY0; uniform float uGF;
            attribute vec3 aData; attribute vec3 aColor;
            varying vec3 vColor; varying float vAlpha;
            void main() {
                float y = mod(position.y + uTime * aData.x, uH);
                vec3 p = vec3(position.x + sin(uTime * 0.5 + aData.z) * 0.35, y + uY0, position.z + cos(uTime * 0.4 + aData.z * 1.7) * 0.35);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                float tw = 0.5 + 0.5 * sin(uTime * (1.5 + aData.z * 0.3) + aData.z * 7.0);
                gl_PointSize = aData.y * uPR * (34.0 / -mv.z) * (0.7 + 0.5 * tw);
                float g = mix(1.0, clamp((uGrow * ${GROW_SPAN.toFixed(1)} - length(position.xz)) / 2.0, 0.0, 1.0), uGF);
                vAlpha = smoothstep(0.0, 0.5, y) * smoothstep(uH, uH - 1.0, y) * (0.3 + 0.7 * tw) * g;
                vColor = aColor;
            }`,
        fragmentShader: /* glsl */`
            uniform float uI;
            varying vec3 vColor; varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.0, d);
                a = a * a * vAlpha;
                if (a < 0.003) discard;
                gl_FragColor = vec4(vColor * uI, a);
            }`
    });
}

function buildAura() {
    const n = Math.round(700 * Q + 200);
    const rng = mulberry32(99);
    const pos = new Float32Array(n * 3), data = new Float32Array(n * 3), color = new Float32Array(n * 3);
    const tints = [col('#fff4dc'), col('#ffd9e4'), col('#d9e8ff')];
    for (let i = 0; i < n; i++) {
        const a = rng() * TAU, rr = R * 0.7 + Math.pow(rng(), 0.7) * 9;
        pos.set([Math.cos(a) * rr, rng() * 9, Math.sin(a) * rr], i * 3);
        data.set([0.05 + rng() * 0.12, 1.4 + rng() * 2.6, rng() * 40], i * 3);
        const c = tints[i % 3];
        color.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    const aura = new THREE.Points(geo, sparkleMaterial({ h: 9, y0: -5, intensity: 1.3, growFade: false }));
    aura.frustumCulled = false;
    floatGroup.add(aura);
    updaters.push((dt) => { aura.rotation.y -= dt * 0.02; });

    // 圆盘下方一团暖光，像浮在空中
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,214,170,0.55)');
    grd.addColorStop(0.4, 'rgba(255,170,150,0.16)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(c);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    glow.scale.set(30, 16, 1);
    glow.position.y = -3.2;
    floatGroup.add(glow);
}

// ---------- 圆盘 ----------
function groundTexture(years) {
    const S = IS_MOBILE ? 768 : 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    const d = img.data;
    const G = [
        [100, 158, 66],   // 春：嫩绿
        [52, 104, 42],    // 夏：浓绿
        [178, 138, 62],   // 秋：麦茬金
        [236, 242, 248]   // 冬：雪
    ];
    const w = [0, 0, 0, 0];
    const ringR = [];
    for (let k = 0; k < years; k++) ringR.push(R - 0.1 - (k + 0.5) * (0.26 / years));
    const flowerDots = [[255, 196, 214], [255, 255, 255], [255, 226, 122], [214, 196, 255]];

    for (let py = 0; py < S; py++) {
        for (let px = 0; px < S; px++) {
            const x = R * (2 * (px + 0.5) / S - 1);
            const z = R * (2 * (py + 0.5) / S - 1);
            const r = Math.hypot(x, z);
            const i4 = (py * S + px) * 4;
            if (r > R + 0.05) { d[i4 + 3] = 0; continue; }
            const th = Math.atan2(z, x);
            seasonWeights(seasonCoord(th), 0.09, w);
            const n = fbm(x * 1.3, z * 1.3);
            const n2 = vnoise(x * 9, z * 9);
            let cr = 0, cg = 0, cb = 0;
            for (let s = 0; s < 4; s++) {
                let m = s === 3 ? 0.9 + 0.1 * n : 0.78 + 0.42 * n;
                if (s === 2) m *= 0.85 + 0.25 * vnoise(th * 60, r * 2.5);
                cr += G[s][0] * m * w[s]; cg += G[s][1] * m * w[s]; cb += G[s][2] * m * w[s];
            }
            if (w[3] > 0) {
                const shade = (1 - n2 * 0.06) * (0.94 + 0.06 * n);
                cr = lerp(cr, cr * shade * 0.95, w[3]); cg = lerp(cg, cg * shade * 0.98, w[3]); cb = lerp(cb, cb * shade, w[3]);
            }
            if (w[0] > 0.3) {
                const hsh = hash2(px, py);
                if (hsh < 0.006 * w[0]) {
                    const fc = flowerDots[Math.floor(hsh * 1e6) % 4];
                    cr = fc[0]; cg = fc[1]; cb = fc[2];
                }
            }
            // 小路
            const pd = Math.abs(r - PATH_R) + (vnoise(th * 30, 3.1) - 0.5) * 0.22;
            const pm = smoothstep(PATH_W + 0.12, PATH_W - 0.2, pd);
            if (pm > 0) {
                const peb = hash2(px * 3 + 1, py * 7 + 2) < 0.02 ? 1.25 : 1;
                const dirt = [146 * peb * (0.9 + 0.2 * n2), 116 * peb * (0.9 + 0.2 * n2), 84 * peb * (0.9 + 0.2 * n2)];
                const snowPath = [214, 224, 236];
                const pr = lerp(dirt[0], snowPath[0], w[3]), pg = lerp(dirt[1], snowPath[1], w[3]), pb = lerp(dirt[2], snowPath[2], w[3]);
                cr = lerp(cr, pr, pm); cg = lerp(cg, pg, pm); cb = lerp(cb, pb, pm);
            }
            // 树下的影子
            for (const zn of zones) {
                const dd = Math.hypot(x - zn.x, z - zn.z);
                if (dd < zn.r * 1.9) {
                    const k = 1 - 0.32 * smoothstep(zn.r * 1.9, zn.r * 0.3, dd);
                    cr *= k; cg *= k; cb *= k;
                }
            }
            // 井边的石头地
            if (r < WELL_R + 0.45) {
                const k = smoothstep(WELL_R + 0.45, WELL_R + 0.1, r);
                cr = lerp(cr, 74 + n2 * 20, k); cg = lerp(cg, 70 + n2 * 18, k); cb = lerp(cb, 66 + n2 * 16, k);
            }
            // 外圈年轮
            const band = 0.42 + (n - 0.5) * 0.1;
            const rb = R - r;
            if (rb < band + 0.04) {
                const grain = 0.5 + 0.5 * Math.sin(r * 95 + vnoise(th * 8, r * 2) * 3.2);
                let wr = lerp(196, 148, grain * 0.6), wg = lerp(152, 102, grain * 0.6), wb = lerp(98, 60, grain * 0.6);
                for (const rr of ringR) {
                    const k = smoothstep(0.022, 0.004, Math.abs(r - rr));
                    wr = lerp(wr, 246, k); wg = lerp(wg, 212, k); wb = lerp(wb, 140, k);
                }
                if (rb < 0.05) { const k = smoothstep(0.05, 0.0, rb); wr = lerp(wr, 66, k); wg = lerp(wg, 42, k); wb = lerp(wb, 28, k); }
                const k = smoothstep(band + 0.04, band - 0.02, rb);
                cr = lerp(cr, wr, k); cg = lerp(cg, wg, k); cb = lerp(cb, wb, k);
            }
            d[i4] = Math.min(255, cr); d[i4 + 1] = Math.min(255, cg); d[i4 + 2] = Math.min(255, cb); d[i4 + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
}

function sideTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 256;
    const g = c.getContext('2d');
    const rng = mulberry32(31);
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#3a2a1b');
    grd.addColorStop(0.12, '#2b1e14');
    grd.addColorStop(0.16, '#5c3f28');
    grd.addColorStop(0.6, '#47301f');
    grd.addColorStop(1, '#1f150e');
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 700; i++) {
        const x = rng() * 1024, w = 1 + rng() * 3.5;
        g.strokeStyle = rng() < 0.5 ? `rgba(20,12,6,${0.15 + rng() * 0.3})` : `rgba(140,100,64,${0.08 + rng() * 0.18})`;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(x, 38 + rng() * 10);
        let xx = x;
        for (let y = 40; y <= 256; y += 16) { xx += (rng() - 0.5) * 4; g.lineTo(xx, y); }
        g.stroke();
    }
    for (let i = 0; i < 60; i++) {
        g.strokeStyle = `rgba(170,130,90,${0.2 + rng() * 0.3})`;
        g.lineWidth = 0.8 + rng();
        const x = rng() * 1024, y = 4 + rng() * 26;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + 10, y + 6, x - 8, y + 14, x + rng() * 20 - 10, y + 22);
        g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = 5;
    return tex;
}

function buildDisc() {
    const years = Math.max(1, Math.ceil(loveDays() / 365));

    const topGeo = new THREE.RingGeometry(WELL_R - 0.02, R, IS_MOBILE ? 160 : 240, IS_MOBILE ? 32 : 44);
    topGeo.rotateX(-HALF_PI);
    const p = topGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, snowHeight(p.getX(i), p.getZ(i)));
    topGeo.computeVertexNormals();
    const top = new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ map: groundTexture(years) }));
    disc.add(top);

    const side = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R * 0.94, 1.5, 180, 1, true),
        new THREE.MeshLambertMaterial({ map: sideTexture() })
    );
    side.position.y = -0.75;
    disc.add(side);

    const bottom = new THREE.Mesh(new THREE.CircleGeometry(R * 0.94, 72), lambert('#1d140d'));
    bottom.rotation.x = HALF_PI;
    bottom.position.y = -1.5;
    disc.add(bottom);

    // 垂下来的根须
    const rng = mulberry32(5);
    const rootMat = lambert('#3a2718');
    for (let i = 0; i < 34; i++) {
        const len = 0.5 + rng() * 1.6;
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.04 + rng() * 0.05, len, 5), rootMat);
        const pp = polar(2 + rng() * (R * 0.9 - 2.2), rng() * TAU);
        root.position.set(pp.x, -1.5 - len / 2 + 0.05, pp.z);
        root.rotation.set(Math.PI + (rng() - 0.5) * 0.4, 0, (rng() - 0.5) * 0.4);
        disc.add(root);
    }

    // 边沿的小灯
    const lampCount = IS_MOBILE ? 84 : 120;
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), lampCount);
    const m = new THREE.Matrix4();
    const lampPhase = [];
    for (let i = 0; i < lampCount; i++) {
        const th = (i / lampCount) * TAU;
        const pp = polar(R - 0.2, th);
        m.makeTranslation(pp.x, 0.05, pp.z);
        lamps.setMatrixAt(i, m);
        lamps.setColorAt(i, new THREE.Color(1, 1, 1));
        lampPhase.push({ th, ph: rng() * TAU, sp: 1.2 + rng() * 2 });
    }
    disc.add(lamps);
    const lampWarm = col('#ffd9a0');
    const lampTmp = new THREE.Color();
    updaters.push((dt, t) => {
        const sweepAge = t - state.sweepAt;
        const sweepTh = sweepAge * 3.2;
        for (let i = 0; i < lampCount; i++) {
            const L = lampPhase[i];
            let k = 2.2 + 0.9 * Math.sin(t * L.sp + L.ph);
            if (sweepAge < 2.4) {
                const dd = Math.abs(mod(L.th - (SEASON_THETA[0] + state.rot) - sweepTh + Math.PI, TAU) - Math.PI);
                k += 5 * Math.exp(-dd * dd * 30) * (1 - sweepAge / 2.4);
            }
            lamps.setColorAt(i, lampTmp.copy(lampWarm).multiplyScalar(k * U.grow.value));
        }
        lamps.instanceColor.needsUpdate = true;
    });

    buildWell();
    buildReed();
}

function buildWell() {
    const n = 26;
    const rng = mulberry32(12);
    const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.17, 0), new THREE.MeshLambertMaterial(), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU + rng() * 0.05;
        const pp = polar(WELL_R + 0.03, th);
        e.set(rng() * 3, rng() * 3, rng() * 3);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(pp.x, 0.04, pp.z), q, new THREE.Vector3(1.25, 0.75, 1.05).multiplyScalar(0.85 + rng() * 0.3));
        stones.setMatrixAt(i, m);
        stones.setColorAt(i, col('#7a756e').offsetHSL(0, 0, (rng() - 0.5) * 0.12));
    }
    disc.add(stones);

    const wall = new THREE.Mesh(new THREE.CylinderGeometry(WELL_R - 0.02, WELL_R - 0.12, 0.4, 48, 1, true), lambert('#1a1714', { side: THREE.BackSide }));
    wall.position.y = -0.2;
    disc.add(wall);

    const water = new THREE.Mesh(
        new THREE.CircleGeometry(WELL_R - 0.08, 64),
        new THREE.ShaderMaterial({
            uniforms: { uTime: U.time },
            vertexShader: /* glsl */`
                varying vec2 vUv;
                void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: /* glsl */`
                uniform float uTime;
                varying vec2 vUv;
                float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
                void main() {
                    vec2 p = vUv - 0.5;
                    float r = length(p) * 2.0;
                    vec3 col = mix(vec3(0.02, 0.05, 0.13), vec3(0.003, 0.006, 0.02), smoothstep(0.0, 1.0, r));
                    vec2 g = vUv * 30.0;
                    vec2 id = floor(g);
                    vec2 f = fract(g) - 0.5;
                    float h = h21(id);
                    if (h > 0.78) {
                        vec2 o = vec2(h21(id + 1.3), h21(id + 7.1)) - 0.5;
                        float d = length(f - o * 0.6);
                        float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
                        col += vec3(0.85, 0.92, 1.0) * smoothstep(0.1, 0.0, d) * tw * 3.2;
                    }
                    col += vec3(0.09, 0.06, 0.2) * smoothstep(0.35, 0.0, abs(p.x * 0.8 + p.y * 0.6 - 0.05)) * 0.7;
                    col += vec3(0.25, 0.3, 0.45) * smoothstep(0.75, 1.0, r) * 0.35;
                    float rip = sin(r * 28.0 - uTime * 1.6) * 0.5 + 0.5;
                    col += vec3(0.05, 0.07, 0.12) * rip * smoothstep(1.0, 0.3, r) * 0.3;
                    gl_FragColor = vec4(col, 1.0);
                }`
        })
    );
    water.rotation.x = -HALF_PI;
    water.position.y = -0.16;
    disc.add(water);
}

function buildReed() {
    const reed = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.04, 0.9, 0.02),
        new THREE.Vector3(-0.08, 1.8, 0.05),
        new THREE.Vector3(-0.4, 2.55, 0.1),
        new THREE.Vector3(-0.82, 2.95, 0.12)
    ]);
    const straw = lambert('#c4ad6c');
    reed.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.022, 6), straw));
    const tip = curve.getPoint(1), tan = curve.getTangent(1);
    const spike = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), lambert('#e2cd8f'));
    spike.scale.set(0.085, 0.3, 0.085);
    spike.position.copy(tip).addScaledVector(tan, 0.24);
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    reed.add(spike);
    // 毛茸茸的穗
    const rng = mulberry32(3);
    const fuzz = [];
    for (let i = 0; i < 160; i++) {
        const a = rng() * TAU, y = (rng() * 2 - 1) * 0.32, rr = 0.09 + rng() * 0.06;
        const v = new THREE.Vector3(Math.cos(a) * rr * (1 - Math.abs(y) * 1.6), y, Math.sin(a) * rr * (1 - Math.abs(y) * 1.6));
        v.applyQuaternion(spike.quaternion).add(spike.position);
        fuzz.push(v.x, v.y, v.z);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fuzz, 3));
    reed.add(new THREE.Points(fg, new THREE.PointsMaterial({
        color: '#ffe7a6', size: 0.06, map: DOT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    })));
    // 两片叶子
    for (const s of [1, -1]) {
        const leafCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.18 * s, 0.4, 0.05), new THREE.Vector3(0.42 * s, 0.62, 0.1)
        ]);
        reed.add(new THREE.Mesh(new THREE.TubeGeometry(leafCurve, 12, 0.018, 4), straw));
    }
    const pp = polar(WELL_R + 0.42, -0.6);
    reed.position.set(pp.x, 0, pp.z);
    reed.rotation.y = 0.9;
    disc.add(reed);
    props.push({ obj: reed, r: WELL_R + 0.42, s0: 1 });
    updaters.push((dt, t) => {
        reed.rotation.z = Math.sin(t * 0.8) * 0.05 + Math.sin(t * 1.9) * 0.015;
        reed.rotation.x = Math.sin(t * 0.6 + 1) * 0.03;
    });
}

// ---------- 树 ----------
function makeTree({ trunkH = 1.5, trunkR = 0.13, colors, canopyR = 0.95, puffs = 10, seed = 1, sparkle }) {
    const rng = mulberry32(seed);
    const g = new THREE.Group();
    const bark = lambert('#6b4a33');
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.55, trunkR, trunkH, 9), bark);
    trunk.position.y = trunkH / 2;
    g.add(trunk);
    for (const s of [1, -1]) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.6, 6), bark);
        br.position.set(0.16 * s, trunkH * 0.72, 0.04 * s);
        br.rotation.z = -0.75 * s;
        g.add(br);
    }
    const canopy = new THREE.Group();
    canopy.position.y = trunkH + canopyR * 0.3;
    const mats = colors.map((c) => lambert(c));
    const balls = [];
    const puffGeo = new THREE.IcosahedronGeometry(1, 3);
    const pp = puffGeo.attributes.position;
    for (let i = 0; i < pp.count; i++) {
        const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
        const k = 1 + (vnoise(x * 3 + seed, y * 3 + z * 2) - 0.5) * 0.22;
        pp.setXYZ(i, x * k, y * k, z * k);
    }
    puffGeo.computeVertexNormals();
    for (let i = 0; i < puffs; i++) {
        const t = i / puffs;
        const r = canopyR * (0.3 + rng() * 0.22) * (1.15 - t * 0.35);
        const a = rng() * TAU, rr = Math.sqrt(rng()) * canopyR * 0.72;
        const b = new THREE.Mesh(puffGeo, mats[i % mats.length]);
        b.scale.setScalar(r);
        b.position.set(Math.cos(a) * rr, (rng() - 0.3) * canopyR * 0.75 + t * canopyR * 0.25, Math.sin(a) * rr);
        b.rotation.set(rng() * 3, rng() * 3, 0);
        canopy.add(b);
        balls.push({ p: b.position, r });
    }
    if (sparkle) {
        const pts = [];
        for (let i = 0; i < 260; i++) {
            const b = balls[Math.floor(rng() * balls.length)];
            const u = rng() * 2 - 1, a = rng() * TAU, s = Math.sqrt(1 - u * u);
            pts.push(b.p.x + Math.cos(a) * s * b.r * 1.02, b.p.y + u * b.r * 1.02, b.p.z + Math.sin(a) * s * b.r * 1.02);
        }
        const pg = new THREE.BufferGeometry();
        pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        canopy.add(new THREE.Points(pg, new THREE.PointsMaterial({
            color: sparkle, size: 0.09, map: DOT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        })));
    }
    g.add(canopy);
    g.userData.canopy = canopy;
    updaters.push((dt, t) => {
        canopy.rotation.z = Math.sin(t * 0.9 + seed) * 0.025;
        canopy.rotation.x = Math.sin(t * 0.7 + seed * 2) * 0.02;
    });
    return g;
}

function makePine(h, seed) {
    const rng = mulberry32(seed);
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.4, 7), lambert('#5a3d2a'));
    trunk.position.y = 0.2;
    g.add(trunk);
    const green = lambert('#2f5f4a'), snow = lambert('#f4f8fb');
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
        const r = (0.62 - i * 0.15) * h, th = (0.62 - i * 0.08) * h;
        const y = 0.3 + i * 0.36 * h;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, th, 10), green);
        cone.position.y = y + th / 2;
        cone.rotation.y = rng() * 3;
        g.add(cone);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.8, th * 0.5, 10), snow);
        cap.position.y = y + th * 0.78;
        cap.rotation.y = rng() * 3;
        g.add(cap);
    }
    return g;
}

// ---------- 四季道具 ----------
function buildSpringProps() {
    const th = SEASON_THETA[0];
    const tree = makeTree({ colors: ['#f7c1cf', '#f4a9bd', '#fbd5de', '#f9b6c9'], canopyR: 1.05, puffs: 20, seed: 11, sparkle: '#ffe3ec' });
    addProp(tree, 3.4, th + 0.28, 0.55);
    state.cherry = tree.position.clone().setY(2.1);

    // 一小片郁金香
    const tulipColors = ['#ff7d9c', '#ffd25e', '#ffffff', '#f56a7e'];
    const stemMat = lambert('#4f9a3c');
    const rng = mulberry32(21);
    for (let i = 0; i < 9; i++) {
        const tg = new THREE.Group();
        const h = 0.32 + rng() * 0.14;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, h, 5), stemMat);
        stem.position.y = h / 2;
        tg.add(stem);
        const cup = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8, 0, TAU, 0, Math.PI * 0.62), lambert(tulipColors[i % 4], { side: THREE.DoubleSide }));
        cup.rotation.x = Math.PI;
        cup.scale.set(1, 1.35, 1);
        cup.position.y = h + 0.06;
        tg.add(cup);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), stemMat);
        leaf.scale.set(0.025, 0.14, 0.05);
        leaf.position.set(0.03, 0.1, 0);
        leaf.rotation.z = -0.4;
        tg.add(leaf);
        addProp(tg, 8.5 + rng() * 0.7, th - 0.38 + rng() * 0.24);
    }

    // 蝴蝶
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.04, 0.1, 0.17, 0.12, 0.16, 0.02);
    wingShape.bezierCurveTo(0.17, -0.06, 0.08, -0.1, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateX(-HALF_PI);
    const flyColors = ['#ffb3c7', '#fff3d6', '#ffe066'];
    const flies = flyColors.map((c, k) => {
        const g = new THREE.Group();
        const mat = lambert(c, { side: THREE.DoubleSide, emissive: col(c).multiplyScalar(0.35) });
        const wr = new THREE.Mesh(wingGeo, mat), wl = new THREE.Mesh(wingGeo, mat);
        wl.scale.x = -1;
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 3, 6), lambert('#3a2a2a'));
        body.rotation.x = HALF_PI;
        g.add(wr, wl, body);
        g.scale.setScalar(1.3);
        disc.add(g);
        return { g, wr, wl, k };
    });
    const prev = new THREE.Vector3();
    updaters.push((dt, t) => {
        const vis = U.grow.value > 0.6;
        for (const f of flies) {
            f.g.visible = vis;
            const a = th + 0.32 * Math.sin(t * 0.21 + f.k * 2.1) + (f.k - 1) * 0.18;
            const rr = 5.2 + 2.6 * Math.sin(t * 0.17 + f.k * 1.7);
            prev.copy(f.g.position);
            f.g.position.set(rr * Math.cos(a), 0.85 + 0.35 * Math.sin(t * 0.9 + f.k) + 0.1 * Math.sin(t * 5 + f.k), rr * Math.sin(a));
            const dx = f.g.position.x - prev.x, dz = f.g.position.z - prev.z;
            if (dx * dx + dz * dz > 1e-8) f.g.rotation.y = Math.atan2(dx, dz);
            const flap = 0.15 + Math.abs(Math.sin(t * 15 + f.k * 3)) * 1.0;
            f.wr.rotation.z = flap;
            f.wl.rotation.z = -flap;
        }
    });
}

function buildSummerProps() {
    const th = SEASON_THETA[1];
    const tree = makeTree({ colors: ['#4f9a43', '#3d8237', '#66ad4f', '#5aa246'], canopyR: 1.15, puffs: 22, seed: 23, trunkH: 1.6, sparkle: '#d9ffb0' });
    // 树下的秋千
    const swingPivot = new THREE.Group();
    swingPivot.position.set(0.62, 1.42, 0);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 6), lambert('#6b4a33'));
    branch.rotation.z = HALF_PI;
    branch.position.set(0.3, 1.45, 0);
    tree.add(branch);
    const swing = new THREE.Group();
    const rope = lambert('#e8dcc0');
    for (const s of [-1, 1]) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.05, 4), rope);
        r.position.set(s * 0.16, -0.525, 0);
        swing.add(r);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.16), lambert('#a8744a'));
    seat.position.y = -1.05;
    swing.add(seat);
    swingPivot.add(swing);
    tree.add(swingPivot);
    updaters.push((dt, t) => { swing.rotation.x = Math.sin(t * 1.3) * 0.32; });
    addProp(tree, 3.5, th - 0.22, 0.6);

    // 向日葵
    const rng = mulberry32(41);
    const petalGeo = new THREE.SphereGeometry(1, 6, 4);
    const petalMat = lambert('#ffc928'), stemMat = lambert('#4a8a34');
    for (let i = 0; i < 6; i++) {
        const sf = new THREE.Group();
        const h = 1.0 + rng() * 0.4;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, h, 6), stemMat);
        stem.position.y = h / 2;
        sf.add(stem);
        for (const s of [1, -1]) {
            const leaf = new THREE.Mesh(petalGeo, stemMat);
            leaf.scale.set(0.13, 0.012, 0.065);
            leaf.position.set(0.1 * s, h * (0.35 + rng() * 0.2), 0);
            leaf.rotation.z = 0.35 * s;
            sf.add(leaf);
        }
        const head = new THREE.Group();
        head.position.y = h;
        const center = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.045, 18), lambert('#5b3a1e'));
        center.rotation.x = HALF_PI;
        head.add(center);
        for (let k = 0; k < 14; k++) {
            const a = (k / 14) * TAU;
            const pe = new THREE.Mesh(petalGeo, petalMat);
            pe.scale.set(0.034, 0.085, 0.012);
            pe.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, -0.005);
            pe.rotation.z = a - HALF_PI;
            head.add(pe);
        }
        head.rotation.x = -0.35;
        sf.add(head);
        faceOut(sf, th + 0.18 + i * 0.07);
        addProp(sf, 8.7 + rng() * 0.5, th + 0.18 + i * 0.07);
        const ph = rng() * TAU;
        updaters.push((dt, t) => { head.rotation.z = Math.sin(t * 0.8 + ph) * 0.06; });
    }

    // 野餐垫和西瓜
    const pic = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#fff6ea' : '#e2575a';
        g.fillRect(x * 16, y * 16, 16, 16);
    }
    const ct = new THREE.CanvasTexture(c);
    ct.colorSpace = THREE.SRGBColorSpace;
    const blanket = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), new THREE.MeshLambertMaterial({ map: ct }));
    blanket.rotation.x = -HALF_PI;
    blanket.position.y = 0.025;
    pic.add(blanket);
    const rind = lambert('#3f8f3a', { side: THREE.DoubleSide }), flesh = lambert('#ff5a5f', { side: THREE.DoubleSide });
    const seedMat = lambert('#1d1410');
    for (let i = 0; i < 3; i++) {
        const wg = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14, 1, false, -0.62, 1.24);
        wg.rotateX(HALF_PI);
        const slice = new THREE.Mesh(wg, [rind, flesh, flesh]);
        slice.position.set(-0.3 + i * 0.24, 0.23, 0.15 - i * 0.05);
        slice.rotation.y = (i - 1) * 0.35;
        for (let k = 0; k < 4; k++) {
            const sd = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), seedMat);
            sd.position.set((k - 1.5) * 0.04, -0.09 + (k % 2) * 0.03, 0.032);
            slice.add(sd);
        }
        pic.add(slice);
    }
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.18, 14), lambert('#b07a3c'));
    basket.position.set(0.38, 0.12, -0.22);
    pic.add(basket);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 16, Math.PI), lambert('#8a5a2b'));
    handle.position.set(0.38, 0.2, -0.22);
    pic.add(handle);
    faceOut(pic, th - 0.32);
    addProp(pic, 8.15, th - 0.32, 0.75);
}

function buildAutumnProps() {
    const th = SEASON_THETA[2];
    const tree = makeTree({ colors: ['#d9542f', '#e5793a', '#c43c2a', '#f0a040'], canopyR: 1.05, puffs: 20, seed: 37, sparkle: '#ffc070' });
    addProp(tree, 3.4, th + 0.22, 0.55);
    state.maple = tree.position.clone().setY(2.1);

    const hay = [lambert('#d9b45a'), lambert('#c49a3e'), lambert('#c49a3e')];
    [[8.6, th - 0.36], [8.95, th - 0.24]].forEach(([r, a], i) => {
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.62, 18), hay);
        bale.rotation.z = HALF_PI;
        bale.position.y = 0.32;
        const g = new THREE.Group();
        g.add(bale);
        g.rotation.y = i * 0.7;
        addProp(g, r, a, 0.5);
    });

    const pumpkinMat = lambert('#e8782a'), stemMat = lambert('#5d6b2e');
    [[8.5, th + 0.3, 1], [8.85, th + 0.36, 0.75], [8.3, th + 0.42, 0.6]].forEach(([r, a, s]) => {
        const g = new THREE.Group();
        for (let k = 0; k < 8; k++) {
            const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), pumpkinMat);
            lobe.scale.set(0.55, 0.78, 1);
            lobe.rotation.y = (k / 8) * Math.PI;
            lobe.position.y = 0.125;
            g.add(lobe);
        }
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.08, 5), stemMat);
        stem.position.y = 0.26;
        stem.rotation.z = 0.25;
        g.add(stem);
        g.scale.setScalar(s * 1.2);
        addProp(g, r, a, 0.3);
    });
}

function buildWinterProps() {
    const th = SEASON_THETA[3];
    [[3.1, th - 0.38, 1.25, 51], [4.2, th + 0.02, 1.5, 52], [3.4, th + 0.42, 1.1, 53]].forEach(([r, a, h, seed]) => {
        const pine = makePine(h, seed);
        const pp = polar(r, a);
        pine.position.y = snowHeight(pp.x, pp.z);
        addProp(pine, r, a, 0.45);
    });

    // 雪人
    const sm = new THREE.Group();
    const snow = lambert('#f7fafc');
    const coal = lambert('#1b1b1f');
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), snow);
    b1.position.y = 0.28;
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), snow);
    b2.position.y = 0.72;
    const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), snow);
    b3.position.y = 1.06;
    sm.add(b1, b2, b3);
    for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), coal);
        eye.position.set(0.06 * s, 1.1, 0.15);
        sm.add(eye);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.45, 5), lambert('#5a3d2a'));
        arm.position.set(0.3 * s, 0.8, 0);
        arm.rotation.z = -1.0 * s;
        sm.add(arm);
    }
    for (let k = 0; k < 3; k++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), coal);
        btn.position.set(0, 0.62 + k * 0.1, 0.225 - Math.abs(k - 1) * 0.012);
        sm.add(btn);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 8), lambert('#f08a24'));
    nose.rotation.x = HALF_PI;
    nose.position.set(0, 1.05, 0.23);
    sm.add(nose);
    const scarfMat = lambert('#c8323c');
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 20), scarfMat);
    scarf.rotation.x = HALF_PI;
    scarf.position.y = 0.91;
    sm.add(scarf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.035), scarfMat);
    tail.position.set(0.08, 0.8, 0.17);
    tail.rotation.z = 0.2;
    sm.add(tail);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 14), coal);
    hat.position.y = 1.27;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), coal);
    brim.position.y = 1.2;
    sm.add(hat, brim);
    const smP = polar(8.3, th - 0.22);
    sm.position.y = snowHeight(smP.x, smP.z);
    faceOut(sm, th - 0.22);
    addProp(sm, 8.3, th - 0.22, 0.45);

    // 路灯
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.3, 6), lambert('#2a2d36'));
    pole.position.y = 0.65;
    const box = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 6), lambert('#2a2d36'));
    box.position.y = 1.38;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: col('#ffcf87').multiplyScalar(4) }));
    bulb.position.y = 1.36;
    const capTop = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 6), lambert('#f4f8fb'));
    capTop.position.y = 1.5;
    lamp.add(pole, box, bulb, capTop);
    const light = new THREE.PointLight('#ffc987', 2.2, 4.5, 1.6);
    light.position.y = 1.3;
    lamp.add(light);
    addProp(lamp, 8.7, th + 0.3, 0.2);
    updaters.push((dt, t) => { light.intensity = 2.2 * U.grow.value * (0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1)); });
}

// ---------- 植被 ----------
function bladeGeometry(seg = 4, curve = 0.22) {
    const pos = [], colr = [], nrm = [], idx = [];
    for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const w = 0.5 * Math.pow(1 - t, 0.9);
        const z = t * t * curve;
        const c = 0.42 + 0.58 * Math.pow(t, 0.85);
        if (i < seg) {
            pos.push(-w, t, z, w, t, z);
            colr.push(c, c, c, c, c, c);
            nrm.push(0, 0.3, 1, 0, 0.3, 1);
        } else {
            pos.push(0, 1, z);
            colr.push(c, c, c);
            nrm.push(0, 0.3, 1);
        }
    }
    for (let i = 0; i < seg - 1; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const a = (seg - 1) * 2;
    idx.push(a, a + 1, a + 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setIndex(idx);
    return geo;
}

function earGeometry() {
    const pts = [[0, 0], [0.018, 0.02], [0.027, 0.06], [0.026, 0.11], [0.017, 0.15], [0.004, 0.175]].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(pts, 6);
    const p = geo.attributes.position;
    const colr = [];
    for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i));
        const bump = 1 + 0.18 * Math.sin(y * 120 + a * 3);
        p.setX(i, p.getX(i) * bump);
        p.setZ(i, p.getZ(i) * bump);
        const c = 0.75 + 0.35 * (y / 0.175);
        colr.push(c, c, c);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    geo.computeVertexNormals();
    return geo;
}

function flowerGeometries() {
    const petals = [];
    for (let k = 0; k < 5; k++) {
        const pg = new THREE.SphereGeometry(0.03, 6, 4);
        pg.scale(1, 0.28, 0.62);
        pg.translate(0.034, 0.004, 0);
        pg.rotateY((k / 5) * TAU);
        petals.push(pg);
    }
    const head = mergeGeometries(petals);
    const center = new THREE.SphereGeometry(0.019, 6, 4);
    center.scale(1, 0.6, 1);
    center.translate(0, 0.01, 0);
    return { head, center };
}

function instanced(geo, material, items) {
    const mesh = new THREE.InstancedMesh(geo, material, items.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const rootY = new Float32Array(items.length);
    items.forEach((b, i) => {
        e.set(b.tilt || 0, b.yaw, 0, 'YXZ');
        q.setFromEuler(e);
        p.set(b.x, b.y, b.z);
        s.set(b.w, b.h, b.d);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, b.c);
        rootY[i] = b.ry || 0;
    });
    geo.setAttribute('aRootY', new THREE.InstancedBufferAttribute(rootY, 1));
    mesh.frustumCulled = false;
    return mesh;
}

function buildVegetation() {
    const rng = mulberry32(20251122);
    const N = Math.round(76000 * Q);
    const grass = [], wheat = [], ears = [], flowers = [];
    const w4 = [0, 0, 0, 0];
    const pal = [
        [col('#6fb84c'), col('#b3e070')],
        [col('#2f7a2e'), col('#6cbf4d')],
        [col('#b8913f'), col('#e3c46c')],
        [col('#c9d8df'), col('#95ad96')]
    ];
    const stemC = col('#4f9a3c');
    const flowerC = ['#ffd1dc', '#ffffff', '#ffe27a', '#f7a1c4', '#d6c3ff'].map(col);
    const summerFlowerC = ['#ffffff', '#c9b8ff', '#ffe9a8'].map(col);
    const wheatC = [col('#b38d43'), col('#e2bd5c')];
    const earC = ['#e9c46a', '#f3d98a', '#d9a84a'].map(col);
    const tmpC = () => new THREE.Color();
    const rIn = WELL_R + 0.45, rOut = R - 0.42;
    const tip = new THREE.Vector3(), eul = new THREE.Euler();

    const blocked = (x, z) => zones.some((zn) => (x - zn.x) ** 2 + (z - zn.z) ** 2 < zn.r * zn.r);

    for (let i = 0; i < N; i++) {
        const r = Math.sqrt(lerp(rIn * rIn, rOut * rOut, rng()));
        const th = rng() * TAU;
        const x = r * Math.cos(th), z = r * Math.sin(th);
        if (blocked(x, z)) continue;
        seasonWeights(seasonCoord(th), 0.13, w4);
        const s = pickSeason(w4, rng());
        const pd = Math.abs(r - PATH_R);
        const onPath = pd < PATH_W ? smoothstep(PATH_W, PATH_W * 0.35, pd) : 0;
        if (onPath > 0 && rng() < onPath * 0.85) continue;
        const nearPath = lerp(0.55, 1, smoothstep(PATH_W, PATH_W + 1.4, pd));
        const hMul = (1 - onPath * 0.6) * (0.55 + 0.45 * smoothstep(rOut, rOut - 0.9, r));
        const yaw = rng() * TAU, tilt = (rng() - 0.5) * 0.35;
        const c = tmpC().copy(pal[s][0]).lerp(pal[s][1], rng()).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.08);

        if (s === 0) {
            const h = (0.22 + rng() * 0.26) * hMul * nearPath;
            grass.push({ x, y: 0, z, yaw, tilt, w: 0.05 + rng() * 0.03, h, d: h * 0.8, c });
            const patch = fbm(x * 0.45 + 3, z * 0.45 + 1) > 0.56;
            if (onPath === 0 && rng() < (patch ? 0.14 : 0.035)) {
                const fh = h + 0.05 + rng() * 0.08;
                grass.push({ x, y: 0, z, yaw: yaw + 1, tilt: tilt * 0.5, w: 0.018, h: fh, d: fh * 0.3, c: stemC.clone() });
                flowers.push({ x, z, h: fh, yaw: rng() * TAU, s: 0.85 + rng() * 0.5, c: flowerC[Math.floor(rng() * flowerC.length)] });
            }
        } else if (s === 1) {
            const h = (0.38 + rng() * 0.42) * hMul * nearPath;
            grass.push({ x, y: 0, z, yaw, tilt, w: 0.055 + rng() * 0.03, h, d: h * 0.8, c });
            if (onPath === 0 && rng() < 0.012) {
                const fh = h * 0.9;
                flowers.push({ x, z, h: fh, yaw: rng() * TAU, s: 0.7 + rng() * 0.3, c: summerFlowerC[Math.floor(rng() * 3)] });
            }
        } else if (s === 2) {
            if (pd > PATH_W + 0.2 && rng() < 0.6) {
                const h = (0.62 + rng() * 0.3) * hMul * lerp(0.45, 1, smoothstep(PATH_W + 0.2, PATH_W + 1.8, pd));
                const wc = tmpC().copy(wheatC[0]).lerp(wheatC[1], rng()).offsetHSL(0, 0, (rng() - 0.5) * 0.06);
                wheat.push({ x, y: 0, z, yaw, tilt, w: 0.028 + rng() * 0.012, h, d: h * 0.8, c: wc });
                tip.set(0, h, 0.22 * h * 0.8).applyEuler(eul.set(tilt, yaw, 0, 'YXZ'));
                const sc = 0.9 + rng() * 0.35;
                ears.push({ x: x + tip.x, y: tip.y, z: z + tip.z, yaw, tilt: tilt + 0.3 + rng() * 0.25, w: sc, h: sc, d: sc, ry: tip.y, c: earC[Math.floor(rng() * 3)] });
            } else {
                const h = (0.16 + rng() * 0.2) * hMul;
                grass.push({ x, y: 0, z, yaw, tilt, w: 0.045 + rng() * 0.02, h, d: h * 0.8, c });
            }
        } else {
            if (rng() < 0.07) {
                const h = (0.06 + rng() * 0.1) * hMul;
                grass.push({ x, y: snowHeight(x, z) - 0.02, z, yaw, tilt, w: 0.04, h, d: h * 0.8, c });
            }
        }
    }

    const grassMat = swayMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.42, 0.65);
    const wheatMat = swayMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.3, 0.55);
    const earMat = swayMaterial(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.3, 0.3);
    const flowerMat = swayMaterial(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), 0.42, 0.7);
    const flowerCenterMat = swayMaterial(new THREE.MeshLambertMaterial(), 0.42, 0.7);

    disc.add(instanced(bladeGeometry(4, 0.22), grassMat, grass));
    disc.add(instanced(bladeGeometry(5, 0.18), wheatMat, wheat));
    disc.add(instanced(earGeometry(), earMat, ears));

    const fg = flowerGeometries();
    const heads = flowers.map((f) => ({ x: f.x, y: f.h, z: f.z, yaw: f.yaw, tilt: 0.15, w: f.s, h: f.s, d: f.s, ry: f.h, c: f.c }));
    const yellow = col('#ffcf3f');
    disc.add(instanced(fg.head, flowerMat, heads));
    disc.add(instanced(fg.center, flowerCenterMat, heads.map((h) => ({ ...h, c: yellow }))));
}

// ---------- 粒子 ----------
function buildSeasonDust() {
    const n = Math.round(2400 * Q + 400);
    const rng = mulberry32(77);
    const pos = new Float32Array(n * 3), data = new Float32Array(n * 3), color = new Float32Array(n * 3);
    const tints = [
        [col('#ffe3ec'), col('#fff8d6'), col('#ffc9da')],
        [col('#e2ffb8'), col('#fff6a8'), col('#c8f7a0')],
        [col('#ffd27a'), col('#f5b25a'), col('#ffe3a3')],
        [col('#e6f3ff'), col('#ffffff'), col('#cfe6ff')]
    ];
    const w4 = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
        const r = Math.sqrt(lerp(1.6 * 1.6, (R + 0.6) ** 2, rng())), th = rng() * TAU;
        pos.set([r * Math.cos(th), rng() * 3.2, r * Math.sin(th)], i * 3);
        const s = pickSeason(seasonWeights(seasonCoord(th), 0.15, w4), rng());
        data.set([0.08 + rng() * 0.18, 1.6 + rng() * 2.4, rng() * 40], i * 3);
        const c = tints[s][Math.floor(rng() * 3)];
        color.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    const pts = new THREE.Points(geo, sparkleMaterial({ h: 3.2, y0: 0.05, intensity: 1.7, growFade: true }));
    pts.frustumCulled = false;
    disc.add(pts);
}

function buildSnow() {
    const n = Math.round(800 * Math.max(Q, 0.85) + 200);
    const rng = mulberry32(88);
    const pos = new Float32Array(n * 3), data = new Float32Array(n * 3), fade = new Float32Array(n);
    const spread = Math.PI / 4 + 0.12;
    for (let i = 0; i < n; i++) {
        const th = SEASON_THETA[3] + (rng() * 2 - 1) * spread;
        const r = Math.sqrt(lerp(2.5, (R - 0.3) ** 2, rng()));
        pos.set([r * Math.cos(th), rng() * 4.2, r * Math.sin(th)], i * 3);
        data.set([0.28 + rng() * 0.32, 1.2 + rng() * 1.9, rng() * 40], i * 3);
        fade[i] = smoothstep(spread, spread - 0.3, Math.abs(th - SEASON_THETA[3]));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));
    geo.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
    const snow = new THREE.Points(geo, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uTime: U.time, uPR: U.pr, uGrow: U.grow },
        vertexShader: /* glsl */`
            uniform float uTime; uniform float uPR; uniform float uGrow;
            attribute vec3 aData; attribute float aFade;
            varying float vA;
            void main() {
                float H = 4.2;
                float y = mod(position.y - uTime * aData.x, H);
                vec3 p = vec3(position.x + sin(uTime * 0.7 + aData.z) * 0.25, y, position.z + cos(uTime * 0.5 + aData.z * 1.3) * 0.25);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = aData.y * uPR * (40.0 / -mv.z);
                vA = aFade * smoothstep(0.0, 0.3, y) * smoothstep(H, H - 1.8, y) * smoothstep(0.55, 0.9, uGrow);
            }`,
        fragmentShader: /* glsl */`
            varying float vA;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.12, d) * vA;
                if (a < 0.01) discard;
                gl_FragColor = vec4(vec3(1.25, 1.3, 1.4), a * 0.95);
            }`
    }));
    snow.frustumCulled = false;
    disc.add(snow);

    // 雪地上的闪光
    const gn = Math.round(700 * Q + 150);
    const gpos = new Float32Array(gn * 3), gdata = new Float32Array(gn * 3);
    let k = 0;
    while (k < gn) {
        const th = SEASON_THETA[3] + (rng() * 2 - 1) * (Math.PI / 4);
        const r = Math.sqrt(lerp((WELL_R + 0.6) ** 2, (R - 0.5) ** 2, rng()));
        const x = r * Math.cos(th), z = r * Math.sin(th);
        const h = snowHeight(x, z);
        if (h <= 0.01) continue;
        gpos.set([x, h + 0.02, z], k * 3);
        gdata.set([rng() * 40, 0.8 + rng() * 2.2, 2.2 + rng() * 2.6], k * 3);
        k++;
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
    gg.setAttribute('aData', new THREE.BufferAttribute(gdata, 3));
    const glints = new THREE.Points(gg, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.time, uPR: U.pr, uGrow: U.grow },
        vertexShader: /* glsl */`
            uniform float uTime; uniform float uPR; uniform float uGrow;
            attribute vec3 aData;
            varying float vA;
            void main() {
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mv;
                float tw = pow(max(0.0, sin(uTime * aData.y + aData.x)), 14.0);
                gl_PointSize = aData.z * uPR * (30.0 / -mv.z) * (0.4 + tw);
                vA = tw * smoothstep(0.6, 0.95, uGrow);
            }`,
        fragmentShader: /* glsl */`
            varying float vA;
            void main() {
                vec2 q = gl_PointCoord - 0.5;
                float star = max(smoothstep(0.08, 0.0, abs(q.x)) * smoothstep(0.5, 0.0, abs(q.y)), smoothstep(0.08, 0.0, abs(q.y)) * smoothstep(0.5, 0.0, abs(q.x)));
                float a = (star + smoothstep(0.25, 0.0, length(q))) * vA;
                if (a < 0.01) discard;
                gl_FragColor = vec4(vec3(2.6, 2.9, 3.4), a);
            }`
    }));
    glints.frustumCulled = false;
    disc.add(glints);
}

function buildFireflies() {
    const n = Math.round(90 * Q + 30);
    const rng = mulberry32(66);
    const pos = new Float32Array(n * 3), data = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const th = SEASON_THETA[1] + (rng() * 2 - 1) * (Math.PI / 4);
        const r = 2 + rng() * 7.6;
        pos.set([r * Math.cos(th), 0.25 + rng() * 1.4, r * Math.sin(th)], i * 3);
        data.set([rng() * 40, 0.6 + rng() * 0.8, 5 + rng() * 5], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));
    const ff = new THREE.Points(geo, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.time, uPR: U.pr, uGrow: U.grow },
        vertexShader: /* glsl */`
            uniform float uTime; uniform float uPR; uniform float uGrow;
            attribute vec3 aData;
            varying float vA;
            void main() {
                vec3 p = position + vec3(
                    sin(uTime * 0.6 * aData.y + aData.x) * 0.5,
                    sin(uTime * 0.9 * aData.y + aData.x * 2.0) * 0.25,
                    cos(uTime * 0.5 * aData.y + aData.x * 3.0) * 0.5);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                float blink = pow(max(0.0, sin(uTime * (1.1 + aData.y) + aData.x * 5.0)), 4.0);
                gl_PointSize = aData.z * uPR * (40.0 / -mv.z) * (0.55 + 0.6 * blink);
                vA = (0.12 + blink) * smoothstep(0.55, 0.9, uGrow);
            }`,
        fragmentShader: /* glsl */`
            varying float vA;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.0, d);
                a = a * a * vA;
                if (a < 0.004) discard;
                gl_FragColor = vec4(vec3(1.0, 0.9, 0.42) * 3.6, a);
            }`
    }));
    ff.frustumCulled = false;
    disc.add(ff);
}

// 飘落：樱花瓣 / 枫叶
function makeFaller({ geo, colors, count, center, spread, fall, size, seed }) {
    const rng = mulberry32(seed);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), count);
    mesh.frustumCulled = false;
    const st = [];
    const spawn = (o, initial) => {
        const a = rng() * TAU, rr = Math.sqrt(rng()) * 1.0;
        o.x = center.x + Math.cos(a) * rr;
        o.z = center.z + Math.sin(a) * rr;
        o.y = initial ? 0.1 + rng() * (center.y + 0.4) : center.y - 0.3 + rng() * 0.7;
        o.vy = fall * (0.7 + rng() * 0.6);
        o.ph = rng() * TAU;
        o.spin = (rng() - 0.5) * 5;
        o.rot = rng() * TAU;
        o.rest = 0;
        o.restMax = 0;
        return o;
    };
    for (let i = 0; i < count; i++) {
        st.push(spawn({}, true));
        mesh.setColorAt(i, col(colors[Math.floor(rng() * colors.length)]));
    }
    disc.add(mesh);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    updaters.push((dt, t) => {
        const g = smoothstep(0.5, 0.85, U.grow.value);
        for (let i = 0; i < count; i++) {
            const o = st[i];
            let fadeK = 1;
            if (o.rest > 0) {
                o.rest -= dt;
                fadeK = clamp01(o.rest / 1.2);
                if (o.rest <= 0) spawn(o, false);
                e.set(-HALF_PI, o.rot, 0);
            } else {
                o.y -= o.vy * dt;
                o.x += (0.16 + Math.sin(t * 0.7 + o.ph) * 0.22) * dt;
                o.z += Math.cos(t * 0.9 + o.ph) * 0.14 * dt;
                o.rot += o.spin * dt;
                const dx = o.x - center.x, dz = o.z - center.z;
                if (dx * dx + dz * dz > spread * spread) spawn(o, false);
                const ground = 0.03;
                if (o.y <= ground) { o.y = ground; o.restMax = o.rest = 2.5 + rng() * 4; }
                e.set(Math.sin(o.rot) * 1.3, o.rot, Math.cos(o.rot * 0.7) * 0.8);
            }
            q.setFromEuler(e);
            p.set(o.x, o.y, o.z);
            s.setScalar(size * g * fadeK);
            m.compose(p, q, s);
            mesh.setMatrixAt(i, m);
        }
        mesh.instanceMatrix.needsUpdate = true;
    });
}

function buildFallers() {
    const petal = new THREE.CircleGeometry(0.045, 7);
    petal.scale(1, 0.62, 1);
    makeFaller({ geo: petal, colors: ['#ffc6d6', '#ffdbe5', '#ffb0c5', '#fff0f4'], count: Math.round(150 * Q + 40), center: state.cherry, spread: 3.2, fall: 0.32, size: 1, seed: 101 });

    const leaf = new THREE.Shape();
    for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * TAU + HALF_PI;
        const rr = i % 2 ? 0.032 : 0.075;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) leaf.moveTo(x, y); else leaf.lineTo(x, y);
    }
    makeFaller({ geo: new THREE.ShapeGeometry(leaf), colors: ['#d9542f', '#e5793a', '#c43c2a', '#f0a040', '#b8452c'], count: Math.round(120 * Q + 30), center: state.maple, spread: 3.4, fall: 0.42, size: 1, seed: 202 });
}

// ---------- 雪地脚印 ----------
function buildFootprints() {
    const max = 220;
    const geo = new THREE.CircleGeometry(1, 10);
    geo.rotateX(-HALF_PI);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#9fb2c8', transparent: true, opacity: 0.55, depthWrite: false }), max);
    mesh.frustumCulled = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const prints = [];
    for (let i = 0; i < max; i++) { mesh.setMatrixAt(i, zero); prints.push(null); }
    disc.add(mesh);
    let cursor = 0;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const LIFE = 40;
    function write(i, pr, k) {
        q.setFromAxisAngle(up, pr.yaw);
        p.set(pr.x, pr.y, pr.z);
        s.set(pr.sx * k, 1, pr.sz * k);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
    }
    state.addFootprint = (x, z, yaw, kind, t) => {
        const big = kind === 'shoe';
        const pr = { x, z, y: snowHeight(x, z) + 0.012, yaw, sx: big ? 0.05 : 0.026, sz: big ? 0.085 : 0.028, born: t };
        prints[cursor] = pr;
        write(cursor, pr, 1);
        cursor = (cursor + 1) % max;
        mesh.instanceMatrix.needsUpdate = true;
    };
    updaters.push((dt, t) => {
        let dirty = false;
        for (let i = 0; i < max; i++) {
            const pr = prints[i];
            if (!pr) continue;
            const age = t - pr.born;
            if (age > LIFE) { prints[i] = null; mesh.setMatrixAt(i, zero); dirty = true; }
            else if (age > LIFE - 6) { write(i, pr, (LIFE - age) / 6); dirty = true; }
        }
        if (dirty) mesh.instanceMatrix.needsUpdate = true;
    });
}

// ---------- 状态 ----------
const state = {
    rot: -0.55,
    vel: 0,
    auto: true,
    autoVel: REDUCED ? 0.035 : 0.075,
    dragging: false,
    snapTo: null,
    holdUntil: 0,
    sweepAt: -10,
    season: -1,
    ring: 1,
    cherry: null,
    maple: null,
    addFootprint: null,
    introStart: 0
};

// ---------- 相机 ----------
const camBase = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
function fitCamera() {
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    const portrait = aspect < 0.85;
    camera.fov = portrait ? 40 : 32;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const elev = THREE.MathUtils.degToRad(portrait ? 30 : 25);
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const dH = (R * (portrait ? 1.06 : 1.16)) / Math.tan(hHalf);
    const dV = (R * 0.8) / Math.tan(vHalf);
    const d = Math.max(dH, dV);
    camBase.set(0, Math.sin(elev) * d, Math.cos(elev) * d);
    const wide = aspect > 1.25 && w > 1080;
    camTarget.set(wide ? R * 0.16 : 0, portrait ? -3.3 : -0.7, 0);
}

// ---------- UI ----------
const ui = {
    card: document.getElementById('seasonCard'),
    scChar: document.getElementById('scChar'),
    scName: document.getElementById('scName'),
    scEn: document.getElementById('scEn'),
    scPoem: document.getElementById('scPoem'),
    scList: document.getElementById('scList'),
    nav: document.getElementById('seasonNav'),
    glider: document.getElementById('navGlider'),
    ringNo: document.getElementById('ringNo'),
    ringBox: document.getElementById('ringCount'),
    bubble: document.getElementById('bubble'),
    hint: document.getElementById('hint'),
    autoBtn: document.getElementById('autoBtn'),
    autoIco: document.getElementById('autoIco'),
    autoText: document.getElementById('autoText'),
    fsBtn: document.getElementById('fsBtn'),
    fsText: document.getElementById('fsText')
};

function seasonOfMonth(m) {
    if (m >= 3 && m <= 5) return 0;
    if (m >= 6 && m <= 8) return 1;
    if (m >= 9 && m <= 11) return 2;
    return 3;
}
const memories = [[], [], [], []];
(window.timelineData || []).forEach((it) => {
    if (!it.dateKey || it.dateKey.startsWith('3030')) return;
    memories[seasonOfMonth(parseInt(it.dateKey.slice(5, 7), 10))].push(it);
});

function renderSeasonCard(idx) {
    const S = SEASONS[idx];
    ui.scChar.textContent = S.char;
    ui.scName.textContent = S.name;
    ui.scEn.textContent = S.en;
    ui.scPoem.innerHTML = S.poem;
    ui.scList.innerHTML = '';
    const list = memories[idx];
    if (!list.length) {
        const li = document.createElement('li');
        li.className = 'sc-empty';
        li.textContent = '这一季还空着，等我们一起去填满。';
        ui.scList.appendChild(li);
        return;
    }
    list.forEach((it) => {
        const li = document.createElement('li');
        const desc = /^https?:\/\//.test(it.description || '') ? '' : (it.description || '');
        li.innerHTML = '<span class="sc-date"></span><span class="sc-title"></span><span class="sc-desc"></span>';
        li.querySelector('.sc-date').textContent = it.date;
        li.querySelector('.sc-title').textContent = it.title;
        li.querySelector('.sc-desc').textContent = desc;
        li.addEventListener('click', () => li.classList.toggle('open'));
        ui.scList.appendChild(li);
    });
}

let cardTimer = 0;
function setSeasonUI(idx) {
    if (idx === state.season) return;
    const first = state.season < 0;
    state.season = idx;
    document.body.dataset.season = String(idx);
    ui.nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', Number(b.dataset.season) === idx));
    moveGlider();
    clearTimeout(cardTimer);
    if (first) { renderSeasonCard(idx); return; }
    ui.card.classList.add('swap');
    cardTimer = setTimeout(() => {
        renderSeasonCard(idx);
        ui.card.classList.remove('swap');
    }, 450);
}
function moveGlider() {
    const btn = ui.nav.querySelector(`button[data-season="${Math.max(0, state.season)}"]`);
    if (!btn) return;
    ui.glider.style.width = btn.offsetWidth + 'px';
    ui.glider.style.transform = `translateX(${btn.offsetLeft - 5}px)`;
}

function setRing(n, t) {
    if (n === state.ring) return;
    const grew = n > state.ring;
    state.ring = n;
    ui.ringNo.textContent = n;
    if (grew) {
        state.sweepAt = t;
        ui.ringBox.classList.remove('pulse');
        void ui.ringBox.offsetWidth;
        ui.ringBox.classList.add('pulse');
    }
}

function snapToSeason(idx) {
    const cur = state.rot;
    const base = idx * HALF_PI;
    const k = Math.round((cur - base) / TAU);
    let target = base + k * TAU;
    if (target - cur > Math.PI) target -= TAU;
    if (cur - target > Math.PI) target += TAU;
    state.snapTo = target;
    fadeHint();
}

function setAuto(on) {
    state.auto = on;
    ui.autoIco.innerHTML = on ? '&#10074;&#10074;' : '&#9654;';
    ui.autoText.textContent = on ? '暂停旋转' : '继续旋转';
    if (on) state.holdUntil = 0;
}

let hintFaded = false;
function fadeHint() {
    if (hintFaded) return;
    hintFaded = true;
    setTimeout(() => ui.hint.classList.add('faded'), 2500);
}

// ---------- 交互 ----------
let party = null;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let bubble = { anchor: null, until: 0, offsetY: 0 };

function pickAt(clientX, clientY) {
    if (!party) return null;
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(party.group, true);
    for (const h of hits) {
        let o = h.object;
        while (o && !o.userData.pick) o = o.parent;
        if (o) return o;
    }
    return null;
}

function showBubble(target, t) {
    const info = target.userData.pick;
    const idx = Math.max(0, state.season);
    ui.bubble.innerHTML = `<b>${info.name}</b> · ${info.lines[idx]}`;
    ui.bubble.hidden = false;
    ui.bubble.style.animation = 'none';
    void ui.bubble.offsetWidth;
    ui.bubble.style.animation = '';
    bubble = { anchor: target, until: t + 3.2, offsetY: info.height };
    if (info.onPick) info.onPick();
}

const drag = { id: null, lastX: 0, lastT: 0, startX: 0, startY: 0, moved: 0, v: 0 };
canvas.addEventListener('pointerdown', (e) => {
    drag.id = e.pointerId;
    drag.lastX = drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.lastT = performance.now();
    drag.moved = 0;
    drag.v = 0;
    state.dragging = true;
    state.snapTo = null;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (state.dragging && e.pointerId === drag.id) {
        const now = performance.now();
        const dx = e.clientX - drag.lastX;
        const k = Math.PI / Math.max(600, window.innerWidth);
        state.rot += dx * k;
        const dtm = Math.max(1, now - drag.lastT) / 1000;
        drag.v = lerp(drag.v, (dx * k) / dtm, 0.35);
        drag.lastX = e.clientX;
        drag.lastT = now;
        drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.startY) * 0.1;
        if (drag.moved > 20) fadeHint();
    } else if (e.pointerType === 'mouse') {
        hoverCheck(e.clientX, e.clientY);
    }
});
function endDrag(e) {
    if (!state.dragging || e.pointerId !== drag.id) return;
    state.dragging = false;
    canvas.classList.remove('dragging');
    const idle = performance.now() - drag.lastT > 90;
    state.vel = idle ? 0 : THREE.MathUtils.clamp(drag.v, -3, 3);
    state.holdUntil = clock.elapsedTime + 2.5;
    if (drag.moved < 6) {
        const hit = pickAt(e.clientX, e.clientY);
        if (hit) showBubble(hit, clock.elapsedTime);
    }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.snapTo = null;
    state.vel = THREE.MathUtils.clamp(state.vel + e.deltaY * 0.0016, -2.5, 2.5);
    state.holdUntil = clock.elapsedTime + 2;
}, { passive: false });

let hoverAt = 0;
function hoverCheck(x, y) {
    const now = performance.now();
    if (now - hoverAt < 90) return;
    hoverAt = now;
    canvas.classList.toggle('over-pick', !!pickAt(x, y));
}

ui.nav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => snapToSeason(Number(b.dataset.season))));
ui.autoBtn.addEventListener('click', () => setAuto(!state.auto));
const fsSupported = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
if (!fsSupported) ui.fsBtn.hidden = true;
ui.fsBtn.addEventListener('click', () => {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    }
});
const onFs = () => { ui.fsText.textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? '退出全屏' : '全屏观看'; };
document.addEventListener('fullscreenchange', onFs);
document.addEventListener('webkitfullscreenchange', onFs);
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') snapToSeason(mod(Math.max(0, state.season) + 1, 4));
    else if (e.key === 'ArrowLeft') snapToSeason(mod(Math.max(0, state.season) - 1, 4));
    else if (e.key === ' ') { e.preventDefault(); setAuto(!state.auto); }
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        composer.setSize(window.innerWidth, window.innerHeight);
        fitCamera();
        moveGlider();
    }, 120);
});

// ---------- 循环 ----------
const clock = new THREE.Clock(false);
const tmpV = new THREE.Vector3();
const tmpW = [0, 0, 0, 0];
let running = false;
let rafId = 0;

function updateSpin(dt, t) {
    if (state.dragging) return;
    if (state.snapTo !== null) {
        const k = 7, c = 2 * Math.sqrt(k);
        state.vel += (k * (state.snapTo - state.rot) - c * state.vel) * dt;
        state.rot += state.vel * dt;
        if (Math.abs(state.snapTo - state.rot) < 0.002 && Math.abs(state.vel) < 0.01) {
            state.rot = state.snapTo;
            state.vel = 0;
            state.snapTo = null;
            state.holdUntil = t + 6;
        }
        return;
    }
    const target = state.auto && t > state.holdUntil ? state.autoVel : 0;
    const ease = Math.abs(state.vel) > Math.abs(target) + 0.05 ? 1.1 : 0.7;
    state.vel += (target - state.vel) * (1 - Math.exp(-dt * ease));
    state.rot += state.vel * dt;
}

function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    U.time.value = t;

    const introT = REDUCED ? 1 : clamp01((t - 0.4) / 5.2);
    U.grow.value = REDUCED ? 1 : easeInOut(introT);
    const grow = U.grow.value;

    if (t > 1.2 || REDUCED) updateSpin(dt, t);
    disc.rotation.y = state.rot;
    floatGroup.position.y = Math.sin(t * 0.6) * 0.12;
    floatGroup.rotation.z = Math.sin(t * 0.31) * 0.008;

    for (const p of props) {
        const k = clamp01((grow * GROW_SPAN - p.r) / 2.2);
        p.obj.visible = k > 0.001;
        p.obj.scale.setScalar(p.s0 * Math.max(0.0001, easeOutBack(k)));
    }
    for (const fn of updaters) fn(dt, t);

    // 我们脚下的季节
    const underTheta = SEASON_THETA[0] + state.rot;
    seasonWeights(seasonCoord(underTheta), 0.12, tmpW);
    const lp = polar(PATH_R, underTheta);
    const groundY = snowHeight(lp.x, lp.z);
    if (party) {
        const steps = party.update(dt, t, {
            weights: tmpW,
            surfaceSpeed: state.vel * PATH_R,
            groundY,
            appear: REDUCED ? 1 : smoothstep(0.62, 0.9, grow),
            camera
        });
        if (state.addFootprint) {
            for (const st of steps) {
                disc.worldToLocal(tmpV.copy(st.pos));
                if (weightsAt(tmpV.x, tmpV.z, 0.1, _w)[3] < 0.6) continue;
                state.addFootprint(tmpV.x, tmpV.z, st.yaw - state.rot, st.kind, t);
            }
        }
    }

    setSeasonUI(mod(Math.round(state.rot / HALF_PI), 4));
    setRing(Math.max(1, Math.floor((state.rot + HALF_PI * 0.5) / TAU) + 1), t);

    // 相机：开场从远处推近 + 跟随指针的轻微视差
    pointer.sx = lerp(pointer.sx, pointer.x, 1 - Math.exp(-dt * 2));
    pointer.sy = lerp(pointer.sy, pointer.y, 1 - Math.exp(-dt * 2));
    const intro = REDUCED ? 1 : easeInOut(clamp01(t / 5.5));
    camera.position.copy(camBase).multiplyScalar(lerp(1.45, 1, intro));
    camera.position.y += lerp(9, 0, intro);
    camera.position.x += pointer.sx * 0.9;
    camera.position.y += -pointer.sy * 0.5;
    camera.lookAt(camTarget);

    if (bubble.anchor) {
        if (t > bubble.until) {
            bubble.anchor = null;
            ui.bubble.hidden = true;
        } else {
            bubble.anchor.getWorldPosition(tmpV);
            tmpV.y += bubble.offsetY;
            tmpV.project(camera);
            ui.bubble.style.left = ((tmpV.x + 1) / 2) * window.innerWidth + 'px';
            ui.bubble.style.top = ((1 - tmpV.y) / 2) * window.innerHeight + 'px';
        }
    }

    composer.render(dt);
}

function start() {
    if (running) return;
    running = true;
    clock.start();
    frame();
}
function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    clock.stop();
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (state.ready) { clock.getDelta(); start(); }
});

// ---------- 启动 ----------
async function init() {
    document.getElementById('loveDays').textContent = loveDays();
    fitCamera();
    camera.position.copy(camBase);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

    buildSky();
    buildAura();
    buildSpringProps();
    buildSummerProps();
    buildAutumnProps();
    buildWinterProps();
    buildDisc();
    buildVegetation();
    buildSeasonDust();
    buildSnow();
    buildFireflies();
    buildFallers();
    buildFootprints();

    party = createParty();
    party.group.position.set(0, 0, PATH_R);
    floatGroup.add(party.group);

    setSeasonUI(0);
    renderer.compile(scene, camera);
    state.ready = true;
    document.getElementById('loader').classList.add('done');
    start();
    setTimeout(() => ui.card.classList.add('show'), REDUCED ? 0 : 2600);
    setTimeout(fadeHint, 12000);
    requestAnimationFrame(moveGlider);
}

init();

/* 校园三维导览 —— Three.js 场景
   写法沿用课堂七：Scene → Camera → Renderer → OrbitControls → requestAnimationFrame 循环；
   场景内容对照课堂七的校园案例（地面、教学楼、旗杆与旗帜、路灯），另加几棵绿化树。
   库版本：Three.js r128 + OrbitControls（课堂七 libs，MIT）。 */

const sceneRoot = document.querySelector('#scene-root');
const statusEl = document.querySelector('#scene-status');

const showStatus = (message) => {
  statusEl.textContent = message;
  statusEl.hidden = false;
};

/* ---------- 场景与相机 ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaee3f7);
scene.fog = new THREE.Fog(0xaee3f7, 45, 120);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(18, 11, 22);

/* ---------- 小工具：按尺寸与颜色造几何体，省得重复写 ---------- */
const box = (w, h, d, color, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 })
  );
  mesh.position.set(x, y, z);
  return mesh;
};

const cylinder = (top, bottom, height, color, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, 20),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 })
  );
  mesh.position.set(x, y, z);
  return mesh;
};

/* ---------- 地面与道路 ---------- */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x7cb342, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 7),
  new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 1 })
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.02, 12);
scene.add(road);

/* ---------- 教学楼：楼体 + 红色屋顶带 + 窗户阵列 + 门 ---------- */
const building = new THREE.Group();
building.add(box(16, 8, 10, 0xefeeee, 0, 4, 0));          // 楼体
building.add(box(17, 0.6, 11, 0xb71c1c, 0, 8.3, 0));      // 屋顶
building.add(box(2.4, 3.2, 0.3, 0x8d6e63, 0, 1.6, 5.1));  // 大门

// 窗户：三排、每排六扇，贴在正面
const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.3, metalness: 0.2 });
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 6; col++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.2), windowMaterial);
    win.position.set(-6.8 + col * 2.7, 2.6 + row * 2.2, 5.05);
    building.add(win);
  }
}
building.position.set(0, 0, -8);
scene.add(building);

/* ---------- 旗杆与旗帜（放在楼前空地上，让旗帜衬着天空） ---------- */
const pole = cylinder(0.09, 0.11, 9, 0xcfd8dc, 11, 4.5, 7);
scene.add(pole);
scene.add(cylinder(0.55, 0.65, 0.4, 0xb0bec5, 11, 0.2, 7));   // 旗杆基座

const flagGeometry = new THREE.PlaneGeometry(3, 2);
flagGeometry.translate(1.5, 0, 0);   // 把支点移到旗杆一侧，旋转时绕着杆摆
const flag = new THREE.Mesh(
  flagGeometry,
  new THREE.MeshStandardMaterial({ color: 0xe53935, side: THREE.DoubleSide, roughness: 0.7 })
);
flag.position.set(11.1, 7.6, 7);
scene.add(flag);

/* ---------- 路灯：灯杆 + 发光灯头 + 点光源 ---------- */
const lampGlows = [];
[[-12, 6], [-12, -2], [12, 6]].forEach(([x, z]) => {
  scene.add(cylinder(0.12, 0.14, 5, 0x616161, x, 2.5, z));
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xfff59d, emissive: 0xfff59d, emissiveIntensity: 0.8 })
  );
  glow.position.set(x, 5.1, z);
  scene.add(glow);
  lampGlows.push(glow);

  const light = new THREE.PointLight(0xfff59d, 0.7, 22);
  light.position.set(x, 5.2, z);
  scene.add(light);
});

/* ---------- 绿化树：圆柱树干 + 圆锥树冠 ---------- */
[[-8, 4], [-6, 16], [-13, 13], [16, -4], [-16, -6]].forEach(([x, z], index) => {
  const scale = 0.85 + (index % 3) * 0.15;
  scene.add(cylinder(0.18, 0.24, 2, 0x8d6e63, x, 1 * scale, z));
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 3.4, 18),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })
  );
  canopy.position.set(x, 3.4 * scale, z);
  scene.add(canopy);
});

/* ---------- 光照：环境光 + 平行光（不用阴影，保证流畅） ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(18, 26, 16);
scene.add(sun);

/* ---------- 渲染器 ---------- */
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  showStatus('当前浏览器无法创建 WebGL 画面，三维场景不可用：' + error.message);
}

if (renderer !== null) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '校园三维场景：地面与道路、教学楼、旗杆与旗帜、路灯和绿化树');
  sceneRoot.appendChild(renderer.domElement);
  start();
}

/* ---------- 相机控制与动画循环 ---------- */
function start() {
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 70;
  controls.maxPolarAngle = Math.PI * 0.49;   // 不让镜头钻到地面以下

  let frameId = null;
  let elapsed = 0;

  const renderFrame = () => {
    elapsed += 1 / 60;

    // 旗帜飘扬
    flag.rotation.y = Math.sin(elapsed * 1.8) * 0.28;
    flag.rotation.z = Math.sin(elapsed * 2.6) * 0.05;

    // 路灯呼吸
    const pulse = 0.7 + Math.sin(elapsed * 1.5) * 0.15;
    lampGlows.forEach(glow => { glow.material.emissiveIntensity = pulse; });

    controls.update();
    renderer.render(scene, camera);
  };

  const loop = () => {
    frameId = requestAnimationFrame(loop);
    renderFrame();
  };

  const play = () => {
    if (frameId === null) {
      loop();
    }
  };

  const pause = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  // 页面切到后台就停掉渲染循环，返回本页时再继续（避免三维页返回后卡顿）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
    } else {
      play();
    }
  });
  window.addEventListener('beforeunload', pause);

  play();
}

/* ---------- 窗口自适应 ---------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (renderer !== null) {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

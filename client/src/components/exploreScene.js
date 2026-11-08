// three.js scene for the landing page "Choose your path" section:
// a glowing CodeSphere core, four orbiting level planets and a starfield.
// Loaded with import() so three.js is only fetched when the section is used.
import * as THREE from 'three';

// Soft round glow texture (radial gradient), shared by every sprite.
function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const glowSprite = (texture, color, scale, opacity = 1) => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  sprite.scale.setScalar(scale);
  return sprite;
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ colors: string[], labels: HTMLElement[], active: number, onPick: (i: number) => void, still: boolean }} options
 */
export function createExploreScene(canvas, { colors, labels, active, onPick, still }) {
  const small = window.innerWidth < 640;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.6, 9.5);
  camera.lookAt(0, 0, 0);

  const texture = glowTexture();
  const world = new THREE.Group();
  scene.add(world);

  scene.add(new THREE.AmbientLight(0x8fb4ff, 0.6));
  const coreLight = new THREE.PointLight(0xff8a5c, 30, 20, 1.6);
  world.add(coreLight);

  // Core: dark sphere, orange wireframe shell, inner glow.
  const core = new THREE.Group();
  world.add(core);
  core.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.95, 4),
    new THREE.MeshStandardMaterial({ color: 0x14253a, emissive: 0xf05a36, emissiveIntensity: 0.25, roughness: 0.4, metalness: 0.3 })
  ));
  const shell = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.25, 1)),
    new THREE.LineBasicMaterial({ color: 0xff8568, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
  );
  core.add(shell);
  const shell2 = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.5, 0)),
    new THREE.LineBasicMaterial({ color: 0x4fb3ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending })
  );
  core.add(shell2);
  core.add(glowSprite(texture, 0xff6a3d, 5.5, 0.55));

  // Data-stream particles circling the core.
  const streamCount = small ? 160 : 320;
  const streamPos = new Float32Array(streamCount * 3);
  const streamSeed = [];
  for (let i = 0; i < streamCount; i += 1) {
    streamSeed.push({ r: 1.7 + Math.random() * 0.5, a: Math.random() * Math.PI * 2, y: (Math.random() - 0.5) * 0.5, s: 0.2 + Math.random() * 0.5 });
  }
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
  const stream = new THREE.Points(streamGeo, new THREE.PointsMaterial({
    size: 0.05, color: 0xffb199, transparent: true, opacity: 0.8, map: texture, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  world.add(stream);

  // Orbits and planets, one per level.
  const tilt = new THREE.Group();
  tilt.rotation.x = 0.32;
  tilt.rotation.z = -0.12;
  world.add(tilt);

  const planets = colors.map((hex, i) => {
    const color = new THREE.Color(hex);
    const radius = 2.4 + i * 0.75;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.006, radius + 0.006, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    tilt.add(ring);

    const body = new THREE.Group();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 32, 32),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 })
    );
    ball.userData.index = i;
    const halo = glowSprite(texture, color, 1.6, 0.7);
    const moonOrbit = new THREE.Group();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    moon.position.x = 0.48;
    moonOrbit.add(moon);
    moonOrbit.rotation.x = 0.6;
    body.add(ball, halo, moonOrbit);
    tilt.add(body);

    return { ring, body, ball, halo, moonOrbit, radius, angle: (i / colors.length) * Math.PI * 2 + 0.4, speed: 0.16 - i * 0.025, scale: 1 };
  });

  // Starfield.
  const starCount = small ? 450 : 1100;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const palette = [new THREE.Color(0xffffff), new THREE.Color(0xffc2ad), new THREE.Color(0x9fd3ff), new THREE.Color(0xd2c4ff)];
  for (let i = 0; i < starCount; i += 1) {
    const r = 14 + Math.random() * 22;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)], i * 3);
    const c = palette[i % palette.length];
    starCol.set([c.r, c.g, c.b], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.14, vertexColors: true, transparent: true, opacity: 0.9, map: texture, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(stars);

  // Interaction: pointer parallax, hover and click on planets.
  const pointer = new THREE.Vector2(0, 0);
  const target = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  let hovered = -1;
  let current = active;

  const toNdc = (event) => {
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  };
  const pick = (ndc) => {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(planets.map((p) => p.ball))[0];
    return hit ? hit.object.userData.index : -1;
  };
  const onMove = (event) => {
    const ndc = toNdc(event);
    target.copy(ndc);
    hovered = pick(ndc);
    canvas.style.cursor = hovered >= 0 ? 'pointer' : '';
    if (still) render();
  };
  const onLeave = () => { target.set(0, 0); hovered = -1; canvas.style.cursor = ''; };
  const onClick = (event) => {
    const index = pick(toNdc(event));
    if (index >= 0) onPick(index);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);

  // Sizing.
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull the camera back on narrow screens so every orbit fits.
    camera.position.z = w / h < 1 ? 9.5 / Math.max(0.62, w / h) : 9.5;
    camera.updateProjectionMatrix();
    if (still) render();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  // Labels follow their planets (HTML, so they stay crisp and accessible).
  const projected = new THREE.Vector3();
  const placeLabels = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    planets.forEach((p, i) => {
      const label = labels[i];
      if (!label) return;
      p.ball.getWorldPosition(projected);
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * w;
      const y = (-projected.y * 0.5 + 0.5) * h;
      label.style.transform = `translate(-50%, 0) translate(${x}px, ${y + 22 * p.scale}px)`;
      label.style.zIndex = String(Math.round((1 - projected.z) * 1000));
    });
  };

  // Animation.
  const clock = new THREE.Clock();
  let frame = 0;
  let running = false;

  function update(dt, t) {
    pointer.lerp(target, 0.05);
    world.rotation.y = pointer.x * 0.25;
    world.rotation.x = -pointer.y * 0.12;

    core.rotation.y += dt * 0.25;
    shell.rotation.x += dt * 0.12;
    shell2.rotation.y -= dt * 0.18;
    coreLight.intensity = 28 + Math.sin(t * 2) * 6;

    for (let i = 0; i < streamCount; i += 1) {
      const s = streamSeed[i];
      s.a += dt * s.s;
      streamPos[i * 3] = Math.cos(s.a) * s.r;
      streamPos[i * 3 + 1] = s.y + Math.sin(s.a * 3 + i) * 0.08;
      streamPos[i * 3 + 2] = Math.sin(s.a) * s.r;
    }
    streamGeo.attributes.position.needsUpdate = true;

    planets.forEach((p, i) => {
      p.angle += dt * p.speed;
      p.body.position.set(Math.cos(p.angle) * p.radius, 0, Math.sin(p.angle) * p.radius);
      const want = i === current ? 1.55 : i === hovered ? 1.25 : 1;
      p.scale += (want - p.scale) * 0.1;
      p.body.scale.setScalar(p.scale);
      p.moonOrbit.rotation.y += dt * 1.8;
      p.halo.material.opacity = i === current ? 0.95 + Math.sin(t * 3) * 0.15 : 0.5;
      p.ring.material.opacity += ((i === current ? 0.7 : 0.18) - p.ring.material.opacity) * 0.1;
      p.ball.material.emissiveIntensity = i === current ? 0.9 : 0.45;
    });

    stars.rotation.y += dt * 0.01;
  }

  function render() {
    renderer.render(scene, camera);
    placeLabels();
  }

  function loop() {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    render();
  }

  const start = () => {
    if (running || still) return;
    running = true;
    clock.getDelta();
    loop();
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(frame);
  };

  // Only animate while the section is on screen.
  const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
  visibility.observe(canvas);

  resize();
  // Reduced motion: one settled frame, redrawn on changes.
  if (still) {
    for (let i = 0; i < 30; i += 1) update(0, 0);
    render();
  }

  return {
    setActive(index) {
      current = index;
      if (still) {
        for (let i = 0; i < 30; i += 1) update(0, 0);
        render();
      }
    },
    dispose() {
      stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) [].concat(object.material).forEach((m) => m.dispose());
      });
      texture.dispose();
      renderer.dispose();
    },
  };
}

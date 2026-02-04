import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.querySelector("#scene");
const densityInput = document.querySelector("#density");
const npcInput = document.querySelector("#npcCount");
const playerInput = document.querySelector("#playerCount");
const avatarStyleInput = document.querySelector("#avatarStyle");
const avatarGlassesInput = document.querySelector("#avatarGlasses");
const regenerateButton = document.querySelector("#regenerate");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setClearColor(0x0b1120, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1120, 18, 60);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
camera.position.set(12, 10, 16);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 8;
controls.maxDistance = 40;

const ambient = new THREE.AmbientLight(0x7c95ff, 0.35);
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(15, 20, 8);

scene.add(ambient, sun);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(120, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x101a33, side: THREE.BackSide })
);
scene.add(sky);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x111827 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

const cityGroup = new THREE.Group();
const npcGroup = new THREE.Group();
const playerGroup = new THREE.Group();
const propGroup = new THREE.Group();
const roadGroup = new THREE.Group();
scene.add(roadGroup, propGroup);
scene.add(cityGroup, npcGroup, playerGroup);

const buildingPalette = [0x2f3b5b, 0x1f2937, 0x33425f, 0x3b4c6b, 0x2a3655];
const npcPalette = [0xf7b500, 0xf5a524, 0xffc54a];
const playerPalette = [0x4fd1ff, 0x00f0ff, 0x42b5ff];
const avatarStyles = {
  hero: { color: 0x4fd1ff, accent: 0xfff1a8 },
  speedster: { color: 0xff4d6d, accent: 0xffb347 },
  street: { color: 0x60d394, accent: 0x1b2a3f },
  tech: { color: 0xa66bff, accent: 0x63e6ff },
};

function createBillboard(x, z) {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x1e40af })
  );
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2),
    new THREE.MeshStandardMaterial({ color: 0x4b5563 })
  );
  board.position.set(x, 2.8, z);
  pole.position.set(x, 1, z);
  const group = new THREE.Group();
  group.add(pole, board);
  return group;
}

function createCrate(x, z) {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x065f46 })
  );
  crate.position.set(x, 0.35, z);
  return crate;
}

function createBuilding(x, z) {
  const width = THREE.MathUtils.randFloat(1.5, 3.2);
  const depth = THREE.MathUtils.randFloat(1.5, 3.2);
  const height = THREE.MathUtils.randFloat(3, 10);
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: buildingPalette[Math.floor(Math.random() * buildingPalette.length)],
    roughness: 0.6,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, height / 2 - 0.05, z);
  return mesh;
}

function createCharacter({ color, position, hasSunglasses, accentColor }) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1, 4, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 0.9;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd3b6 })
  );
  head.position.y = 1.65;
  group.add(body, head);

  if (accentColor) {
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: accentColor })
    );
    chest.position.set(0, 1.1, 0.4);
    group.add(chest);
  }

  if (hasSunglasses) {
    const glasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    glasses.position.set(0, 1.65, 0.32);
    group.add(glasses);
  }

  group.position.copy(position);
  return group;
}

function clearGroup(group) {
  while (group.children.length > 0) {
    const child = group.children.pop();
    if (child) {
      child.traverse?.((node) => {
        if (node.isMesh) {
          node.geometry?.dispose?.();
          if (Array.isArray(node.material)) {
            node.material.forEach((material) => material.dispose());
          } else {
            node.material?.dispose?.();
          }
        }
      });
    }
  }
}

function generateCity({ density, npcCount, playerCount }) {
  clearGroup(cityGroup);
  clearGroup(npcGroup);
  clearGroup(playerGroup);
  clearGroup(propGroup);
  clearGroup(roadGroup);

  const spacing = 4.2;
  const grid = Math.floor(density);
  const offset = (grid * spacing) / 2;

  for (let i = 0; i <= grid; i += 1) {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(grid * spacing, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0, i * spacing - offset);
    roadGroup.add(line);

    const cross = line.clone();
    cross.position.set(i * spacing - offset, 0, 0);
    cross.rotation.z = Math.PI / 2;
    roadGroup.add(cross);
  }

  for (let x = 0; x < grid; x += 1) {
    for (let z = 0; z < grid; z += 1) {
      if (Math.random() < 0.18) {
        continue;
      }
      const building = createBuilding(x * spacing - offset, z * spacing - offset);
      cityGroup.add(building);
      if (Math.random() < 0.08) {
        propGroup.add(createBillboard(x * spacing - offset, z * spacing - offset));
      }
    }
  }

  for (let i = 0; i < grid; i += 1) {
    if (Math.random() < 0.7) {
      propGroup.add(
        createCrate(
          THREE.MathUtils.randFloatSpread(grid * spacing * 0.7),
          THREE.MathUtils.randFloatSpread(grid * spacing * 0.7)
        )
      );
    }
  }

  for (let i = 0; i < npcCount; i += 1) {
    const position = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(grid * spacing * 0.7),
      0,
      THREE.MathUtils.randFloatSpread(grid * spacing * 0.7)
    );
    const npc = createCharacter({
      color: npcPalette[i % npcPalette.length],
      position,
      hasSunglasses: true,
    });
    npcGroup.add(npc);
  }

  for (let i = 0; i < playerCount; i += 1) {
    const position = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(grid * spacing * 0.6),
      0,
      THREE.MathUtils.randFloatSpread(grid * spacing * 0.6)
    );
    const player = createCharacter({
      color: playerPalette[i % playerPalette.length],
      position,
      hasSunglasses: false,
    });
    playerGroup.add(player);
  }

  const avatarStyle = avatarStyles[avatarStyleInput.value] || avatarStyles.hero;
  const avatar = createCharacter({
    color: avatarStyle.color,
    accentColor: avatarStyle.accent,
    position: new THREE.Vector3(0, 0, 0),
    hasSunglasses: avatarGlassesInput.checked,
  });
  avatar.position.set(0, 0, 0);
  playerGroup.add(avatar);
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas;
  if (clientWidth === 0 || clientHeight === 0) {
    return;
  }
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

function render() {
  resizeRenderer();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function handleRegenerate() {
  generateCity({
    density: Number(densityInput.value),
    npcCount: Number(npcInput.value),
    playerCount: Number(playerInput.value),
  });
}

window.addEventListener("resize", resizeRenderer);
regenerateButton.addEventListener("click", handleRegenerate);
avatarStyleInput.addEventListener("change", handleRegenerate);
avatarGlassesInput.addEventListener("change", handleRegenerate);

handleRegenerate();
render();

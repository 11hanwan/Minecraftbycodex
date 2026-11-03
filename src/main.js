import * as THREE from "three";
import "./style.css";
import {
  heightAt,
  seededRandom,
  craft,
  canCraft,
  recipes,
} from "./survival.js";
const $ = (id) => document.getElementById(id),
  rand = seededRandom();
const scene = new THREE.Scene();
scene.background = new THREE.Color("#9bc5bf");
scene.fog = new THREE.FogExp2("#9bc5bf", 0.012);
const camera = new THREE.PerspectiveCamera(
  72,
  innerWidth / innerHeight,
  0.08,
  180,
);
camera.rotation.order = "YXZ";
const renderer = new THREE.WebGLRenderer({
  canvas: $("world"),
  antialias: true,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const hemi = new THREE.HemisphereLight("#e0efe0", "#526b43", 2.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight("#ffe6b3", 3);
sun.position.set(25, 45, -25);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -55,
  right: 55,
  top: 55,
  bottom: -55,
  near: 1,
  far: 130,
});
sun.shadow.bias = -0.001;
scene.add(sun);
scene.add(sun.target);
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });
const materials = {
  grass: mat("#839867"),
  sand: mat("#cbbd8b"),
  dirt: mat("#8d7954"),
  bark: mat("#72553a"),
  leaf: mat("#526f45"),
  leaf2: mat("#6c8752"),
  rock: mat("#929b8d"),
  wood: mat("#9e7e51"),
  berry: mat("#b96242"),
};
function mesh(geo, material, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = new THREE.BoxGeometry(1, 1, 1),
  resources = [],
  buildings = [],
  wolves = [];
// Instanced terrain gives the island a carved, block-built silhouette.
const terrainData = [];
for (let x = -48; x <= 48; x += 2)
  for (let z = -48; z <= 48; z += 2) {
    const h = heightAt(x, z);
    if (h > -3) terrainData.push({ x, z, h });
  }
const terrain = new THREE.InstancedMesh(
    box,
    materials.grass,
    terrainData.length,
  ),
  dummy = new THREE.Object3D(),
  color = new THREE.Color();
terrainData.forEach(({ x, z, h }, i) => {
  dummy.position.set(x, (h - 5) / 2, z);
  dummy.scale.set(2, h + 5, 2);
  dummy.updateMatrix();
  terrain.setMatrixAt(i, dummy.matrix);
  color.set(h < 1 ? "#c8bc8e" : i % 4 === 0 ? "#8f9e6e" : "#7e9161");
  terrain.setColorAt(i, color);
});
terrain.receiveShadow = true;
terrain.castShadow = true;
scene.add(terrain);
const water = mesh(
  new THREE.PlaneGeometry(700, 700, 1, 1),
  mat("#609e9b", {
    transparent: true,
    opacity: 0.79,
    metalness: 0.25,
    roughness: 0.3,
  }),
  0,
  -0.45,
  0,
);
water.rotation.x = -Math.PI / 2;
water.castShadow = false;
const resourceGeo = {
  trunk: new THREE.CylinderGeometry(0.28, 0.46, 3.8, 6),
  leaf: new THREE.ConeGeometry(2.5, 4.5, 6),
  rock: new THREE.DodecahedronGeometry(1.1, 0),
  bush: new THREE.IcosahedronGeometry(0.9, 0),
};
for (let i = 0; i < 160; i++) {
  const x = (rand() - 0.5) * 83,
    z = (rand() - 0.5) * 83,
    y = heightAt(x, z);
  if (y < 1 || Math.hypot(x - 3, z - 9) < 5) continue;
  const type = i % 5 === 0 ? "stone" : i % 7 === 0 ? "berries" : "wood",
    group = new THREE.Group();
  group.position.set(x, y, z);
  scene.add(group);
  if (type === "wood") {
    mesh(resourceGeo.trunk, materials.bark, 0, 1.8, 0, group);
    const a = mesh(
      resourceGeo.leaf,
      i % 2 ? materials.leaf : materials.leaf2,
      0,
      4.4,
      0,
      group,
    );
    a.rotation.y = rand() * 6;
    mesh(
      new THREE.ConeGeometry(1.8, 3.8, 6),
      materials.leaf2,
      0,
      6.3,
      0,
      group,
    );
  }
  if (type === "stone") {
    const m = mesh(resourceGeo.rock, materials.rock, 0, 0.65, 0, group);
    m.scale.set(1.3, 0.9, 1);
    m.rotation.set(rand(), rand(), rand());
  }
  if (type === "berries") {
    mesh(resourceGeo.bush, materials.leaf2, 0, 0.55, 0, group);
    for (let j = 0; j < 6; j++)
      mesh(
        new THREE.IcosahedronGeometry(0.13),
        materials.berry,
        (rand() - 0.5) * 1.1,
        0.65 + rand() * 0.5,
        (rand() - 0.5) * 1.1,
        group,
      );
  }
  const r = { id: i, type, group, hp: type === "wood" ? 3 : 2, alive: true };
  group.traverse((o) => {
    if (o.isMesh) o.userData.resource = r;
  });
  resources.push(r);
}
// Tufts, shore pebbles and faraway clouds.
const grassTufts = [];
for (let i = 0; i < 600; i++) {
  const x = (rand() - 0.5) * 86,
    z = (rand() - 0.5) * 86,
    y = heightAt(x, z);
  if (y < 1) continue;
  grassTufts.push({ x, y, z, tilt: (rand() - 0.5) * 0.5 });
}
const grass = new THREE.InstancedMesh(
  new THREE.ConeGeometry(0.12, 0.5, 3),
  materials.grass,
  grassTufts.length,
);
grassTufts.forEach((p, i) => {
  dummy.position.set(p.x, p.y + 0.2, p.z);
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, p.tilt);
  dummy.updateMatrix();
  grass.setMatrixAt(i, dummy.matrix);
  grass.setColorAt(i, new THREE.Color(i % 2 ? "#a2ac78" : "#677e51"));
});
grass.receiveShadow = true;
scene.add(grass);
const cloudMat = mat("#f0eee0");
for (let i = 0; i < 22; i++) {
  const c = mesh(
    new THREE.IcosahedronGeometry(1, 0),
    cloudMat,
    (rand() - 0.5) * 230,
    32 + rand() * 15,
    (rand() - 0.5) * 230,
  );
  c.scale.set(9 + rand() * 12, 1.5 + rand() * 2, 4 + rand() * 6);
  c.castShadow = false;
}
let state = {
    health: 100,
    hunger: 100,
    stamina: 100,
    wood: 0,
    stone: 0,
    berries: 0,
    time: 0.28,
    day: 1,
  },
  selected = 0,
  rotation = 0,
  dead = false,
  played = false,
  questDone = false;
const player = {
  position: new THREE.Vector3(3, heightAt(3, 9) + 1.7, 9),
  vy: 0,
  grounded: true,
  yaw: 0,
  pitch: 0,
};
const slots = [
  { name: "YXA", icon: "🪓", type: "axe" },
  { name: "SPJUT", icon: "↟", type: "spear" },
  { name: "VÄGG", icon: "▥", type: "wall", cost: "4 TRÄ" },
  { name: "GOLV", icon: "▱", type: "floor", cost: "3 TRÄ" },
  { name: "LÄGERELD", icon: "♨", type: "fire", cost: "5 TRÄ · 4 STEN" },
];
$("hotbar").innerHTML = slots
  .map(
    (s, i) =>
      `<div class="slot ${i === 0 ? "active" : ""}"><span class="number">${i + 1}</span><span class="icon">${s.icon}</span><span class="name">${s.name}</span><span class="cost">${s.cost || "VERKTYG"}</span></div>`,
  )
  .join("");
const hand = new THREE.Group();
camera.add(hand);
scene.add(camera);
const handle = mesh(
  new THREE.CylinderGeometry(0.035, 0.045, 0.75, 6),
  materials.bark,
  0.34,
  -0.36,
  -0.5,
  hand,
);
handle.rotation.z = -0.35;
const blade = mesh(
  new THREE.BoxGeometry(0.28, 0.23, 0.08),
  materials.rock,
  0.23,
  -0.03,
  -0.5,
  hand,
);
const spear = mesh(
  new THREE.ConeGeometry(0.065, 0.35, 5),
  materials.rock,
  0.23,
  0.06,
  -0.5,
  hand,
);
spear.visible = false;
const ghost = mesh(
  box,
  new THREE.MeshBasicMaterial({
    color: "#d6e4ab",
    transparent: true,
    opacity: 0.35,
    wireframe: true,
  }),
);
ghost.visible = false;
let buildPoint = null,
  target = null,
  noticeTimeout,
  hitCooldown = 0,
  swing = 0,
  saveTimer = 0,
  enemyTimer = 0;
function notice(t) {
  $("notice").textContent = t;
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => ($("notice").textContent = ""), 2500);
}
function select(n) {
  selected = n;
  document
    .querySelectorAll(".slot")
    .forEach((e, i) => e.classList.toggle("active", i === n));
  blade.visible = n === 0;
  spear.visible = n === 1;
  hand.visible = n < 2;
}
function addBuilding(type, x, y, z, rot = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rot;
  scene.add(group);
  if (type === "wall") {
    for (let i = 0; i < 6; i++)
      mesh(
        new THREE.BoxGeometry(0.32, 2.8, 0.3),
        materials.wood,
        -0.85 + i * 0.34,
        1.4,
        0,
        group,
      );
    for (let h of [0.45, 2.3])
      mesh(
        new THREE.BoxGeometry(2.2, 0.14, 0.4),
        materials.bark,
        0,
        h,
        0,
        group,
      );
  } else if (type === "floor") {
    for (let i = 0; i < 6; i++)
      mesh(
        new THREE.BoxGeometry(0.32, 0.16, 2),
        materials.wood,
        -0.85 + i * 0.34,
        0.12,
        0,
        group,
      );
  } else {
    for (let i = 0; i < 7; i++) {
      let a = (i / 7) * Math.PI * 2;
      mesh(
        new THREE.DodecahedronGeometry(0.2),
        materials.rock,
        Math.cos(a) * 0.6,
        0.15,
        Math.sin(a) * 0.6,
        group,
      );
    }
    for (let i = 0; i < 3; i++) {
      const log = mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 1.1, 5),
        materials.bark,
        0,
        0.2,
        0,
        group,
      );
      log.rotation.set(Math.PI / 2, 0, i * 1.1);
    }
    const flame = mesh(
      new THREE.ConeGeometry(0.29, 0.9, 5),
      new THREE.MeshBasicMaterial({ color: "#ffc86b" }),
      0,
      0.65,
      0,
      group,
    );
    const light = new THREE.PointLight("#ffb75e", 8, 12, 2);
    light.position.y = 1;
    group.add(light);
    group.userData.flame = flame;
    group.userData.light = light;
  }
  const b = { type, x, y, z, rot, group };
  buildings.push(b);
  return b;
}
function save() {
  try {
    localStorage.setItem(
      "vildmark-save-v1",
      JSON.stringify({
        state,
        position: player.position.toArray(),
        yaw: player.yaw,
        buildings: buildings.map(({ type, x, y, z, rot }) => ({
          type,
          x,
          y,
          z,
          rot,
        })),
        harvested: resources.filter((r) => !r.alive).map((r) => r.id),
        questDone,
      }),
    );
  } catch {}
}
try {
  const s = JSON.parse(localStorage.getItem("vildmark-save-v1"));
  if (
    s &&
    s.state &&
    Array.isArray(s.position) &&
    s.position.every(Number.isFinite)
  ) {
    Object.assign(state, s.state);
    player.position.fromArray(s.position);
    player.yaw = s.yaw || 0;
    questDone = !!s.questDone;
    for (const b of s.buildings || [])
      if (recipes[b.type]) addBuilding(b.type, b.x, b.y, b.z, b.rot);
    for (const r of resources)
      if (s.harvested?.includes(r.id)) {
        r.alive = false;
        r.group.visible = false;
      }
  }
} catch {
  notice("Sparningen kunde inte läsas. En ny resa börjar.");
}
function reset() {
  localStorage.removeItem("vildmark-save-v1");
  location.reload();
}
$("reset").onclick = reset;
$("respawn").onclick = reset;
const keys = new Set();
function active() {
  return (
    document.pointerLockElement === renderer.domElement &&
    !dead &&
    $("help").classList.contains("hidden")
  );
}
function play() {
  if (dead) return;
  $("help").classList.add("hidden");
  renderer.domElement.requestPointerLock();
}
$("play").onclick = play;
renderer.domElement.onclick = () => {
  if (!active() && $("help").classList.contains("hidden") && !dead) play();
};
document.addEventListener("pointerlockchange", () => {
  keys.clear();
  if (document.pointerLockElement === renderer.domElement) {
    played = true;
    $("menu").classList.add("hidden");
  } else if (!dead && $("help").classList.contains("hidden")) {
    $("menu").classList.remove("hidden");
    $("play").innerHTML = "FORTSÄTT ÄVENTYRET <span>↗</span>";
    save();
  }
});
function help() {
  const opening = $("help").classList.contains("hidden");
  $("help").classList.toggle("hidden", !opening);
  if (opening) {
    document.exitPointerLock();
    $("menu").classList.add("hidden");
  } else play();
}
$("helpBtn").onclick = help;
$("closeHelp").onclick = help;
addEventListener("keydown", (e) => {
  if (["Space", "Tab"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyH" && !e.repeat) {
    help();
    return;
  }
  if (!active()) return;
  keys.add(e.code);
  if (/^Digit[1-5]$/.test(e.code)) select(+e.code.slice(-1) - 1);
  if (e.code === "KeyB" && !e.repeat) select(selected < 2 ? 2 : 0);
  if (e.code === "KeyR" && !e.repeat) rotation += Math.PI / 2;
  if (e.code === "KeyF" && !e.repeat) {
    if (state.berries > 0) {
      state.berries--;
      state.hunger = Math.min(100, state.hunger + 22);
      state.health = Math.min(100, state.health + 3);
      notice("Bär +22 hunger");
    } else notice("Hitta bär på öns buskar.");
  }
  if (e.code === "KeyE" && !e.repeat) harvest();
  if (e.code === "Space" && player.grounded) {
    player.vy = 7;
    player.grounded = false;
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
addEventListener("mousemove", (e) => {
  if (active()) {
    player.yaw -= e.movementX * 0.002;
    player.pitch = THREE.MathUtils.clamp(
      player.pitch - e.movementY * 0.002,
      -1.48,
      1.48,
    );
  }
});
addEventListener("mousedown", (e) => {
  if (e.button === 0 && active()) use();
});
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener(
  "wheel",
  (e) => {
    if (active()) select((selected + (e.deltaY > 0 ? 1 : 4)) % 5);
  },
  { passive: true },
);
const ray = new THREE.Raycaster(),
  direction = new THREE.Vector3();
function updateTarget() {
  camera.getWorldDirection(direction);
  ray.set(camera.position, direction);
  ray.far = 5;
  const hits = ray.intersectObjects(
    resources.filter((r) => r.alive).map((r) => r.group),
    true,
  );
  target = hits[0]?.object.userData.resource || null;
  $("target").textContent =
    selected < 2 && target
      ? `[E] ${target.type === "wood" ? "Hugg träd" : target.type === "stone" ? "Bryt sten" : "Plocka bär"} · ${target.hp} slag`
      : "";
  buildPoint = null;
  ghost.visible = false;
  if (selected >= 2) {
    for (let t = 1.5; t < 6; t += 0.1) {
      const p = camera.position.clone().addScaledVector(direction, t);
      if (p.y <= heightAt(p.x, p.z) + 0.2) {
        const x = Math.round(p.x / 2) * 2,
          z = Math.round(p.z / 2) * 2,
          y = heightAt(x, z);
        if (
          y >= 0 &&
          Math.hypot(x - player.position.x, z - player.position.z) > 1.4
        ) {
          buildPoint = { x, y, z };
          ghost.position.set(
            x,
            y + (selected === 2 ? 1.4 : selected === 3 ? 0.12 : 0.5),
            z,
          );
          ghost.scale.set(
            2,
            selected === 2 ? 2.8 : selected === 3 ? 0.2 : 1,
            selected === 2 ? 0.35 : 2,
          );
          ghost.rotation.y = rotation;
          ghost.material.color.set(
            canCraft(state, slots[selected].type) ? "#d4e6a8" : "#e98970",
          );
          ghost.visible = true;
        }
        break;
      }
    }
    $("target").textContent = buildPoint
      ? "Vänsterklick: bygg · R: rotera"
      : "Sikta på marken i närheten";
  }
}
function harvest() {
  if (performance.now() < hitCooldown) return;
  if (!target) {
    notice("Gå närmare ett träd, en sten eller en bärbuske.");
    return;
  }
  hitCooldown = performance.now() + 420;
  swing = 1;
  target.hp--;
  target.group.rotation.z = 0.035;
  const struck = target;
  setTimeout(() => {
    struck.group.rotation.z = 0;
  }, 100);
  if (target.hp <= 0) {
    const amount = target.type === "wood" ? 6 : target.type === "stone" ? 4 : 3;
    state[target.type] += amount;
    target.alive = false;
    target.group.visible = false;
    notice(
      `+${amount} ${target.type === "wood" ? "trä" : target.type === "stone" ? "sten" : "bär"}`,
    );
    target = null;
    save();
  }
}
function use() {
  if (performance.now() < hitCooldown) return;
  if (selected >= 2) {
    if (!buildPoint) {
      notice("Sikta på torr mark, en bit framför dig.");
      return;
    }
    const { x, y, z } = buildPoint,
      type = slots[selected].type;
    if (
      buildings.some(
        (b) =>
          b.x === x &&
          b.z === z &&
          b.type === type &&
          b.rot % Math.PI === rotation % Math.PI,
      )
    ) {
      notice("Här finns redan ett bygge.");
      return;
    }
    if (!craft(state, type)) {
      notice("Du behöver fler resurser.");
      return;
    }
    addBuilding(type, x, y, z, rotation);
    hitCooldown = performance.now() + 350;
    notice(
      type === "fire" ? "En varm plats i vildmarken." : "Ditt skydd tar form.",
    );
    save();
  } else {
    let hit = false;
    for (const w of wolves) {
      const delta = w.group.position.clone().sub(player.position);
      delta.y = 0;
      if (delta.length() < 3.7 && delta.normalize().dot(direction) > 0.55) {
        w.hp -= selected === 1 ? 55 : 25;
        w.flash = 0.2;
        hit = true;
        if (w.hp <= 0) {
          scene.remove(w.group);
          wolves.splice(wolves.indexOf(w), 1);
          notice("Vargen är besegrad.");
        }
        break;
      }
    }
    if (hit) {
      hitCooldown = performance.now() + 500;
      swing = 1;
    } else harvest();
  }
}
function spawnWolf() {
  const a = rand() * Math.PI * 2,
    r = 15 + rand() * 8,
    x = THREE.MathUtils.clamp(player.position.x + Math.cos(a) * r, -35, 35),
    z = THREE.MathUtils.clamp(player.position.z + Math.sin(a) * r, -35, 35);
  if (heightAt(x, z) < 0) return;
  const group = new THREE.Group(),
    fur = mat("#5c6662");
  mesh(new THREE.BoxGeometry(0.65, 0.7, 1.4), fur, 0, 0.7, 0, group);
  mesh(new THREE.BoxGeometry(0.58, 0.55, 0.65), fur, 0, 1.05, -0.8, group);
  for (const sx of [-0.23, 0.23]) {
    mesh(new THREE.ConeGeometry(0.16, 0.38, 3), fur, sx, 1.5, -0.8, group);
    mesh(
      new THREE.BoxGeometry(0.09, 0.07, 0.02),
      new THREE.MeshBasicMaterial({ color: "#ffc978" }),
      sx,
      1.12,
      -1.135,
      group,
    );
    for (const sz of [-0.48, 0.48])
      mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), fur, sx, 0.3, sz, group);
  }
  group.position.set(x, heightAt(x, z), z);
  scene.add(group);
  wolves.push({ group, hp: 100, cooldown: 0, flash: 0 });
}
function collides(x, z) {
  if (Math.abs(x) > 47 || Math.abs(z) > 47) return true;
  for (const b of buildings)
    if (b.type === "wall") {
      const dx = x - b.x,
        dz = z - b.z,
        c = Math.cos(b.rot),
        s = Math.sin(b.rot);
      if (
        Math.abs(c * dx - s * dz) < 1.35 &&
        Math.abs(s * dx + c * dz) < 0.48 &&
        player.position.y < b.y + 4.4
      )
        return true;
    }
  return false;
}
function die() {
  dead = true;
  state.health = 0;
  localStorage.removeItem("vildmark-save-v1");
  document.exitPointerLock();
  $("menu").classList.add("hidden");
  $("death").classList.remove("hidden");
  $("deathText").textContent =
    `Du klarade dig till dag ${state.day}. Ön väntar på ditt nästa försök.`;
}
function update(dt, t) {
  swing = Math.max(0, swing - dt * 4);
  hand.rotation.x = -Math.sin(swing * Math.PI) * 0.8;
  hand.position.y = Math.sin(t * 6) * 0.008;
  if (active()) {
    const moving =
        keys.has("KeyW") ||
        keys.has("KeyS") ||
        keys.has("KeyA") ||
        keys.has("KeyD"),
      sprinting = moving && keys.has("ShiftLeft") && state.stamina > 2;
    state.stamina = THREE.MathUtils.clamp(
      state.stamina + (sprinting ? -19 : 12) * dt,
      0,
      100,
    );
    const speed = (sprinting ? 6.5 : 3.7) * dt,
      forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
      side = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      norm = Math.hypot(forward, side) || 1;
    const dx =
        ((-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * side) /
          norm) *
        speed,
      dz =
        ((-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * side) /
          norm) *
        speed;
    const nx = player.position.x + dx,
      nz = player.position.z + dz;
    if (
      !collides(nx, player.position.z) &&
      heightAt(nx, player.position.z) <= player.position.y - 0.65
    )
      player.position.x = nx;
    if (
      !collides(player.position.x, nz) &&
      heightAt(player.position.x, nz) <= player.position.y - 0.65
    )
      player.position.z = nz;
    player.vy -= 20 * dt;
    player.position.y += player.vy * dt;
    let ground = heightAt(player.position.x, player.position.z) + 1.7;
    for (const b of buildings)
      if (
        b.type === "floor" &&
        Math.abs(player.position.x - b.x) < 1 &&
        Math.abs(player.position.z - b.z) < 1
      )
        ground = Math.max(ground, b.y + 1.95);
    if (player.position.y <= ground) {
      player.position.y = ground;
      player.vy = 0;
      player.grounded = true;
    }
    state.hunger = Math.max(0, state.hunger - dt * 0.24);
    if (state.hunger <= 0) state.health -= dt * 2;
    if (ground < 1.7) state.health -= dt * 4;
    let warmth = false;
    for (const b of buildings)
      if (b.type === "fire" && b.group.position.distanceTo(player.position) < 6)
        warmth = true;
    if (warmth && state.hunger > 10)
      state.health = Math.min(100, state.health + dt * 1.8);
    state.time += dt / 480;
    if (state.time >= 1) {
      state.time -= 1;
      state.day++;
      notice(`Dag ${state.day} — ännu en morgon.`);
    }
    const night = state.time > 0.76 || state.time < 0.2;
    enemyTimer += dt;
    if (night && enemyTimer > 12 && wolves.length < 5) {
      spawnWolf();
      enemyTimer = 0;
    }
    for (const w of [...wolves]) {
      w.cooldown -= dt;
      const delta = player.position.clone().sub(w.group.position);
      delta.y = 0;
      const distance = delta.length();
      let flee = buildings.some(
        (b) =>
          b.type === "fire" &&
          b.group.position.distanceTo(w.group.position) < 7,
      );
      if (!night || flee) {
        delta.negate();
        if (distance > 38) {
          scene.remove(w.group);
          wolves.splice(wolves.indexOf(w), 1);
          continue;
        }
      }
      if (distance > 1.5 || flee) {
        delta.normalize();
        const x = w.group.position.x + delta.x * dt * (night ? 2.1 : 3),
          z = w.group.position.z + delta.z * dt * (night ? 2.1 : 3);
        const wall = buildings.some(
          (b) => b.type === "wall" && Math.hypot(b.x - x, b.z - z) < 1.5,
        );
        if (!wall && heightAt(x, z) >= 0) {
          w.group.position.set(x, heightAt(x, z), z);
          w.group.rotation.y = Math.atan2(-delta.x, -delta.z);
        }
      }
      if (distance < 1.9 && !flee && night && w.cooldown <= 0) {
        state.health -= 12;
        w.cooldown = 1.3;
        notice("En varg attackerar! Använd spjutet [2].");
      }
    }
    if (state.health <= 0) die();
    saveTimer += dt;
    if (saveTimer > 10) {
      save();
      saveTimer = 0;
    }
  }
  camera.position.copy(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0);
  if (!played) {
    camera.position.set(13, 11, 22);
    camera.lookAt(-3, 3, -4);
  }
  camera.updateMatrixWorld();
  if (active()) updateTarget();
  else {
    ghost.visible = false;
    $("target").textContent = "";
  }
  const daylight = THREE.MathUtils.smoothstep(
    Math.sin((state.time - 0.23) * Math.PI * 2),
    -0.22,
    0.35,
  );
  scene.background.setRGB(
    0.055 + daylight * 0.46,
    0.09 + daylight * 0.61,
    0.13 + daylight * 0.6,
  );
  scene.fog.color.copy(scene.background);
  hemi.intensity = 0.25 + daylight * 2.1;
  sun.intensity = 0.15 + daylight * 2.7;
  sun.position.set(
    Math.cos(state.time * Math.PI * 2) * 45,
    15 + daylight * 45,
    -30,
  );
  water.material.color.set(daylight > 0.4 ? "#609e9b" : "#253e51");
  for (const b of buildings)
    if (b.type === "fire") {
      b.group.userData.flame.scale.setScalar(1 + Math.sin(t * 15) * 0.1);
      b.group.userData.light.intensity = 7 + Math.sin(t * 13);
    }
  for (const key of ["health", "hunger", "stamina"]) {
    $(key + "Text").textContent = Math.max(0, Math.ceil(state[key]));
    $(key + "Bar").style.width = `${Math.max(0, state[key])}%`;
  }
  for (const key of ["wood", "stone", "berries"])
    $(key).textContent = state[key];
  const hour = Math.floor(state.time * 24),
    minute = Math.floor(state.time * 24 * 60) % 60;
  $("clock").textContent =
    `DAG ${state.day} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  $("coords").textContent =
    `ÖN / ${Math.round(player.position.x)} N · ${Math.round(player.position.z)} Ö`;
  if (!questDone && state.wood >= 12 && state.stone >= 8) {
    questDone = true;
    notice("Resurserna är säkrade. Bygg ditt första läger!");
  }
  const fire = buildings.some((b) => b.type === "fire");
  $("quest").textContent = fire
    ? "Håll dig mätt. Försvara ditt läger. Utforska ön."
    : questDone
      ? "Bygg en lägereld [5] och ett skydd [3]."
      : "Samla 12 trä och 8 sten.";
  $("questProgress").style.width = fire
    ? "100%"
    : questDone
      ? "65%"
      : `${Math.min(1, (Math.min(12, state.wood) + Math.min(8, state.stone)) / 20) * 50}%`;
}
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener("beforeunload", () => {
  if (!dead) save();
});

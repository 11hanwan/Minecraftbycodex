import * as THREE from "three";
import "./style.css";
import { heightAt, seededRandom, WORLD_RADIUS } from "./survival.js";
import {
  items,
  resourceNames,
  emptyInventory,
  craftStatus,
  makeItem,
  gatherRule,
  variants,
} from "./progression.js";
import { createWorld } from "./world.js";
import {
  HOTBAR_START,
  icons,
  count,
  exactCount,
  collect,
  addItems,
  removeItems,
  moveSlot,
  normalizeInventory,
  TOOL_IDS,
} from "./inventory.js";
const $ = (id) => document.getElementById(id),
  SAVE_KEY = "vildmark-strandad-v2",
  rand = seededRandom(981);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#b9cec4");
scene.fog = new THREE.FogExp2("#b9cec4", 0.0065);
const camera = new THREE.PerspectiveCamera(
  72,
  innerWidth / innerHeight,
  0.06,
  330,
);
camera.rotation.order = "YXZ";
const renderer = new THREE.WebGLRenderer({
  canvas: $("world"),
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const hemi = new THREE.HemisphereLight("#e9f4e9", "#657047", 2);
scene.add(hemi);
const sun = new THREE.DirectionalLight("#ffdfac", 2.8);
sun.position.set(35, 55, -30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -60,
  right: 60,
  top: 60,
  bottom: -60,
  near: 1,
  far: 180,
});
sun.shadow.normalBias = 0.04;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);
const world = createWorld(scene),
  { mesh, mats, resources } = world,
  buildings = [],
  animals = [];
const state = {
  health: 100,
  hunger: 100,
  thirst: 100,
  stamina: 100,
  time: 0.32,
  day: 1,
  elapsed: 0,
  inventory: emptyInventory(),
  hotSlot: 0,
  overflow: {},
  kills: 0,
};
Object.defineProperty(state, "tools", {
  get: () => [
    ...new Set(
      state.inventory
        .filter(Boolean)
        .map((s) => s.id)
        .filter((id) => TOOL_IDS.includes(id)),
    ),
  ],
});
const player = {
  position: new THREE.Vector3(3, heightAt(3, 17) + 1.7, 17),
  yaw: 0,
  pitch: 0,
  vy: 0,
  grounded: true,
};
let selected = "hands",
  blueprint = null,
  rotation = 0,
  target = null,
  buildPoint = null,
  played = false,
  dead = false,
  resetting = false,
  panel = null,
  tab = "tools",
  openChest = null,
  hitUntil = 0,
  swing = 0,
  saveTimer = 0,
  animalTimer = 0,
  shadowTimer = 0,
  mapTimer = 0,
  hurtUntil = 0,
  lowGraphics = false;
const keys = new Set(),
  ray = new THREE.Raycaster(),
  look = new THREE.Vector3(),
  box = new THREE.BoxGeometry(1, 1, 1);
const ghost = mesh(
  box,
  new THREE.MeshBasicMaterial({
    color: "#d6e4ab",
    transparent: true,
    opacity: 0.32,
    wireframe: true,
  }),
);
ghost.visible = false;
ghost.castShadow = false;
const hand = new THREE.Group();
camera.add(hand);
scene.add(camera);
function handModel() {
  hand.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose();
      object.material.dispose();
    }
  });
  hand.clear();
  const skin = mats.skin;
  const bare = selected === "hands";
  if (bare) {
    const arm = mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 0.46, 8),
      skin,
      0.31,
      -0.37,
      -0.38,
      hand,
    );
    arm.rotation.x = -0.7;
    mesh(new THREE.SphereGeometry(0.105, 8, 6), skin, 0.31, -0.19, -0.52, hand);
  } else if (["axe", "ironAxe", "pickaxe", "spear"].includes(selected)) {
    const handle = mesh(
      new THREE.CylinderGeometry(
        0.027,
        0.041,
        selected === "spear" ? 1.2 : 0.7,
        7,
      ),
      mats.bark,
      0.3,
      -0.32,
      -0.5,
      hand,
    );
    handle.rotation.z = -0.24;
    mesh(new THREE.SphereGeometry(0.08, 8, 6), skin, 0.33, -0.37, -0.48, hand);
    if (selected === "spear")
      mesh(
        new THREE.ConeGeometry(0.065, 0.3, 6),
        mats.rock,
        0.16,
        0.39,
        -0.5,
        hand,
      );
    else if (selected === "pickaxe") {
      const head = mesh(
        new THREE.ConeGeometry(0.09, 0.5, 5),
        mats.rock,
        0.18,
        0,
        -0.5,
        hand,
      );
      head.rotation.z = Math.PI / 2;
    } else {
      const head = mesh(
        new THREE.DodecahedronGeometry(0.16, 0),
        selected === "ironAxe"
          ? new THREE.MeshStandardMaterial({
              color: "#aab6b3",
              metalness: 0.8,
              roughness: 0.3,
            })
          : mats.rock,
        0.16,
        0,
        -0.5,
        hand,
      );
      head.scale.set(1.3, 1, 0.4);
    }
  }
  hand.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.material = o.material.clone();
      o.material.depthTest = false;
      o.renderOrder = 20;
    }
  });
}

let movingSlot = null;
const itemName = (id) => items[id]?.name || resourceNames[id] || id;
function slotHTML(slot, index, hotbar = false) {
  return `<button class="inventory-slot ${hotbar && state.hotSlot === index - HOTBAR_START ? "active" : ""} ${movingSlot === index ? "moving" : ""}" data-slot="${index}" draggable="${!!slot}" title="${slot ? itemName(slot.id) + " · " + slot.count : "Tom plats"}">${hotbar ? `<span class="number">${index - HOTBAR_START + 1}</span>` : ""}${slot ? `<span class="item-icon item-${slot.id}">${icons[slot.id] || "◆"}</span>${slot.count > 1 ? `<b class="stack-count">${slot.count}</b>` : ""}` : ""}</button>`;
}
function renderHotbar() {
  $("hotbar").innerHTML = state.inventory
    .slice(HOTBAR_START)
    .map((slot, i) => slotHTML(slot, i + HOTBAR_START, true))
    .join("");
}
function select(index) {
  state.hotSlot = index;
  updateEquipped();
  renderHotbar();
}
function updateEquipped() {
  const id = state.inventory[HOTBAR_START + state.hotSlot]?.id || "hands";
  const changed = selected !== id;
  selected = id;
  blueprint = items[id]?.build ? id : null;
  $("buildHint").classList.toggle("hidden", !blueprint);
  if (changed) handModel();
}
function receive(output) {
  const result = collect(state.inventory, output);
  if (result.ok) {
    updateEquipped();
    renderHotbar();
  } else notice(result.reason);
  return result.ok;
}
function equipNewItem(id) {
  const source = state.inventory.findIndex((s) => s?.id === id);
  if (source < 0) return;
  let target =
    source >= HOTBAR_START
      ? source
      : state.inventory.findIndex((s, i) => i >= HOTBAR_START && !s);
  if (target < 0) return;
  if (target !== source) moveSlot(state.inventory, source, target);
  select(target - HOTBAR_START);
}
function renderBag() {
  $("bag").innerHTML = state.inventory
    .map((slot, i) => slotHTML(slot, i, i >= HOTBAR_START))
    .join("");
  $("bagCapacity").textContent =
    `${state.inventory.filter(Boolean).length} / 27 platser`;
  const pending = Object.values(state.overflow).reduce((a, n) => a + n, 0);
  $("recoverItems").classList.toggle("hidden", !pending);
  $("recoverItems").textContent = `Hämta tidigare sparade föremål (${pending})`;
}
function inventoryClick(e) {
  const slot = e.target.closest("[data-slot]");
  if (!slot) return;
  const index = +slot.dataset.slot;
  if (e.shiftKey) {
    if (state.inventory[index]) {
      const target = state.inventory.findIndex(
        (s, i) =>
          !s && (index < HOTBAR_START ? i >= HOTBAR_START : i < HOTBAR_START),
      );
      if (target >= 0) moveSlot(state.inventory, index, target);
    }
    movingSlot = null;
  } else if (movingSlot === null) {
    if (state.inventory[index]) movingSlot = index;
  } else {
    moveSlot(state.inventory, movingSlot, index);
    movingSlot = null;
  }
  updateEquipped();
  renderCrafting();
  renderHotbar();
  save();
}
$("bag").onclick = inventoryClick;
$("bag").ondragstart = (e) => {
  const slot = e.target.closest("[data-slot]");
  if (slot && state.inventory[+slot.dataset.slot]) {
    movingSlot = +slot.dataset.slot;
    e.dataTransfer.setData("text/plain", slot.dataset.slot);
  }
};
$("bag").ondragover = (e) => e.preventDefault();
$("bag").ondrop = (e) => {
  e.preventDefault();
  const target = e.target.closest("[data-slot]");
  if (target && movingSlot !== null) {
    moveSlot(state.inventory, movingSlot, +target.dataset.slot);
    movingSlot = null;
    updateEquipped();
    renderCrafting();
    renderHotbar();
    save();
  }
};
$("recoverItems").onclick = () => {
  for (const [id, n] of Object.entries(state.overflow)) {
    const left = addItems(state.inventory, id, n);
    if (left) state.overflow[id] = left;
    else delete state.overflow[id];
  }
  updateEquipped();
  renderHotbar();
  renderCrafting();
  save();
};
function notice(text) {
  $("notice").textContent = text;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => ($("notice").textContent = ""), 3600);
}
function active() {
  return document.pointerLockElement === renderer.domElement && !dead && !panel;
}
function lock() {
  if (dead) return;
  renderer.domElement
    .requestPointerLock()
    ?.catch(() => notice("Klicka på Fortsätt för att fånga muspekaren."));
}
function closePanels(resume = true) {
  for (const id of ["crafting", "help", "storage"])
    $(id).classList.add("hidden");
  panel = null;
  openChest = null;
  if (resume) lock();
  else $("menu").classList.remove("hidden");
}
function openPanel(id) {
  if (dead) return;
  closePanels(false);
  panel = id;
  $(id).classList.remove("hidden");
  $("menu").classList.add("hidden");
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  if (id === "crafting") renderCrafting();
}
function nearbyStations() {
  return [
    ...new Set(
      buildings
        .filter((b) => b.group.position.distanceTo(player.position) < 7)
        .map((b) => b.type),
    ),
  ];
}
function renderCrafting() {
  const inv = state.inventory,
    stations = nearbyStations();
  renderBag();
  $("stationStatus").textContent = stations.length
    ? "Nära: " +
      [...new Set(stations)]
        .map((id) => items[id]?.name)
        .filter(Boolean)
        .join(" · ")
    : "Handtillverkning — placera stationer för att låsa upp fler recept.";
  document
    .querySelectorAll("#craftTabs button")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("recipes").innerHTML = Object.entries(items)
    .filter(([, item]) =>
      tab === "tools"
        ? item.tool
        : tab === "build"
          ? item.build
          : !!item.output,
    )
    .map(([id, item]) => {
      const status = craftStatus(inv, state.tools, id, stations);
      return `<article class="recipe ${status.ok ? "available" : ""}"><div class="recipe-heading"><span>${item.icon}</span><h3>${item.name}</h3></div><p>${item.description}</p><div class="recipe-cost">${Object.entries(
        item.cost,
      )
        .map(
          ([key, n]) =>
            `<span class="${count(inv, key) >= n ? "enough" : "missing"}">${count(inv, key)}/${n} ${key === "wood" ? "trä" : key === "stone" ? "sten" : resourceNames[key]}</span>`,
        )
        .join(
          "",
        )}</div><button data-recipe="${id}" ${status.ok ? "" : "disabled"}>${status.ok ? "Tillverka" : status.reason}</button></article>`;
    })
    .join("");
}
function chooseRecipe(id) {
  const item = items[id],
    status = craftStatus(state.inventory, state.tools, id, nearbyStations());
  if (!status.ok) {
    notice(status.reason);
    return;
  }
  makeItem(state.inventory, state.tools, id, nearbyStations());
  notice(`${item.name} tillverkad.`);
  if (item.tool || item.build) equipNewItem(id);
  updateEquipped();
  renderHotbar();
  renderCrafting();
  save();
}
$("recipes").onclick = (e) => {
  const button = e.target.closest("[data-recipe]");
  if (button && !button.disabled) chooseRecipe(button.dataset.recipe);
};
$("craftTabs").onclick = (e) => {
  if (e.target.dataset.tab) {
    tab = e.target.dataset.tab;
    renderCrafting();
  }
};
function addBuilding(type, x, y, z, rot = 0, extra = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rot;
  scene.add(group);
  const board = (w, h, d, px, py, pz, mat = mats.wood) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, px, py, pz, group);
  if (type === "wall" || type === "door") {
    for (const sx of [-0.98, 0.98]) {
      const post = mesh(
        new THREE.CylinderGeometry(0.09, 0.13, 2.6, 7),
        mats.bark,
        sx,
        1.3,
        0,
        group,
      );
    }
    if (type === "wall") {
      for (let i = 0; i < 7; i++)
        board(0.28, 2.5, 0.13, -0.87 + i * 0.29, 1.3, 0);
      for (const h of [0.3, 2.2]) board(2.2, 0.1, 0.18, 0, h, 0.07);
    } else {
      board(2.1, 0.15, 0.23, 0, 2.58, 0);
      const door = new THREE.Group();
      door.position.set(-0.88, 0.05, 0);
      group.add(door);
      for (let i = 0; i < 6; i++) {
        const plank = mesh(
          new THREE.BoxGeometry(0.29, 2.3, 0.12),
          mats.wood,
          i * 0.29,
          1.2,
          0,
          door,
        );
      }
      mesh(
        new THREE.SphereGeometry(0.06, 7, 5),
        mats.rock,
        1.5,
        1.2,
        0.12,
        door,
      );
      group.userData.door = door;
    }
  }
  if (type === "floor") {
    for (let i = 0; i < 8; i++) board(0.25, 0.18, 2, -0.88 + i * 0.25, 0.13, 0);
    for (const sx of [-0.8, 0.8]) board(0.15, 0.3, 2, sx, -0.05, 0, mats.bark);
  }
  if (type === "roof") {
    for (const sign of [-1, 1]) {
      const r = board(1.4, 0.18, 2.3, sign * 0.5, 2.75, 0, mats.leaves);
      r.rotation.z = sign * -0.48;
    }
  }
  if (type === "fire") {
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      mesh(
        new THREE.DodecahedronGeometry(0.18, 0),
        mats.rock,
        Math.cos(a) * 0.6,
        0.13,
        Math.sin(a) * 0.6,
        group,
      );
    }
    for (let i = 0; i < 3; i++) {
      const log = mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 1.1, 7),
        mats.bark,
        0,
        0.18,
        0,
        group,
      );
      log.rotation.set(Math.PI / 2, 0, i * 1.1);
    }
    const flames = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const f = mesh(
        new THREE.ConeGeometry(0.22 - i * 0.045, 0.8 - i * 0.1, 6),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? "#f79f3a" : "#ffe29c",
          transparent: true,
          opacity: 0.85,
        }),
        Math.sin(i * 2) * 0.12,
        0.55 + i * 0.1,
        0,
        flames,
      );
      f.castShadow = false;
    }
    group.add(flames);
    group.userData.flame = flames;
    const light = new THREE.PointLight("#ffb861", 9, 12, 2);
    light.position.y = 1;
    group.add(light);
    group.userData.light = light;
    const smoke = mesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshBasicMaterial({
        color: "#c2c2b8",
        transparent: true,
        opacity: 0.25,
      }),
      0,
      1.8,
      0,
      group,
    );
    smoke.castShadow = false;
    group.userData.smoke = smoke;
  }
  if (type === "bench") {
    board(2, 0.15, 0.85, 0, 1, 0);
    for (const x of [-0.8, 0.8])
      for (const z of [-0.28, 0.28]) board(0.13, 1, 0.13, x, 0.5, z, mats.bark);
    board(0.5, 0.06, 0.4, -0.4, 1.12, 0, mats.bark);
    mesh(new THREE.DodecahedronGeometry(0.15), mats.rock, 0.45, 1.2, 0, group);
  }
  if (type === "furnace") {
    mesh(
      new THREE.CylinderGeometry(0.6, 0.78, 1.4, 9),
      mats.rock,
      0,
      0.7,
      0,
      group,
    );
    mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 1, 8),
      mats.rock,
      0,
      1.7,
      0,
      group,
    );
    board(
      0.5,
      0.45,
      0.04,
      0,
      0.48,
      0.65,
      new THREE.MeshStandardMaterial({ color: "#302821" }),
    );
    const glow = new THREE.PointLight("#ff8f45", 1, 4);
    glow.position.set(0, 0.5, 0.7);
    group.add(glow);
  }
  if (type === "chest") {
    board(1.35, 0.7, 0.8, 0, 0.4, 0);
    const lid = board(1.43, 0.15, 0.87, 0, 0.82, 0);
    for (const x of [-0.4, 0.4]) board(0.08, 0.85, 0.84, x, 0.45, 0, mats.bark);
    board(0.15, 0.2, 0.03, 0, 0.65, 0.44, mats.rock);
  }
  if (type === "bed") {
    board(1.3, 0.16, 2, 0, 0.15, 0, mats.bark);
    for (let i = 0; i < 6; i++)
      board(0.21, 0.16, 1.8, -0.52 + i * 0.21, 0.3, 0, mats.leaves);
    board(0.8, 0.14, 0.4, 0, 0.4, -0.6, mats.sand);
  }
  const converted = normalizeInventory(extra.inventory);
  const b = {
    type,
    x,
    y,
    z,
    rot,
    group,
    open: !!extra.open,
    inventory: converted.slots,
    overflow: { ...extra.overflow, ...converted.overflow },
  };
  if (group.userData.door)
    group.userData.door.rotation.y = b.open ? -Math.PI / 2 : 0;
  group.traverse((o) => {
    if (o.isMesh) o.userData.building = b;
  });
  buildings.push(b);
  renderer.shadowMap.needsUpdate = true;
  return b;
}
function save() {
  if (dead || resetting) return;
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 3,
        state,
        position: player.position.toArray(),
        yaw: player.yaw,
        selected,
        buildings: buildings.map(
          ({ type, x, y, z, rot, open, inventory, overflow }) => ({
            type,
            x,
            y,
            z,
            rot,
            open,
            inventory,
            overflow,
          }),
        ),
        resourceDamage: resources
          .filter((r) => r.alive && r.hp < r.maxHp)
          .map((r) => ({ id: r.id, hp: r.hp })),
        depleted: resources
          .filter((r) => !r.alive)
          .map((r) => ({ id: r.id, respawnAt: r.respawnAt })),
      }),
    );
    $("saveStatus").textContent = "◈ SPARAT PÅ DEN HÄR ENHETEN";
  } catch {
    $("saveStatus").textContent = "⚠ SPARNING EJ TILLGÄNGLIG";
  }
}
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (
    [2, 3].includes(saved?.version) &&
    saved.position?.length === 3 &&
    saved.position.every(Number.isFinite)
  ) {
    const old = saved.state;
    for (const k of ["health", "hunger", "thirst", "stamina"])
      state[k] = THREE.MathUtils.clamp(Number(old[k]) || 0, 0, 100);
    state.time = Number(old.time) || 0.32;
    state.day = Math.max(1, Number(old.day) || 1);
    state.elapsed = Math.max(0, Number(old.elapsed) || 0);
    state.kills = Number(old.kills) || 0;
    const migrated = normalizeInventory(old.inventory, old.tools || []);
    state.inventory = migrated.slots;
    state.overflow = { ...old.overflow, ...migrated.overflow };
    state.hotSlot = Number.isInteger(old.hotSlot)
      ? THREE.MathUtils.clamp(old.hotSlot, 0, 8)
      : 0;
    player.position.fromArray(saved.position);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -65, 65);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -65, 65);
    player.position.y = Math.max(
      player.position.y,
      heightAt(player.position.x, player.position.z) + 1.7,
    );
    player.yaw = Number(saved.yaw) || 0;
    for (const b of saved.buildings || [])
      if (items[b.type]?.build && [b.x, b.y, b.z, b.rot].every(Number.isFinite))
        addBuilding(b.type, b.x, b.y, b.z, b.rot, b);
    for (const d of saved.resourceDamage || []) {
      const r = resources.find((r) => r.id === d.id);
      if (r && Number.isFinite(d.hp))
        r.hp = THREE.MathUtils.clamp(d.hp, 1, r.maxHp);
    }
    for (const d of saved.depleted || []) {
      const r = resources.find((r) => r.id === d.id);
      if (r && d.respawnAt > state.elapsed) {
        r.alive = false;
        r.respawnAt = d.respawnAt;
        r.group.visible = false;
      }
    }
    updateEquipped();
    $("play").innerHTML = "FORTSÄTT ÖVERLEVA <span>↗</span>";
  }
} catch {
  notice("En ny överlevnad börjar.");
}
handModel();
renderHotbar();
function reset() {
  resetting = true;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}
$("reset").onclick = () => {
  reset();
};
$("respawn").onclick = reset;
$("play").onclick = lock;
$("helpBtn").onclick = () => openPanel("help");
$("closeHelp").onclick = () => closePanels();
$("closeCraft").onclick = () => closePanels();
$("closeStorage").onclick = () => closePanels();
$("quality").onclick = () => {
  lowGraphics = !lowGraphics;
  renderer.setPixelRatio(lowGraphics ? 1 : Math.min(devicePixelRatio, 1.35));
  renderer.shadowMap.enabled = !lowGraphics;
  renderer.shadowMap.needsUpdate = true;
  $("quality").textContent =
    `Grafik: ${lowGraphics ? "låg (snabbare)" : "balanserad"}`;
};
document.addEventListener("pointerlockchange", () => {
  keys.clear();
  if (document.pointerLockElement === renderer.domElement) {
    played = true;
    $("menu").classList.add("hidden");
  } else if (!panel && !dead) {
    $("menu").classList.remove("hidden");
    $("play").innerHTML = "FORTSÄTT ÖVERLEVA <span>↗</span>";
    save();
  }
});
renderer.domElement.onclick = () => {
  if (!active() && !panel && !dead) lock();
};
addEventListener("keydown", (e) => {
  if (["Space", "Tab"].includes(e.code)) e.preventDefault();
  if (e.code === "KeyE" && !e.repeat) {
    if (panel === "crafting") closePanels();
    else if (played) openPanel("crafting");
    return;
  }
  if (e.code === "KeyH" && !e.repeat) {
    if (panel === "help") closePanels();
    else openPanel("help");
    return;
  }
  if (panel) {
    if (e.code === "Escape") closePanels(false);
    return;
  }
  if (!active()) return;
  keys.add(e.code);
  if (/^Digit[1-9]$/.test(e.code)) select(+e.code.slice(-1) - 1);
  if (e.code === "KeyF" && !e.repeat) interact();
  if (e.code === "KeyT" && !e.repeat) rotation += Math.PI / 2;
  if (e.code === "KeyB" && !e.repeat) {
    tab = "build";
    openPanel("crafting");
  }
  if (e.code === "KeyM" && !e.repeat) $("minimap").classList.toggle("hidden");
  if (e.code === "Space" && player.grounded) {
    player.vy = 6.5;
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
      -1.45,
      1.45,
    );
  }
});
addEventListener("mousedown", (e) => {
  if (e.button === 0 && active()) use();
  if (e.button === 2 && active()) eat();
});
addEventListener("contextmenu", (e) => e.preventDefault());
function updateTarget() {
  camera.getWorldDirection(look);
  ray.set(camera.position, look);
  ray.far = 4.5;
  const objects = [
    ...resources.filter((r) => r.alive).map((r) => r.group),
    ...buildings.map((b) => b.group),
    ...animals.filter((a) => a.hp > 0).map((a) => a.group),
  ];
  const hit = ray.intersectObjects(objects, true)[0];
  target = hit
    ? {
        resource: hit.object.userData.resource,
        building: hit.object.userData.building,
        animal: hit.object.userData.animal,
      }
    : null;
  let text = "";
  if (target?.resource) {
    const r = target.resource;
    const rule = r.pickup
      ? { allowed: true }
      : gatherRule(r.kind, selected, r.variant);
    text = r.pickup
      ? `[F] Plocka ${resourceNames[r.kind]}`
      : rule.allowed
        ? `[KLICK] ${variants[r.variant]?.name || resourceNames[r.kind]} · ${r.hp}/${r.maxHp}`
        : rule.reason;
  } else if (target?.building) {
    const b = target.building;
    text = `[F] ${b.type === "door" ? (b.open ? "Stäng dörr" : "Öppna dörr") : b.type === "water" ? "Drick sötvatten" : b.type === "bed" ? "Sov till morgonen" : items[b.type].name}`;
  } else if (target?.animal)
    text =
      target.animal.kind === "deer"
        ? "Hjort · jaga med spjut"
        : "Varg · försvara dig";
  if (!target && Math.hypot(player.position.x + 12, player.position.z - 8) < 8)
    text = "[F] Drick sötvatten";
  buildPoint = null;
  ghost.visible = false;
  if (blueprint) {
    for (let t = 1.5; t <= 6; t += 0.12) {
      const p = camera.position.clone().addScaledVector(look, t);
      if (p.y <= heightAt(p.x, p.z) + 0.15) {
        let x = Math.round(p.x / 2) * 2;
        let z = Math.round(p.z / 2) * 2;
        // A cell directly underfoot is not a useful placement. Preview the next
        // cell in the viewing direction so near-ground aiming still feels natural.
        if (Math.hypot(x - player.position.x, z - player.position.z) <= 1.5) {
          if (Math.abs(look.x) > Math.abs(look.z)) x += Math.sign(look.x) * 2;
          else z += Math.sign(look.z) * 2;
        }
        const y = heightAt(x, z);
        if (
          y > 1.8 &&
          Math.hypot(x - player.position.x, z - player.position.z) > 1.5 &&
          Math.hypot(x + 12, z - 8) > 5.5
        ) {
          buildPoint = { x, y, z };
          const wall = ["wall", "door"].includes(blueprint);
          ghost.position.set(
            x,
            y + (wall ? 1.3 : blueprint === "roof" ? 2.8 : 0.5),
            z,
          );
          ghost.scale.set(
            2,
            wall ? 2.6 : blueprint === "roof" ? 0.4 : 1,
            wall ? 0.2 : 2,
          );
          ghost.rotation.y = rotation;
          ghost.visible = true;
          ghost.material.color.set(
            count(state.inventory, blueprint) > 0 ? "#b7e0b6" : "#e98c73",
          );
        }
        break;
      }
    }
    text = buildPoint
      ? `${items[blueprint].name} · KLICK placera · T rotera`
      : "Sikta på torr mark 2–6 meter framför dig";
  }
  $("target").textContent = text;
}
function gather() {
  if (performance.now() < hitUntil) return;
  const r = target?.resource;
  if (!r) return;
  const rule = r.pickup
    ? { allowed: true, damage: 1, amount: r.kind === "leaves" ? 2 : 1 }
    : gatherRule(r.kind, selected, r.variant);
  if (!rule.allowed) {
    notice(rule.reason);
    return;
  }
  hitUntil =
    performance.now() + (r.pickup ? 180 : selected === "hands" ? 600 : 400);
  swing = 1;
  if (r.hp <= rule.damage && !receive({ [rule.drop || r.kind]: rule.amount }))
    return;
  r.hp -= rule.damage;
  r.group.rotation.z = 0.035;
  setTimeout(() => (r.group.rotation.z = 0), 110);
  if (r.hp <= 0) {
    r.alive = false;
    r.group.visible = false;
    r.respawnAt =
      state.elapsed +
      (r.pickup
        ? 220
        : r.kind === "berries" || r.kind === "leaves"
          ? 160
          : 650);
    renderer.shadowMap.needsUpdate = true;
    notice(`+${rule.amount} ${resourceNames[rule.drop || r.kind]}`);
    save();
    target = null;
  }
}
function interact() {
  if (blueprint) return;
  if (target?.resource) {
    if (
      target.resource.pickup ||
      ["leaves", "berries"].includes(target.resource.kind)
    )
      gather();
    else notice("Använd vänsterklick med rätt verktyg.");
    return;
  }
  if (target?.building) {
    const b = target.building;
    if (b.type === "door") {
      b.open = !b.open;
      b.group.userData.door.rotation.y = b.open ? -Math.PI / 2 : 0;
      renderer.shadowMap.needsUpdate = true;
      save();
      return;
    }
    if (b.type === "chest") {
      openPanel("storage");
      openChest = b;
      renderStorage();
      return;
    }
    if (b.type === "bed") {
      if (
        animals.some(
          (a) =>
            a.kind === "wolf" &&
            a.group.position.distanceTo(player.position) < 15,
        )
      ) {
        notice("En varg är för nära. Gör lägret tryggt först.");
        return;
      }
      if (state.time > 0.23 && state.time < 0.72) {
        notice("Du kan sova på kvällen och natten.");
        return;
      }
      state.time = 0.3;
      state.day++;
      state.hunger = Math.max(5, state.hunger - 14);
      state.thirst = Math.max(5, state.thirst - 18);
      state.health = Math.min(100, state.health + 25);
      animals
        .filter((a) => a.kind === "wolf")
        .forEach((a) => {
          scene.remove(a.group);
          a.hp = 0;
        });
      notice("Du vaknar till en ny morgon.");
      save();
      return;
    }
    if (["bench", "furnace", "fire"].includes(b.type)) {
      tab = b.type === "bench" ? "tools" : "food";
      openPanel("crafting");
      return;
    }
  }
  if (Math.hypot(player.position.x + 12, player.position.z - 8) < 8) {
    state.thirst = 100;
    notice("Svalt sötvatten. Törsten är släckt.");
    save();
  }
}
function eat() {
  const slot = state.inventory[HOTBAR_START + state.hotSlot];
  if (!slot || !["berries", "meat"].includes(slot.id)) {
    notice("Lägg bär eller stekt kött i hotbaren och högerklicka för att äta.");
    return;
  }
  const meat = slot.id === "meat";
  removeItems(state.inventory, slot.id, 1);
  state.hunger = Math.min(100, state.hunger + (meat ? 48 : 16));
  state.health = Math.min(100, state.health + (meat ? 8 : 0));
  if (!meat) state.thirst = Math.min(100, state.thirst + 5);
  notice(meat ? "Stekt kött · +48 mättnad" : "Bär · +16 mättnad");
  updateEquipped();
  renderHotbar();
  save();
}
function renderStorage() {
  const ids = [
    ...new Set([
      ...[...state.inventory, ...openChest.inventory]
        .filter(Boolean)
        .map((s) => s.id),
      ...Object.keys(openChest.overflow || {}),
    ]),
  ];
  $("storageRows").innerHTML =
    ids
      .map(
        (id) =>
          `<div class="storage-row"><span>${itemName(id)}</span><button data-transfer="deposit" data-key="${id}" ${exactCount(state.inventory, id) ? "" : "disabled"}>Packning ${exactCount(state.inventory, id)} →</button><button data-transfer="take" data-key="${id}" ${exactCount(openChest.inventory, id) + (openChest.overflow?.[id] || 0) ? "" : "disabled"}>← Kista ${exactCount(openChest.inventory, id) + (openChest.overflow?.[id] || 0)}</button></div>`,
      )
      .join("") || "<p>Kistan och packningen är tomma.</p>";
}
$("storageRows").onclick = (e) => {
  const b = e.target.closest("[data-transfer]");
  if (!b || b.disabled || !openChest) return;
  const from =
      b.dataset.transfer === "deposit" ? state.inventory : openChest.inventory,
    to =
      b.dataset.transfer === "deposit" ? openChest.inventory : state.inventory,
    id = b.dataset.key;
  const withdrawing = b.dataset.transfer === "take";
  const exact =
    exactCount(from, id) + (withdrawing ? openChest.overflow[id] || 0 : 0);
  let moved = 0;
  while (moved < exact) {
    const result = collect(to, { [id]: 1 });
    if (!result.ok) break;
    if (withdrawing && exactCount(from, id) === 0) {
      openChest.overflow[id]--;
      if (!openChest.overflow[id]) delete openChest.overflow[id];
    } else removeItems(from, id, 1, true);
    moved++;
  }
  if (moved < exact) notice("Ingen mer plats. Resten ligger kvar.");
  updateEquipped();
  renderHotbar();
  renderStorage();
  save();
};
function use() {
  if (performance.now() < hitUntil) return;
  if (blueprint) {
    if (!buildPoint) {
      notice("Sikta på torr mark en bit framför dig.");
      return;
    }
    const { x, y, z } = buildPoint;
    if (
      buildings.some(
        (b) =>
          b.type === blueprint &&
          b.x === x &&
          b.z === z &&
          b.rot % Math.PI === rotation % Math.PI,
      )
    ) {
      notice("Här finns redan ett sådant bygge.");
      return;
    }
    const placed = blueprint;
    if (!removeItems(state.inventory, placed, 1)) {
      notice("Tillverka byggdelen först.");
      return;
    }
    addBuilding(placed, x, y, z, rotation);
    notice(`${items[placed].name} byggd.`);
    updateEquipped();
    renderHotbar();
    hitUntil = performance.now() + 300;
    save();
    return;
  }
  if (target?.animal) {
    const a = target.animal,
      distance = a.group.position.distanceTo(player.position);
    if (distance > (selected === "spear" ? 4.6 : 2.7)) {
      notice("Gå närmare för att träffa.");
      return;
    }
    a.hp -=
      selected === "spear"
        ? 48
        : selected === "ironAxe"
          ? 35
          : selected === "axe"
            ? 24
            : 8;
    a.fleeUntil = state.elapsed + 8;
    swing = 1;
    hitUntil = performance.now() + 450;
    if (a.hp <= 0) {
      if (!receive({ rawMeat: a.kind === "deer" ? 3 : 2 })) {
        a.hp = 1;
        notice("Inventariet är fullt — frigör plats för jaktbytet.");
        return;
      }
      scene.remove(a.group);
      state.kills++;
      notice("Jaktbyte · rått kött. Stek köttet vid en eld.");
      save();
    } else notice(a.kind === "wolf" ? "Vargen är skadad." : "Hjorten flyr!");
    return;
  }
  if (target?.resource) gather();
  else {
    swing = 1;
    hitUntil = performance.now() + 400;
  }
}
function spawnAnimal(kind, x, z) {
  if (heightAt(x, z) < 2.3) return;
  const group = new THREE.Group();
  group.position.set(x, heightAt(x, z), z);
  scene.add(group);
  const fur = new THREE.MeshStandardMaterial({
    color: kind === "wolf" ? "#73786e" : "#9c7650",
    roughness: 1,
  });
  const ellipsoid = (sx, sy, sz, px, py, pz, material = fur) => {
    const m = mesh(
      new THREE.SphereGeometry(1, 9, 7),
      material,
      px,
      py,
      pz,
      group,
    );
    m.scale.set(sx, sy, sz);
    return m;
  };
  ellipsoid(0.36, 0.44, 0.74, 0, 0.9, 0);
  ellipsoid(0.24, 0.32, 0.3, 0, kind === "wolf" ? 1.15 : 1.55, -0.7);
  ellipsoid(0.15, 0.13, 0.27, 0, kind === "wolf" ? 1.06 : 1.48, -0.95);
  if (kind === "deer") {
    const neck = mesh(
      new THREE.CylinderGeometry(0.16, 0.23, 0.8, 7),
      fur,
      0,
      1.22,
      -0.55,
      group,
    );
    neck.rotation.x = -0.3;
    for (const sx of [-0.16, 0.16]) {
      const antler = mesh(
        new THREE.CylinderGeometry(0.025, 0.045, 0.55, 5),
        mats.bark,
        sx,
        1.99,
        -0.72,
        group,
      );
      antler.rotation.z = -sx * 1.5;
    }
  }
  for (const sx of [-0.22, 0.22]) {
    const ear = mesh(
      new THREE.ConeGeometry(0.12, 0.3, 5),
      fur,
      sx,
      kind === "wolf" ? 1.55 : 1.88,
      -0.73,
      group,
    );
    ear.rotation.z = sx * 1.5;
    ellipsoid(
      0.035,
      0.035,
      0.02,
      sx,
      kind === "wolf" ? 1.2 : 1.58,
      -0.93,
      new THREE.MeshBasicMaterial({
        color: kind === "wolf" ? "#e6c674" : "#28251e",
      }),
    );
  }
  const legs = [];
  for (const sx of [-0.23, 0.23])
    for (const sz of [-0.45, 0.45]) {
      const leg = mesh(
        new THREE.CylinderGeometry(0.055, 0.075, 0.7, 6),
        fur,
        sx,
        0.37,
        sz,
        group,
      );
      legs.push(leg);
    }
  const tail = mesh(
    new THREE.ConeGeometry(0.13, 0.6, 6),
    fur,
    0,
    1.02,
    0.8,
    group,
  );
  tail.rotation.x = -1;
  const animal = {
    kind,
    group,
    legs,
    hp: kind === "wolf" ? 100 : 80,
    direction: rand() * 6,
    turnAt: 0,
    cooldown: 0,
    fleeUntil: 0,
  };
  group.traverse((o) => {
    if (o.isMesh) o.userData.animal = animal;
  });
  animals.push(animal);
}
for (const p of [
  [14, 4],
  [24, -8],
  [-20, -18],
  [-25, 23],
  [18, 24],
  [5, -23],
])
  spawnAnimal("deer", ...p);
function blocked(x, z, animal = false) {
  if (Math.hypot(x, z) > WORLD_RADIUS - 4) return true;
  for (const b of buildings) {
    if (
      !["wall", "door", "chest", "bench", "furnace"].includes(b.type) ||
      (b.type === "door" && b.open)
    )
      continue;
    const dx = x - b.x,
      dz = z - b.z,
      c = Math.cos(b.rot),
      s = Math.sin(b.rot),
      wall = ["wall", "door"].includes(b.type);
    if (
      Math.abs(c * dx - s * dz) < (wall ? 1.22 : 0.85) &&
      Math.abs(s * dx + c * dz) < (wall ? 0.43 : 0.65) &&
      (animal || player.position.y < b.y + 3.9)
    )
      return true;
  }
  for (const r of resources)
    if (r.alive && !r.pickup && ["wood", "stone", "ore"].includes(r.kind)) {
      const radius = r.collisionRadius || (r.kind === "wood" ? 0.55 : 1.1);
      if (Math.hypot(x - r.group.position.x, z - r.group.position.z) < radius)
        return true;
    }
  return false;
}
function damage(amount, message) {
  state.health = Math.max(0, state.health - amount);
  hurtUntil = performance.now() + 500;
  if (message) notice(message);
  if (state.health <= 0 && !dead) {
    dead = true;
    localStorage.removeItem(SAVE_KEY);
    if (document.pointerLockElement) document.exitPointerLock();
    $("menu").classList.add("hidden");
    $("death").classList.remove("hidden");
    $("deathText").textContent =
      `Du överlevde till dag ${state.day}, byggde ${buildings.length} delar och tillverkade ${state.tools.length} verktyg.`;
  }
}
function simulate(dt, t) {
  const moving =
      keys.has("KeyW") ||
      keys.has("KeyS") ||
      keys.has("KeyA") ||
      keys.has("KeyD"),
    sprint = moving && keys.has("KeyR") && state.stamina > 3;
  state.stamina = THREE.MathUtils.clamp(
    state.stamina + (sprint ? -18 : 12) * dt,
    0,
    100,
  );
  const forward = +keys.has("KeyW") - +keys.has("KeyS"),
    side = +keys.has("KeyD") - +keys.has("KeyA"),
    n = Math.hypot(forward, side) || 1,
    speed = (sprint ? 6 : 3.5) * dt * (state.thirst <= 0 ? 0.65 : 1),
    dx =
      ((-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * side) / n) *
      speed,
    dz =
      ((-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * side) / n) *
      speed;
  if (
    !blocked(player.position.x + dx, player.position.z) &&
    heightAt(player.position.x + dx, player.position.z) <
      player.position.y - 0.55
  )
    player.position.x += dx;
  if (
    !blocked(player.position.x, player.position.z + dz) &&
    heightAt(player.position.x, player.position.z + dz) <
      player.position.y - 0.55
  )
    player.position.z += dz;
  player.vy -= 18 * dt;
  player.position.y += player.vy * dt;
  let ground = heightAt(player.position.x, player.position.z) + 1.7;
  for (const b of buildings)
    if (
      b.type === "floor" &&
      Math.abs(b.x - player.position.x) < 1 &&
      Math.abs(b.z - player.position.z) < 1
    )
      ground = Math.max(ground, b.y + 1.95);
  if (player.position.y <= ground) {
    if (player.vy < -12) damage(Math.min(40, (-player.vy - 12) * 3));
    player.position.y = ground;
    player.vy = 0;
    player.grounded = true;
  } else player.grounded = false;
  state.elapsed += dt;
  state.hunger = Math.max(0, state.hunger - dt * (sprint ? 0.16 : 0.1));
  state.thirst = Math.max(0, state.thirst - dt * (sprint ? 0.23 : 0.15));
  if (state.hunger <= 0 || state.thirst <= 0) damage(dt * 1.6);
  if (ground < 1.5) damage(dt * 3);
  const warmth = buildings.some(
    (b) =>
      b.type === "fire" && b.group.position.distanceTo(player.position) < 6,
  );
  if (warmth && state.hunger > 15 && state.thirst > 10)
    state.health = Math.min(100, state.health + dt * 1.1);
  state.time += dt / 600;
  if (state.time >= 1) {
    state.time -= 1;
    state.day++;
    notice(`Dag ${state.day} — ön vaknar igen.`);
  }
  const night = state.time > 0.76 || state.time < 0.21;
  animalTimer += dt;
  if (
    night &&
    animalTimer > 18 &&
    animals.filter((a) => a.kind === "wolf" && a.hp > 0).length < 4
  ) {
    const a = rand() * 6;
    spawnAnimal(
      "wolf",
      player.position.x + Math.cos(a) * 20,
      player.position.z + Math.sin(a) * 20,
    );
    animalTimer = 0;
  }
  for (const a of animals) {
    if (a.hp <= 0) continue;
    a.cooldown = Math.max(0, a.cooldown - dt);
    const delta = player.position.clone().sub(a.group.position);
    delta.y = 0;
    const distance = delta.length();
    const fearFire = buildings.some(
        (b) =>
          b.type === "fire" &&
          b.group.position.distanceTo(a.group.position) < 8,
      ),
      flee =
        a.kind === "deer"
          ? distance < 7 || a.fleeUntil > state.elapsed
          : fearFire || !night;
    let speed = 0,
      dir = new THREE.Vector3();
    if (flee) {
      dir.copy(delta).negate().normalize();
      speed = a.kind === "deer" ? 5 : 3.4;
    } else if (a.kind === "wolf") {
      dir.copy(delta).normalize();
      speed = distance > 1.8 ? 2.1 : 0;
    } else {
      if (state.elapsed > a.turnAt) {
        a.direction = rand() * 6;
        a.turnAt = state.elapsed + 3 + rand() * 5;
      }
      dir.set(Math.sin(a.direction), 0, Math.cos(a.direction));
      speed = 0.65;
    }
    const x = a.group.position.x + dir.x * dt * speed,
      z = a.group.position.z + dir.z * dt * speed;
    if (heightAt(x, z) > 2.3 && !blocked(x, z, true)) {
      a.group.position.set(x, heightAt(x, z), z);
      if (speed) a.group.rotation.y = Math.atan2(-dir.x, -dir.z);
    } else a.direction += 1;
    for (let i = 0; i < a.legs.length; i++)
      a.legs[i].rotation.x =
        Math.sin(t * speed * 3 + (i % 2) * Math.PI) *
        Math.min(0.55, speed * 0.15);
    if (a.kind === "wolf" && !flee && distance < 2 && a.cooldown === 0) {
      damage(
        11,
        "En varg attackerar! Använd ditt spjut och sök skydd vid elden.",
      );
      a.cooldown = 1.5;
    }
  }
  for (const r of resources)
    if (!r.alive && r.respawnAt <= state.elapsed) {
      r.alive = true;
      r.group.visible = true;
      r.hp = r.maxHp;
      renderer.shadowMap.needsUpdate = true;
    }
  saveTimer += dt;
  if (saveTimer > 10) {
    save();
    saveTimer = 0;
  }
}
function renderHUD() {
  for (const key of ["health", "hunger", "thirst", "stamina"]) {
    $(key + "Text").textContent = Math.ceil(state[key]);
    $(key + "Bar").style.width = `${state[key]}%`;
  }
  const minutes = Math.floor(state.time * 1440);
  $("clock").textContent =
    `DAG ${state.day} · ${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const headings = ["N", "NV", "V", "SV", "S", "SÖ", "Ö", "NÖ"];
  $("compass").textContent =
    headings[((Math.round(player.yaw / (Math.PI / 4)) % 8) + 8) % 8];
  $("coords").textContent =
    `STRANDAD / ${Math.round(player.position.x)} · ${Math.round(player.position.z)}`;
  $("biome").textContent =
    Math.hypot(player.position.x + 12, player.position.z - 8) < 10
      ? "Sötvattenskällan · E för att dricka"
      : player.position.z < -10
        ? "Norra tallskogen"
        : heightAt(player.position.x, player.position.z) < 3
          ? "Södra stranden"
          : "Lövskogen";
  const goals = [
    [
      "axe",
      "De första verktygen.",
      "Plocka grenar, småsten och löv. Tillverka en stenyxa [E].",
      state.tools.includes("axe"),
    ],
    [
      "pickaxe",
      "Från sten till möjligheter.",
      "Tillverka en stenhacka. Bryt sten och leta efter järnmalm.",
      state.tools.includes("pickaxe"),
    ],
    [
      "fire",
      "En plats i mörkret.",
      "Bygg en lägereld. Den ger värme, skydd och möjlighet att laga mat.",
      buildings.some((b) => b.type === "fire"),
    ],
    [
      "spear",
      "Lev av ön.",
      "Tillverka ett spjut, jaga en hjort och stek köttet vid elden.",
      state.tools.includes("spear") && state.kills > 0,
    ],
    [
      "bench",
      "Ett riktigt läger.",
      "Bygg en arbetsbänk och ett skydd med väggar och tak.",
      buildings.some((b) => b.type === "bench") &&
        buildings.some((b) => b.type === "roof"),
    ],
    [
      "furnace",
      "Tämj elden.",
      "Bygg en smältugn nära arbetsbänken. Smält malm till järn.",
      count(state.inventory, "metal") > 0 || state.tools.includes("ironAxe"),
    ],
    [
      "ironAxe",
      "En ny tidsålder.",
      "Tillverka en järnyxa vid arbetsbänken.",
      state.tools.includes("ironAxe"),
    ],
  ];
  const next = goals.find((g) => !g[3]);
  $("questTitle").textContent = next ? next[1] : "Ön är ditt hem.";
  $("quest").textContent = next
    ? next[2]
    : "Utöka ditt läger, fyll förråden och överlev nästa natt.";
  $("questStep").textContent =
    `ÖVERLEVNAD ${goals.filter((g) => g[3]).length} / ${goals.length}`;
  $("questProgress").style.width =
    `${(goals.filter((g) => g[3]).length / goals.length) * 100}%`;
}
const map = $("minimap"),
  ctx = map.getContext("2d"),
  mapBG = document.createElement("canvas");
mapBG.width = mapBG.height = 150;
const mctx = mapBG.getContext("2d");
for (let x = 0; x < 150; x += 2)
  for (let z = 0; z < 150; z += 2) {
    const h = heightAt(x - 75, z - 75);
    mctx.fillStyle =
      h < 0 ? "#3c6665" : h < 2 ? "#b4a47d" : h > 7 ? "#667652" : "#496a47";
    mctx.fillRect(x, z, 2, 2);
  }
function drawMap() {
  ctx.drawImage(mapBG, 0, 0);
  ctx.fillStyle = "#7fc2cc";
  ctx.beginPath();
  ctx.arc(63, 83, 5, 0, Math.PI * 2);
  ctx.fill();
  for (const b of buildings) {
    ctx.fillStyle = b.type === "fire" ? "#f2b765" : "#d3c49a";
    ctx.fillRect(b.x + 74, b.z + 74, 3, 3);
  }
  ctx.save();
  ctx.translate(player.position.x + 75, player.position.z + 75);
  ctx.rotate(-player.yaw);
  ctx.fillStyle = "#ffedbd";
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-3, 4);
  ctx.lineTo(3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#d2dfcf";
  ctx.font = "9px sans-serif";
  ctx.fillText("N", 72, 11);
}
function update(dt, t) {
  hand.visible = active() && !blueprint;
  if (active()) simulate(dt, t);
  swing = Math.max(0, swing - dt * 5);
  hand.rotation.x = -Math.sin(swing * Math.PI) * 0.8;
  hand.position.y = Math.sin(t * 5) * 0.008;
  camera.position.copy(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0);
  if (!played) {
    camera.position.set(12, 12, 30);
    camera.lookAt(-8, 3, 1);
  }
  camera.updateMatrixWorld();
  if (active()) updateTarget();
  else {
    ghost.visible = false;
    $("target").textContent = "";
  }
  const light = THREE.MathUtils.smoothstep(
    Math.sin((state.time - 0.23) * Math.PI * 2),
    -0.22,
    0.4,
  );
  scene.background.setRGB(
    0.04 + light * 0.52,
    0.065 + light * 0.61,
    0.1 + light * 0.61,
  );
  scene.fog.color.copy(scene.background);
  hemi.intensity = 0.2 + light * 2;
  sun.intensity = 0.1 + light * 2.8;
  sun.position.set(
    Math.cos(state.time * Math.PI * 2) * 55,
    15 + light * 55,
    -35,
  );
  world.update(t, light);
  shadowTimer += dt;
  if (shadowTimer > 1) {
    renderer.shadowMap.needsUpdate = true;
    shadowTimer = 0;
  }
  for (const b of buildings)
    if (b.type === "fire") {
      b.group.userData.flame.scale.set(
        1 + Math.sin(t * 12) * 0.1,
        1 + Math.cos(t * 13) * 0.12,
        1,
      );
      b.group.userData.light.intensity = 7 + Math.sin(t * 11);
      b.group.userData.smoke.position.y = 1.3 + ((t * 0.6) % 1.8);
      b.group.userData.smoke.scale.setScalar(0.5 + ((t * 0.6) % 1.8));
    }
  $("hurt").style.opacity = performance.now() < hurtUntil ? 0.35 : 0;
  mapTimer += dt;
  if (mapTimer > 0.15) {
    renderHUD();
    drawMap();
    mapTimer = 0;
  }
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
renderHUD();
drawMap();
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener("beforeunload", save);

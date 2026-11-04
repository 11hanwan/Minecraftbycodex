import * as THREE from "three";
import { variants } from "./progression.js";
import { heightAt, seededRandom } from "./survival.js";
export function createWorld(scene) {
  const rand = seededRandom(4239),
    resources = [],
    landmarks = [];
  const texture = (kind) => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = kind === "bark" ? "#ae9470" : "#a7b09a";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1300; i++) {
      const v = Math.floor(80 + rand() * 110);
      ctx.fillStyle = `rgba(${v},${v},${v},.18)`;
      const x = rand() * 128,
        y = rand() * 128;
      ctx.fillRect(
        x,
        y,
        kind === "bark" ? 1 : 2,
        kind === "bark" ? 8 + rand() * 28 : 2,
      );
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const barkTexture = texture("bark"),
    groundTexture = texture("ground");
  groundTexture.repeat.set(70, 70);
  const material = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.94, ...extra });
  const mats = {
    bark: material("#79654b", { map: barkTexture }),
    leaf: material("#516c33"),
    lightLeaf: material("#809a42"),
    pine: material("#345a3c"),
    rock: material("#8f9183"),
    ore: material("#af7953", { metalness: 0.28 }),
    wood: material("#a78a60", { map: barkTexture }),
    leaves: material("#739850"),
    berry: material("#c75442"),
    skin: material("#bf9c79"),
    sand: material("#d6c393"),
  };
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const terrainGeo = new THREE.PlaneGeometry(160, 160, 160, 160);
  terrainGeo.rotateX(-Math.PI / 2);
  const positions = terrainGeo.attributes.position,
    colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i),
      y = heightAt(x, z);
    positions.setY(i, y);
    const slope =
      Math.abs(heightAt(x + 1, z) - y) + Math.abs(heightAt(x, z + 1) - y);
    c.set(
      y < 0.8
        ? "#dfd0a5"
        : y < 1.8
          ? "#baa97b"
          : slope > 0.8
            ? "#9b9b86"
            : y > 7
              ? "#719163"
              : "#7d9b55",
    );
    c.multiplyScalar(0.88 + rand() * 0.2);
    colors.push(c.r, c.g, c.b);
  }
  terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  const terrain = mesh(
    terrainGeo,
    material("#ffffff", { vertexColors: true, map: groundTexture }),
  );
  terrain.castShadow = false;
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { time: { value: 0 }, daylight: { value: 1 } },
    vertexShader: `uniform float time;varying vec3 world;void main(){vec3 p=position;p.z+=sin(p.x*.15+time*.7)*.09+cos(p.y*.2+time*.6)*.07;world=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float time;uniform float daylight;varying vec3 world;void main(){float wave=sin(world.x*1.8+world.z*.8+time*1.2)*sin(world.z*2.1-time*.6);float glint=pow(max(0.,wave),14.);vec3 col=mix(vec3(.055,.25,.28),vec3(.22,.53,.52),.55+wave*.1);col+=glint*.2;col*=.18+daylight*.82;gl_FragColor=vec4(col,.88);}`,
  });
  const ocean = mesh(
    new THREE.PlaneGeometry(650, 650, 96, 96),
    waterMat,
    0,
    -0.25,
    0,
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.castShadow = false;
  const pond = mesh(
    new THREE.CircleGeometry(5.3, 48),
    material("#629c8d", {
      roughness: 0.24,
      metalness: 0.15,
      transparent: true,
      opacity: 0.9,
    }),
    -12,
    2.15,
    8,
  );
  pond.rotation.x = -Math.PI / 2;
  pond.castShadow = false;
  landmarks.push({
    type: "water",
    name: "Sötvattenskällan",
    position: new THREE.Vector3(-12, 2.15, 8),
  });
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.5, 4.6, 9),
    canopyGeo = new THREE.IcosahedronGeometry(1, 2),
    rockGeo = new THREE.DodecahedronGeometry(1, 1),
    stoneGeo = new THREE.IcosahedronGeometry(1, 0),
    coneGeo = new THREE.ConeGeometry(1, 1, 9);
  const crownPositions = canopyGeo.attributes.position;
  for (let i = 0; i < crownPositions.count; i++) {
    const x = crownPositions.getX(i),
      y = crownPositions.getY(i),
      z = crownPositions.getZ(i);
    const uneven =
      1 + 0.12 * Math.sin(x * 13 + y * 7) * Math.cos(z * 11 - y * 5);
    crownPositions.setXYZ(i, x * uneven, y * uneven, z * uneven);
  }
  canopyGeo.computeVertexNormals();
  function addResource(id, kind, x, z, pickup = false) {
    const y = heightAt(x, z),
      g = new THREE.Group();
    g.position.set(x, y, z);
    scene.add(g);
    let variant =
      kind === "stone"
        ? ["limestone", "granite", "basalt"][id % 3]
        : kind === "ore"
          ? "ore"
          : null;
    const scale = 0.8 + rand() * 0.5;
    g.rotation.y = rand() * Math.PI * 2;
    if (kind === "wood" && !pickup) {
      mesh(trunkGeo, mats.bark, 0, 2.1, 0, g);
      const pine = z < -10 && rand() > 0.35;
      variant = pine ? "pine" : id % 2 ? "birch" : "oak";
      const trunk = g.children[0];
      if (variant === "birch") {
        trunk.material = mats.bark.clone();
        trunk.material.color.set("#e0dbc7");
        for (let ring = 0; ring < 7; ring++) {
          const stripe = mesh(
            new THREE.CylinderGeometry(
              0.51 - ((0.7 + ring * 0.45) / 4.6) * 0.28,
              0.51 - ((0.7 + ring * 0.45) / 4.6) * 0.28,
              0.055,
              9,
            ),
            mats.bark,
            0,
            0.5 + ring * 0.45,
            0,
            g,
          );
        }
      }
      if (pine) {
        for (let j = 0; j < 3; j++) {
          const canopy = mesh(
            coneGeo,
            j % 2 ? mats.leaf : mats.pine,
            0,
            3.4 + j * 1.55,
            0,
            g,
          );
          canopy.scale.set(2.2 - j * 0.45, 3.5 - j * 0.4, 2.2 - j * 0.45);
        }
      } else {
        for (let j = 0; j < 4; j++) {
          const a = (j / 4) * Math.PI * 2;
          const leaf = mesh(
            canopyGeo,
            j % 2 ? mats.lightLeaf : mats.leaf,
            Math.cos(a) * 1.2,
            4.7 + rand() * 1.2,
            Math.sin(a) * 1.2,
            g,
          );
          leaf.scale.set(1.9, 1.5 + rand() * 0.8, 1.9);
        }
        const branch = mesh(
          new THREE.CylinderGeometry(0.08, 0.17, 2.3, 6),
          mats.bark,
          0.7,
          3.2,
          0,
          g,
        );
        branch.rotation.z = -0.7;
      }
      g.scale.setScalar(
        scale * (variant === "oak" ? 1.2 : variant === "birch" ? 0.9 : 1),
      );
    } else if (kind === "wood") {
      const branch = mesh(
        new THREE.CylinderGeometry(0.055, 0.09, 1.3, 6),
        mats.bark,
        0,
        0.1,
        0,
        g,
      );
      branch.rotation.z = 1.45;
      const twig = mesh(
        new THREE.CylinderGeometry(0.02, 0.04, 0.5, 5),
        mats.bark,
        0.2,
        0.13,
        0.18,
        g,
      );
      twig.rotation.set(1, 0, 1);
    } else if (kind === "stone" || kind === "ore") {
      const rock = mesh(
        pickup ? stoneGeo : rockGeo,
        mats.rock,
        0,
        pickup ? 0.13 : 0.7,
        0,
        g,
      );
      rock.scale.set(
        pickup ? 0.24 : 1.3,
        pickup ? 0.15 : 1,
        pickup ? 0.29 : 1.15,
      );
      if (!pickup && kind === "stone") {
        rock.material = mats.rock.clone();
        rock.material.color.set(
          variant === "limestone"
            ? "#c7bea4"
            : variant === "granite"
              ? "#92958d"
              : "#454e50",
        );
        rock.scale.multiplyScalar(
          variant === "basalt" ? 1.35 : variant === "limestone" ? 0.85 : 1.1,
        );
      }
      if (kind === "ore")
        for (let j = 0; j < 7; j++) {
          const a = j * 0.9;
          const crystal = mesh(
            stoneGeo,
            mats.ore,
            Math.cos(a) * 0.82,
            0.8 + rand() * 0.6,
            Math.sin(a) * 0.82,
            g,
          );
          crystal.scale.set(0.22, 0.15, 0.25);
        }
    } else if (kind === "leaves") {
      for (let j = 0; j < 6; j++) {
        const angle = j * 2.4;
        const leaf = mesh(
          new THREE.SphereGeometry(1, 7, 5),
          mats.leaves,
          Math.cos(angle) * 0.24,
          pickup ? 0.08 : 0.3 + j * 0.1,
          Math.sin(angle) * 0.24,
          g,
        );
        leaf.scale.set(0.33, 0.035, 0.16);
        leaf.rotation.set(pickup ? 0.1 : 0.3, angle, pickup ? 0.1 : 0.4);
      }
    } else if (kind === "berries") {
      for (let j = 0; j < 3; j++) {
        const leaf = mesh(
          canopyGeo,
          mats.leaf,
          Math.sin(j * 2) * 0.4,
          0.45,
          Math.cos(j * 2) * 0.4,
          g,
        );
        leaf.scale.set(0.65, 0.65, 0.65);
      }
      for (let j = 0; j < 8; j++) {
        const a = j * 0.8;
        mesh(
          new THREE.SphereGeometry(0.09, 6, 5),
          mats.berry,
          Math.cos(a) * 0.7,
          0.6 + rand() * 0.35,
          Math.sin(a) * 0.7,
          g,
        );
      }
    }
    const r = {
      id,
      kind,
      pickup,
      group: g,
      variant,
      collisionRadius:
        kind === "wood"
          ? 0.5 * g.scale.x + 0.2
          : kind === "stone"
            ? 1.3 *
                (variant === "basalt"
                  ? 1.35
                  : variant === "limestone"
                    ? 0.85
                    : 1.1) +
              0.2
            : 1.3,
      maxHp: pickup ? 1 : variants[variant]?.hp || 2,
      hp: pickup ? 1 : variants[variant]?.hp || 2,
      alive: true,
    };
    g.traverse((o) => {
      if (o.isMesh) o.userData.resource = r;
    });
    resources.push(r);
    return r;
  }
  let id = 0;
  // Guaranteed starter resources around the beach landing; never require a tool to obtain a tool.
  for (let i = 0; i < 20; i++) {
    const a = i * 2.4,
      r = 3 + i * 0.42,
      x = 3 + Math.cos(a) * r,
      z = 17 + Math.sin(a) * r;
    if (heightAt(x, z) > 2.3)
      addResource(
        id++,
        i % 3 === 0 ? "leaves" : i % 2 ? "wood" : "stone",
        x,
        z,
        true,
      );
  }
  for (let i = 0; i < 230; i++) {
    const x = (rand() - 0.5) * 115,
      z = (rand() - 0.5) * 115,
      y = heightAt(x, z);
    if (
      y < 2.4 ||
      Math.hypot(x + 12, z - 8) < 7 ||
      Math.hypot(x - 3, z - 17) < 4
    )
      continue;
    const kind =
      i % 13 === 0
        ? "ore"
        : i % 6 === 0
          ? "stone"
          : i % 7 === 0
            ? "berries"
            : i % 5 === 0
              ? "leaves"
              : "wood";
    addResource(id++, kind, x, z, false);
  }
  for (let i = 0; i < 125; i++) {
    const x = (rand() - 0.5) * 110,
      z = (rand() - 0.5) * 110;
    if (heightAt(x, z) > 2.4 && Math.hypot(x + 12, z - 8) > 6)
      addResource(
        id++,
        i % 3 === 0 ? "leaves" : i % 2 ? "wood" : "stone",
        x,
        z,
        true,
      );
  }
  // Small plants use instancing to keep the island practical on Chromebook GPUs.
  const grassData = [];
  for (let i = 0; i < 3500; i++) {
    const x = (rand() - 0.5) * 125,
      z = (rand() - 0.5) * 125,
      y = heightAt(x, z);
    if (y < 2.4 || Math.hypot(x + 12, z - 8) < 6) continue;
    grassData.push({ x, z, y, s: 0.5 + rand() * 0.8, a: rand() * 6 });
  }
  const blades = [];
  for (let blade = 0; blade < 4; blade++) {
    const angle = blade * 2.4,
      dx = Math.cos(angle),
      dz = Math.sin(angle);
    const point = (step, side) => {
      const t = step / 3,
        lean = t * t * 0.22,
        width = (1 - t) * 0.045;
      return [
        dx * lean - dz * width * side,
        t * (0.5 + blade * 0.055),
        dz * lean + dx * width * side,
      ];
    };
    for (let step = 0; step < 3; step++) {
      const a = point(step, -1),
        b = point(step, 1),
        c = point(step + 1, -1),
        d = point(step + 1, 1);
      blades.push(...a, ...b, ...c, ...b, ...d, ...c);
    }
  }
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(blades, 3),
  );
  grassGeometry.computeVertexNormals();
  const windTime = { value: 0 };
  const grassMaterial = material("#a3b26d", { side: THREE.DoubleSide });
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = windTime;
    shader.vertexShader = "uniform float windTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      transformed.x += sin(windTime*1.7+instanceMatrix[3].x*.35+instanceMatrix[3].z*.2)*position.y*.18;`,
    );
  };
  const grass = new THREE.InstancedMesh(
      grassGeometry,
      grassMaterial,
      grassData.length,
    ),
    dummy = new THREE.Object3D();
  grassData.forEach((g, i) => {
    dummy.position.set(g.x, g.y, g.z);
    dummy.rotation.set(0.2, g.a, 0.15);
    dummy.scale.set(g.s, g.s, g.s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(
      i,
      new THREE.Color(i % 5 === 0 ? "#c2b66e" : i % 2 ? "#91a354" : "#648347"),
    );
  });
  grass.receiveShadow = true;
  scene.add(grass);
  const flowerData = grassData.filter((_, i) => i % 13 === 0),
    flowers = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.075, 0),
      material("#ffe1a1"),
      flowerData.length,
    );
  flowerData.forEach((g, i) => {
    dummy.position.set(g.x, g.y + 0.6, g.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, new THREE.Color(i % 3 ? "#ecd7a1" : "#c4b6d9"));
  });
  scene.add(flowers);
  // Distant silhouettes and drifting clouds give the coastline depth.
  const distant = material("#718c85");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const mountain = mesh(
      new THREE.ConeGeometry(17 + rand() * 18, 15 + rand() * 22, 7),
      distant,
      Math.cos(a) * 170,
      -2,
      Math.sin(a) * 170,
    );
    mountain.castShadow = false;
  }
  const clouds = [];
  for (let i = 0; i < 15; i++) {
    const m = mesh(
      new THREE.IcosahedronGeometry(1, 1),
      material("#f0f0df", { transparent: true, opacity: 0.7 }),
      (rand() - 0.5) * 280,
      38 + rand() * 12,
      (rand() - 0.5) * 280,
    );
    m.scale.set(10 + rand() * 8, 1.1 + rand() * 1.2, 4 + rand() * 3);
    m.castShadow = false;
    clouds.push(m);
  }
  const birds = [];
  const birdMat = new THREE.MeshBasicMaterial({
    color: "#42554d",
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i++) {
    const group = new THREE.Group();
    for (const sign of [-1, 1]) {
      const wing = mesh(
        new THREE.PlaneGeometry(0.65, 0.09),
        birdMat,
        sign * 0.26,
        0,
        0,
        group,
      );
      wing.rotation.z = sign * 0.3;
    }
    scene.add(group);
    birds.push(group);
  }
  return {
    resources,
    landmarks,
    mats,
    mesh,
    terrain,
    pond,
    update(time, daylight) {
      windTime.value = time;
      waterMat.uniforms.time.value = time;
      waterMat.uniforms.daylight.value = daylight;
      for (const c of clouds) c.position.x += 0.002;
      birds.forEach((b, i) => {
        b.position.set(
          Math.cos(time * 0.06 + i) * 36,
          19 + Math.sin(time * 0.2 + i) * 2,
          Math.sin(time * 0.06 + i) * 36,
        );
        b.rotation.y = -time * 0.06 - i;
        b.rotation.z = Math.sin(time * 3 + i) * 0.1;
      });
    },
  };
}

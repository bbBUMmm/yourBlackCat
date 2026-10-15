// The diorama: floor, two walls, furniture, light sources, and the walk grid.
import * as THREE from 'three';
import { VoxelSet, buildEmissive, glowSprite, noise1 } from './voxel.js';
import { makePoster, POSTER_LAYOUT, loadPosterImages } from './posters.js';

export const ROOM = {
  W: 18, D: 18, H: 14, VOX: 1,
  FLOOR_TOP: 1,          // world Y of the floor surface
  DESK_TOP: 5            // world Y of the desk surface
};

const C = {
  wall:      '#F4EDE1',
  wallCool:  '#EBE2D3',
  trim:      '#322D28',
  plankA:    '#A9754A',
  plankB:    '#9C6A42',
  plankC:    '#B58155',
  seam:      '#7E5331',
  desk:      '#9A6B43',
  deskTop:   '#B07B4E',
  chair:     '#2E2A26',
  shelf:     '#9A6B43',
  book:      ['#9C4A3C', '#3E5A52', '#B07B3E', '#4A4660', '#A98556', '#2F4858'],
  pot:       '#B4785A',
  leaf1:     '#4E6B45',
  leaf2:     '#5F8054',
  lamp:      '#2A2623',
  shade:     '#F3EADA',
  bulb:      '#FFD08A',
  frame:     '#2A2623',
  sill:      '#D9CDB8'
};

/* ---------------- footprints used by the walk grid ---------------- */
const OBSTACLES = [
  { x0: 2, x1: 7, z0: 1, z1: 4 },    // desk
  { x0: 3, x1: 4, z0: 6, z1: 7 },    // chair
  { x0: 1, x1: 2, z0: 10, z1: 15 },  // bookshelf
  { x0: 15, x1: 16, z0: 2, z1: 3 }   // plant
];
const WINDOW = { x0: 11, x1: 16, y0: 6, y1: 11 };

export function buildRoom(manifest) {
  const V = new VoxelSet();
  const emissive = [];
  const group = new THREE.Group();

  /* ---- floor ---- */
  for (let x = 0; x < ROOM.W; x++) {
    for (let z = 0; z < ROOM.D; z++) {
      const plank = (z % 7 === 0 || z % 7 === 3) ? C.plankB : (z % 5 === 0 ? C.plankC : C.plankA);
      const isSeam = (z % 3 === 2);
      V.set(x, 0, z, isSeam ? C.seam : plank);
    }
  }

  /* ---- walls (back = z0, left = x0) ---- */
  const wallShade = (y) => {
    const k = 1 - Math.min(1, (ROOM.H - y) / ROOM.H) * 0.06;
    const c = new THREE.Color(C.wall).multiplyScalar(k);
    return '#' + c.getHexString();
  };
  for (let y = 1; y <= ROOM.H; y++) {
    for (let x = 0; x < ROOM.W; x++) {
      if (x >= WINDOW.x0 && x <= WINDOW.x1 && y >= WINDOW.y0 && y <= WINDOW.y1) continue;
      V.set(x, y, 0, y === 1 ? C.trim : (y === ROOM.H ? C.trim : wallShade(y)));
    }
    for (let z = 1; z < ROOM.D; z++) {
      V.set(0, y, z, y === 1 ? C.trim : (y === ROOM.H ? C.trim : wallShade(y)));
    }
  }
  // window frame + sill
  for (let x = WINDOW.x0 - 1; x <= WINDOW.x1 + 1; x++) {
    V.set(x, WINDOW.y0 - 1, 0, C.frame);
    V.set(x, WINDOW.y1 + 1, 0, C.frame);
  }
  for (let y = WINDOW.y0; y <= WINDOW.y1; y++) {
    V.set(WINDOW.x0 - 1, y, 0, C.frame);
    V.set(WINDOW.x1 + 1, y, 0, C.frame);
  }
  const mid = Math.round((WINDOW.x0 + WINDOW.x1) / 2);
  for (let y = WINDOW.y0; y <= WINDOW.y1; y++) V.set(mid, y, 0, C.frame);

  /* ---- desk ---- */
  V.box(2, 7, 4, 4, 1, 4, C.deskTop);                 // top slab
  V.box(2, 7, 3, 3, 1, 1, C.desk);                    // apron
  [[2, 1], [7, 1], [2, 4], [7, 4]].forEach(([x, z]) => V.box(x, x, 1, 3, z, z, C.desk));
  V.box(2, 7, 3, 3, 4, 4, C.desk);

  /* ---- desk lamp ---- */
  V.box(6, 7, 5, 5, 2, 3, C.lamp);                    // base
  V.box(7, 7, 6, 7, 3, 3, C.lamp);                    // stem
  V.box(6, 7, 8, 8, 2, 3, C.shade);                   // shade
  emissive.push({ x: 6, y: 7, z: 2, color: C.bulb });

  /* ---- chair ---- */
  V.box(3, 4, 3, 3, 6, 7, C.chair);
  [[3, 6], [4, 6], [3, 7], [4, 7]].forEach(([x, z]) => V.box(x, x, 1, 2, z, z, C.chair));
  V.box(3, 4, 4, 6, 7, 7, C.chair);

  /* ---- bookshelf ---- */
  V.box(1, 2, 1, 7, 10, 10, C.shelf);
  V.box(1, 2, 1, 7, 15, 15, C.shelf);
  [1, 3, 5, 7].forEach(y => V.box(1, 2, y, y, 10, 15, C.shelf));
  let bi = 0;
  [2, 4, 6].forEach(y => {
    for (let z = 11; z <= 14; z++) {
      if (noise1(z, y, 3) < 0.22) continue;
      const col = C.book[(bi++) % C.book.length];
      V.box(1, 2, y, y + (noise1(z, y, 9) > 0.5 ? 1 : 0), z, z, col);
    }
  });

  /* ---- plant ---- */
  V.box(15, 16, 1, 2, 2, 3, C.pot);
  V.box(15, 16, 3, 3, 2, 3, C.leaf1);
  V.set(15, 4, 2, C.leaf2); V.set(16, 4, 3, C.leaf2);
  V.set(16, 5, 2, C.leaf1);

  /* ---- string lights along the top of the back wall ---- */
  for (let x = 3; x <= 15; x += 3) {
    V.set(x, ROOM.H - 1, 1, C.lamp);
    emissive.push({ x, y: ROOM.H - 2, z: 1, color: '#FFE2AE' });
  }

  const voxels = V.build({ size: ROOM.VOX, ao: 0.12, grain: 0.025 });
  group.add(voxels);

  const em = buildEmissive(emissive, ROOM.VOX, [0, 0, 0]);
  if (em) group.add(em);
  emissive.forEach(e => {
    const g = glowSprite(e.color, e.z === 1 ? 1.6 : 3.4, e.z === 1 ? 0.3 : 0.45);
    g.position.set((e.x + 0.5) * ROOM.VOX, (e.y + 0.5) * ROOM.VOX, (e.z + 0.5) * ROOM.VOX);
    group.add(g);
  });

  /* ---- rug (flat plane, no voxel thickness) ---- */
  group.add(makeRug());

  /* ---- what you see through the window ---- */
  group.add(makeSky());

  /* ---- posters ---- */
  const posters = new THREE.Group();
  POSTER_LAYOUT.forEach(spec => posters.add(makePoster(spec, ROOM.VOX)));
  group.add(posters);
  loadPosterImages(POSTER_LAYOUT, manifest).then(() => {
    posters.clear();
    POSTER_LAYOUT.forEach(spec => posters.add(makePoster(spec, ROOM.VOX)));
  }).catch(() => {});

  /* ---- walk grid ---- */
  const grid = [];
  for (let x = 0; x < ROOM.W; x++) {
    grid[x] = [];
    for (let z = 0; z < ROOM.D; z++) {
      let ok = x >= 1 && x <= ROOM.W - 2 && z >= 1 && z <= ROOM.D - 2;
      if (ok) for (const o of OBSTACLES) {
        if (x >= o.x0 && x <= o.x1 && z >= o.z0 && z <= o.z1) { ok = false; break; }
      }
      grid[x][z] = ok;
    }
  }

  return {
    group, grid,
    deskHome: { x: 3.8, z: 2.7, y: ROOM.DESK_TOP },
    deskExit: { x: 6, z: 6 },
    // where the cat goes when it leaves the desk. `weight` biases the pick,
    // `stay` is how long it lingers — the rug is the favourite spot.
    pois: [
      { key: 'rug',    cell: { x: 12, z: 12 }, face: null,            weight: 5, stay: [10, 17], mode: 'loaf' },
      { key: 'shelf',  cell: { x: 4,  z: 12 }, face: { x: 1, z: 13 }, weight: 3, stay: [5, 8] },
      { key: 'corner', cell: { x: 3,  z: 16 }, face: { x: 7, z: 19 }, weight: 3, stay: [5, 9] },
      { key: 'window', cell: { x: 13, z: 2 },  face: { x: 13, z: -2 }, weight: 2, stay: [5, 8] },
      { key: 'plant',  cell: { x: 14, z: 5 },  face: { x: 16, z: 3 }, weight: 1, stay: [4, 6] }
    ],
    corners: [{ x: 1, z: 1 }, { x: 16, z: 1 }, { x: 1, z: 16 }, { x: 16, z: 16 }]
  };
}

function makeRug() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#EAE1D2'; x.fillRect(0, 0, 32, 32);
  x.fillStyle = '#35312C';
  for (let i = 4; i < 32; i += 8) x.fillRect(0, i, 32, 2);
  x.strokeStyle = '#35312C'; x.lineWidth = 2; x.strokeRect(1, 1, 30, 30);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7 * ROOM.VOX, 7 * ROOM.VOX),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(12.5 * ROOM.VOX, ROOM.FLOOR_TOP + 0.02, 12.5 * ROOM.VOX);
  mesh.receiveShadow = true;
  return mesh;
}

function makeSky() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 24;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 24);
  g.addColorStop(0, '#9FC4DC'); g.addColorStop(0.6, '#CFDCE4'); g.addColorStop(1, '#E8D9C4');
  x.fillStyle = g; x.fillRect(0, 0, 16, 24);
  x.fillStyle = '#B9CBB2';
  x.fillRect(0, 17, 16, 7);
  x.fillStyle = '#A7BCA2';
  x.fillRect(2, 15, 3, 3); x.fillRect(9, 14, 4, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6 * ROOM.VOX, 6 * ROOM.VOX),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  mesh.position.set(14 * ROOM.VOX, 9 * ROOM.VOX, -0.15);
  return mesh;
}

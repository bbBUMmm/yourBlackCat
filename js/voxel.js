// Tiny voxel toolkit: collect cubes, then bake them into one InstancedMesh.
import * as THREE from 'three';

const KEY = (x, y, z) => x + ',' + y + ',' + z;
const NB = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

/** Deterministic hash-noise so a rebuild always looks identical. */
export function noise1(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

export class VoxelSet {
  constructor() {
    this.map = new Map();   // key -> {x,y,z,color,emissive}
  }

  set(x, y, z, color, opts) {
    x |= 0; y |= 0; z |= 0;
    this.map.set(KEY(x, y, z), {
      x, y, z,
      color: new THREE.Color(color),
      emissive: (opts && opts.emissive) || 0,
      noAO: !!(opts && opts.noAO)
    });
    return this;
  }

  box(x0, x1, y0, y1, z0, z1, color, opts) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) this.set(x, y, z, color, opts);
    return this;
  }

  /** Box with the 4 vertical corner columns removed — reads as a rounded form. */
  roundBox(x0, x1, y0, y1, z0, z1, color, opts) {
    this.box(x0, x1, y0, y1, z0, z1, color, opts);
    [[x0, z0], [x0, z1], [x1, z0], [x1, z1]].forEach(([cx, cz]) => {
      this.remove(cx, y0, cz);
      this.remove(cx, y1, cz);
    });
    return this;
  }

  remove(x, y, z) { this.map.delete(KEY(x, y, z)); return this; }
  has(x, y, z) { return this.map.has(KEY(x | 0, y | 0, z | 0)); }
  get size() { return this.map.size; }

  /**
   * Bake. Fully buried cubes are dropped; the rest get a cheap ambient-occlusion
   * tint from how enclosed they are, plus a touch of per-voxel grain.
   */
  build(opts = {}) {
    const size = opts.size || 1;
    const ao = opts.ao != null ? opts.ao : 0.17;
    const grain = opts.grain != null ? opts.grain : 0.035;
    const origin = opts.origin || [0, 0, 0];

    const visible = [];
    for (const v of this.map.values()) {
      let occ = 0;
      for (const [dx, dy, dz] of NB) if (this.has(v.x + dx, v.y + dy, v.z + dz)) occ++;
      if (occ === 6) continue;                       // buried: nobody sees it
      visible.push({ v, occ });
    }

    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: false, color: 0xffffff,
      roughness: opts.roughness != null ? opts.roughness : 0.86,
      metalness: 0,
      flatShading: false
    });
    const mesh = new THREE.InstancedMesh(geo, mat, visible.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    visible.forEach(({ v, occ }, i) => {
      dummy.position.set(
        origin[0] + (v.x + 0.5) * size,
        origin[1] + (v.y + 0.5) * size,
        origin[2] + (v.z + 0.5) * size
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      col.copy(v.color);
      if (!v.noAO && ao > 0) {
        const k = 1 - ao * (occ / 5);
        col.multiplyScalar(Math.max(0.35, k));
      }
      if (grain > 0) {
        const g = 1 + (noise1(v.x, v.y, v.z) - 0.5) * 2 * grain;
        col.multiplyScalar(g);
      }
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }
}

/** Separate pass for glowing voxels (bulbs, screens) — unlit so they read as light. */
export function buildEmissive(list, size, origin) {
  if (!list.length) return null;
  const geo = new THREE.BoxGeometry(size, size, size);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  list.forEach((v, i) => {
    dummy.position.set(
      origin[0] + (v.x + 0.5) * size,
      origin[1] + (v.y + 0.5) * size,
      origin[2] + (v.z + 0.5) * size
    );
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    col.set(v.color);
    mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Soft additive halo used around lamps and string lights. */
export function glowSprite(color, size, opacity = 0.5) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

// Placeholder voxel cat with exactly the node names a real GLB must provide.
// Swap in assets/models/cat.glb later and the controller keeps working.
import * as THREE from 'three';
import { VoxelSet } from './voxel.js';

export const CAT_VOX = 0.33;

const FUR = {
  base: '#34313C',
  top:  '#4A4556',
  low:  '#26242C',
  muzzle: '#443F4D'
};

export const EYE_COLORS = {
  amber: '#E6A33A', green: '#7FC24A', blue: '#5FA8D9',
  gold:  '#F0C64A', hazel: '#B98A4E', grey: '#A9B0B6'
};
export const COLLAR_COLORS = {
  none: null, red: '#B5302C', cream: '#EDE1C9', teal: '#2F7A74',
  plum: '#6B3A5B', mustard: '#C99A2E'
};

/** A named group holding one baked voxel chunk, pivoted at its own origin. */
function part(name, fill, opts = {}) {
  const V = new VoxelSet();
  fill(V);
  const g = new THREE.Group();
  g.name = name;
  if (V.size) {
    const mesh = V.build({
      size: CAT_VOX,
      ao: opts.ao != null ? opts.ao : 0.1,
      grain: opts.grain != null ? opts.grain : 0.05,
      roughness: 0.78
    });
    mesh.name = name + '_mesh';
    g.add(mesh);
  }
  return g;
}

export function buildCat(options = {}) {
  const eyeHex = EYE_COLORS[options.eye] || EYE_COLORS.amber;
  const collarHex = COLLAR_COLORS[options.collar] || null;

  const root = new THREE.Group();
  root.name = 'cat';

  /* ---- body: 5 wide, 4 tall, 6 deep; pivot at the floor between the paws ---- */
  const body = part('body', V => {
    V.roundBox(-2, 2, 0, 3, -3, 2, FUR.base);
    for (let x = -2; x <= 2; x++) for (let z = -3; z <= 2; z++) {
      if (V.has(x, 3, z)) V.set(x, 3, z, FUR.top);
      if (V.has(x, 0, z)) V.set(x, 0, z, FUR.low);
    }
  });
  body.position.y = 2 * CAT_VOX;          // legs are 2 voxels tall
  root.add(body);

  /* ---- head: oversized, chibi ---- */
  const head = part('head', V => {
    V.roundBox(-3, 3, 0, 4, -3, 2, FUR.base);
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 2; z++) if (V.has(x, 4, z)) V.set(x, 4, z, FUR.top);
    // a slightly lighter muzzle so the face is not one flat mass
    V.set(-1, 1, 2, FUR.muzzle); V.set(0, 1, 2, FUR.muzzle); V.set(1, 1, 2, FUR.muzzle);
  });
  head.position.set(0, 3.1 * CAT_VOX, 1.5 * CAT_VOX);
  body.add(head);

  /* ---- ears ---- */
  const ear = (name, x) => part(name, V => {
    V.box(0, 1, 0, 0, 0, 0, FUR.top);
    V.box(0, 1, 1, 1, 0, 0, FUR.base);
    V.set(x > 0 ? 0 : 1, 2, 0, FUR.base);
  });
  const earL = ear('ear_L', -1), earR = ear('ear_R', 1);
  earL.position.set(-3.0 * CAT_VOX, 4.6 * CAT_VOX, -0.6 * CAT_VOX);
  earR.position.set(1.4 * CAT_VOX, 4.6 * CAT_VOX, -0.6 * CAT_VOX);
  head.add(earL, earR);

  /* ---- eyes (own node so the colour can change) ---- */
  const eyes = part('eyes', V => {
    // left eye at x -3..-2, right eye at x 2..3, highlight on the outer top pixel
    [[-3, -3], [2, 3]].forEach(([x0, hx]) => {
      V.set(x0, 2, 3, eyeHex, { noAO: true });
      V.set(x0 + 1, 2, 3, eyeHex, { noAO: true });
      V.set(x0, 3, 3, eyeHex, { noAO: true });
      V.set(x0 + 1, 3, 3, eyeHex, { noAO: true });
      V.set(hx, 3, 3, '#FFFFFF', { noAO: true });
    });
    V.set(0, 1, 3, '#C9818B', { noAO: true });           // nose
    V.set(-1, 0, 3, FUR.low, { noAO: true });            // mouth
    V.set(1, 0, 3, FUR.low, { noAO: true });
  }, { ao: 0, grain: 0 });
  eyes.name = 'eyes';
  head.add(eyes);

  /* ---- eyelids: scale down over the eyes to blink ---- */
  const lid = (name, x0) => {
    const g = part(name, V => {
      V.set(0, 0, 0, FUR.base); V.set(1, 0, 0, FUR.base);
      V.set(0, 1, 0, FUR.base); V.set(1, 1, 0, FUR.base);
    }, { ao: 0 });
    g.position.set(x0 * CAT_VOX, 4 * CAT_VOX, 3.02 * CAT_VOX);
    g.scale.y = 0.001;                                   // open
    return g;
  };
  const lidL = lid('eyelid_L', -3), lidR = lid('eyelid_R', 2);
  head.add(lidL, lidR);

  /* ---- collar ---- */
  let collar = null;
  if (collarHex) {
    collar = part('collar', V => {
      for (let x = -2; x <= 2; x++) V.set(x, 0, 2, collarHex, { noAO: true });
      V.set(-2, 0, 1, collarHex, { noAO: true }); V.set(2, 0, 1, collarHex, { noAO: true });
      V.set(0, -1, 2, '#F0C64A', { noAO: true });        // little tag
    }, { ao: 0, grain: 0 });
    collar.position.set(0, 3.0 * CAT_VOX, 0.4 * CAT_VOX);
    body.add(collar);
  }

  /* ---- legs: pivot at the hip, voxels hang below ---- */
  const leg = name => part(name, V => {
    V.box(0, 1, -2, -1, 0, 1, FUR.low);
    V.set(0, -2, 1, FUR.base); V.set(1, -2, 1, FUR.base);
  });
  const legs = {
    leg_FL: leg('leg_FL'), leg_FR: leg('leg_FR'),
    leg_BL: leg('leg_BL'), leg_BR: leg('leg_BR')
  };
  legs.leg_FL.position.set(-1.9 * CAT_VOX, 0.2 * CAT_VOX, 1.2 * CAT_VOX);
  legs.leg_FR.position.set(0.9 * CAT_VOX, 0.2 * CAT_VOX, 1.2 * CAT_VOX);
  legs.leg_BL.position.set(-1.9 * CAT_VOX, 0.2 * CAT_VOX, -2.4 * CAT_VOX);
  legs.leg_BR.position.set(0.9 * CAT_VOX, 0.2 * CAT_VOX, -2.4 * CAT_VOX);
  Object.values(legs).forEach(l => body.add(l));

  /* ---- tail: four chained segments ---- */
  const tails = [];
  let parent = body;
  for (let i = 1; i <= 4; i++) {
    const seg = part('tail_' + i, V => {
      V.box(0, 0, 0, 0, -1, 0, i > 2 ? FUR.top : FUR.base);
    });
    seg.position.set(0, i === 1 ? 1.2 * CAT_VOX : 0, i === 1 ? -3.3 * CAT_VOX : -1.5 * CAT_VOX);
    parent.add(seg);
    tails.push(seg);
    parent = seg;
  }

  const nodes = {
    root, body, head, ear_L: earL, ear_R: earR, eyes,
    eyelid_L: lidL, eyelid_R: lidR, collar,
    leg_FL: legs.leg_FL, leg_FR: legs.leg_FR, leg_BL: legs.leg_BL, leg_BR: legs.leg_BR,
    tail_1: tails[0], tail_2: tails[1], tail_3: tails[2], tail_4: tails[3]
  };

  // remember rest poses so the controller can always return to them
  const rest = {};
  Object.entries(nodes).forEach(([k, n]) => {
    if (!n) return;
    rest[k] = {
      position: n.position.clone(),
      rotation: n.rotation.clone(),
      scale: n.scale.clone()
    };
  });

  return { root, nodes, rest, isPlaceholder: true };
}

/** Pull the same node names out of a loaded GLB. */
export function adoptGLB(scene) {
  const nodes = {};
  const want = ['body', 'head', 'ear_L', 'ear_R', 'eyes', 'eyelid_L', 'eyelid_R', 'collar',
    'leg_FL', 'leg_FR', 'leg_BL', 'leg_BR', 'tail_1', 'tail_2', 'tail_3', 'tail_4'];
  scene.traverse(o => {
    if (want.includes(o.name) && !nodes[o.name]) nodes[o.name] = o;
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  nodes.root = scene;
  const rest = {};
  Object.entries(nodes).forEach(([k, n]) => {
    if (!n) return;
    rest[k] = { position: n.position.clone(), rotation: n.rotation.clone(), scale: n.scale.clone() };
  });
  return { root: scene, nodes, rest, isPlaceholder: false };
}

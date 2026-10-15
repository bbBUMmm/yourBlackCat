// Wall art. Real images from assets/posters/ when they exist, hand-drawn pixel
// placeholders otherwise. Everything is drawn tiny and scaled up with NearestFilter.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); };

/* ---------------- placeholder motifs ---------------- */
const MOTIFS = {
  // three pyramids at dusk on a purple sky
  pyramids(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2B1B46'); g.addColorStop(0.55, '#5B3566'); g.addColorStop(1, '#C98A6B');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = rng(7);
    for (let i = 0; i < 26; i++) px(c, r() * W, r() * H * 0.5, 1, 1, 'rgba(255,245,220,.85)');
    const base = H - Math.round(H * 0.22);
    const tri = (cx, hgt, col) => {
      for (let i = 0; i < hgt; i++) px(c, cx - i, base - hgt + i, i * 2 + 1, 1, col);
    };
    tri(Math.round(W * 0.34), Math.round(H * 0.30), '#36204A');
    tri(Math.round(W * 0.62), Math.round(H * 0.38), '#2A1A3E');
    tri(Math.round(W * 0.82), Math.round(H * 0.20), '#3B2552');
    px(c, 0, base, W, H - base, '#D8A077');
  },
  // red & white banner
  flag(c, W, H) {
    px(c, 0, 0, W, H, '#F3EDE3');
    const step = Math.max(3, Math.round(W / 6));
    for (let i = -H; i < W; i += step * 2) {
      c.fillStyle = '#B5302C';
      c.beginPath(); c.moveTo(i, H); c.lineTo(i + step, H); c.lineTo(i + step + H, 0); c.lineTo(i + H, 0); c.closePath(); c.fill();
    }
    px(c, 0, 0, W, 1, '#8E2522'); px(c, 0, H - 1, W, 1, '#8E2522');
  },
  // a sheet of ink doodles
  doodles(c, W, H) {
    px(c, 0, 0, W, H, '#FBF7EF');
    const r = rng(21);
    c.strokeStyle = '#211E1B'; c.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const x = 2 + r() * (W - 6), y = 2 + r() * (H - 6);
      c.beginPath();
      if (r() < 0.4) { c.arc(x, y, 1 + r() * 2.4, 0, 6.283); }
      else {
        c.moveTo(x, y);
        for (let k = 0; k < 4; k++) c.lineTo(x + (r() - 0.5) * 7, y + (r() - 0.5) * 7);
      }
      c.stroke();
    }
  },
  // green apple on a dark poster
  apple(c, W, H) {
    px(c, 0, 0, W, H, '#14181A');
    const cx = W / 2, cy = H * 0.52, rr = Math.min(W, H) * 0.26;
    c.fillStyle = '#7FB23C';
    c.beginPath(); c.ellipse(cx, cy, rr, rr * 1.05, 0, 0, 6.283); c.fill();
    c.fillStyle = '#A3D15C';
    c.beginPath(); c.ellipse(cx - rr * 0.3, cy - rr * 0.3, rr * 0.3, rr * 0.36, 0, 0, 6.283); c.fill();
    px(c, cx | 0, (cy - rr * 1.25) | 0, 1, Math.max(2, rr * 0.4), '#5A3A20');
    px(c, 3, H - 5, W - 6, 1, 'rgba(255,255,255,.35)');
  },
  // moon over a deep sky
  moon(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0B1430'); g.addColorStop(1, '#232E52');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = rng(3);
    for (let i = 0; i < 30; i++) px(c, r() * W, r() * H, 1, 1, 'rgba(240,245,255,.9)');
    const cx = W * 0.6, cy = H * 0.4, rr = Math.min(W, H) * 0.22;
    c.fillStyle = '#F0EAD8';
    c.beginPath(); c.arc(cx, cy, rr, 0, 6.283); c.fill();
    c.fillStyle = '#16203E';
    c.beginPath(); c.arc(cx - rr * 0.55, cy - rr * 0.25, rr * 0.95, 0, 6.283); c.fill();
  },
  // a round cookie on blue
  cookie(c, W, H) {
    px(c, 0, 0, W, H, '#2F5FA8');
    const cx = W / 2, cy = H / 2, rr = Math.min(W, H) * 0.3;
    c.fillStyle = '#2A1C14';
    c.beginPath(); c.arc(cx, cy, rr, 0, 6.283); c.fill();
    const r = rng(11);
    for (let i = 0; i < 10; i++) {
      const a = r() * 6.283, d = r() * rr * 0.7;
      px(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, '#E8DFCB');
    }
  },
  // a tiny cat snapshot
  catphoto(c, W, H) {
    px(c, 0, 0, W, H, '#E9DCC6');
    px(c, 2, 2, W - 4, H - 4, '#C9A87C');
    const cx = (W / 2) | 0, base = H - 6;
    px(c, cx - 4, base - 7, 8, 7, '#241F1D');          // body
    px(c, cx - 3, base - 12, 6, 5, '#241F1D');         // head
    px(c, cx - 3, base - 14, 2, 2, '#241F1D');         // ears
    px(c, cx + 1, base - 14, 2, 2, '#241F1D');
    px(c, cx - 2, base - 11, 1, 1, '#9FD24A');         // eyes
    px(c, cx + 1, base - 11, 1, 1, '#9FD24A');
    px(c, cx + 4, base - 9, 1, 4, '#241F1D');          // tail
  },
  // photo-booth strip
  strip(c, W, H) {
    px(c, 0, 0, W, H, '#F5F1E8');
    const cell = Math.floor((H - 5) / 4);
    const tones = ['#CBB8A0', '#A9907A', '#D7C4AA', '#B5A188'];
    for (let i = 0; i < 4; i++) {
      const y = 2 + i * cell;
      px(c, 2, y, W - 4, cell - 1, tones[i]);
      const cx = W / 2;
      px(c, cx - 2, y + cell - 7, 4, 5, '#5C4A3A');     // shoulders
      px(c, cx - 2, y + cell - 11, 4, 4, '#7A6450');    // head
    }
  },
  // a cluster of polaroids
  polaroids(c, W, H) {
    px(c, 0, 0, W, H, 'rgba(0,0,0,0)');
    const r = rng(5);
    const tones = ['#9FB7C9', '#D4B48C', '#B9C9A8', '#CDA9A9'];
    for (let i = 0; i < 4; i++) {
      const w = Math.floor(W * 0.46), h = Math.floor(H * 0.44);
      const x = (i % 2) * (W - w), y = Math.floor(i / 2) * (H - h);
      px(c, x, y, w, h, '#FBF8F2');
      px(c, x + 1, y + 1, w - 2, h - 4, tones[i]);
      px(c, x + 2, y + 2, Math.max(1, (w - 4) * r()), Math.max(1, (h - 7) * r()), 'rgba(255,255,255,.35)');
    }
  }
};

/* ---------------- building the meshes ---------------- */
function drawPoster(motif, wpx, hpx) {
  const c = document.createElement('canvas');
  c.width = wpx; c.height = hpx;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  MOTIFS[motif](x, wpx, hpx);
  return c;
}

function texFromCanvas(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * wall: 'back' (facing +z) or 'left' (facing +x)
 * pos: [a, y] where a is x for the back wall, z for the left wall (voxel coords)
 */
export function makePoster(spec, VOX) {
  const { motif, w, h, wall, a, y, image } = spec;
  const wpx = Math.max(16, Math.round(w * 8));
  const hpx = Math.max(16, Math.round(h * 8));

  const group = new THREE.Group();
  const tex = image ? image : texFromCanvas(drawPoster(motif, wpx, hpx));
  if (image) {
    image.magFilter = THREE.NearestFilter;
    image.minFilter = THREE.NearestFilter;
    image.generateMipmaps = false;
    image.colorSpace = THREE.SRGBColorSpace;
  }

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(w * VOX, h * VOX),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
  );
  paper.receiveShadow = true;
  group.add(paper);

  // two bits of tape, drawn as small quads
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xF3E6CC, roughness: 0.8, transparent: true, opacity: 0.85 });
  [-1, 1].forEach(s => {
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(VOX * 0.9, VOX * 0.5), tapeMat);
    tape.position.set(s * (w * VOX) * 0.32, (h * VOX) / 2 + VOX * 0.05, 0.02);
    tape.rotation.z = s * 0.3;
    group.add(tape);
  });

  const EPS = 0.08;
  if (wall === 'back') {
    group.position.set((a + w / 2) * VOX, (y + h / 2) * VOX, VOX + EPS);
  } else {
    group.position.set(VOX + EPS, (y + h / 2) * VOX, (a + w / 2) * VOX);
    group.rotation.y = Math.PI / 2;
  }
  return group;
}

/** The collage layout. `a` runs along the wall, `y` is height, both in voxels. */
export const POSTER_LAYOUT = [
  { motif: 'pyramids', w: 5,   h: 6,   wall: 'back', a: 2.2,  y: 7,    file: 'pyramids' },
  { motif: 'doodles',  w: 3.4, h: 4,   wall: 'back', a: 7.6,  y: 7.4,  file: 'doodles' },
  { motif: 'flag',     w: 4,   h: 2.4, wall: 'back', a: 11.4, y: 11.4, file: 'flag' },

  { motif: 'apple',     w: 4,   h: 5,   wall: 'left', a: 3,    y: 7,   file: 'apple' },
  { motif: 'moon',      w: 3.4, h: 3.4, wall: 'left', a: 7.4,  y: 8.8, file: 'moon' },
  { motif: 'cookie',    w: 2.6, h: 2.6, wall: 'left', a: 7.2,  y: 5.2, file: 'cookie' },
  { motif: 'catphoto',  w: 2.2, h: 2.2, wall: 'left', a: 3.6,  y: 4.4, file: 'catphoto' },
  { motif: 'strip',     w: 1.6, h: 4.4, wall: 'left', a: 11.6, y: 9.6, file: 'strip' },
  { motif: 'polaroids', w: 3,   h: 3,   wall: 'left', a: 13.4, y: 10.2, file: 'polaroids' }
];

/**
 * Swap in real photos. Only files named in assets/manifest.json are fetched,
 * so an empty manifest means no failed requests in the console.
 */
export async function loadPosterImages(layout, manifest) {
  const files = (manifest && manifest.posters) || {};
  const loader = new THREE.TextureLoader();
  await Promise.all(layout.map(spec => {
    const file = files[spec.file];
    if (!file) return Promise.resolve();
    return new Promise(resolve => {
      loader.load('assets/posters/' + file,
        tex => { spec.image = tex; resolve(); },
        undefined,
        () => resolve());
    });
  }));
  return layout;
}

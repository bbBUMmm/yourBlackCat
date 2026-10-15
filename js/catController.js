// Drives the rig: constant micro-life plus short procedural clips.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = p => p * p * (3 - 2 * p);

export class CatController {
  constructor(rig) {
    this.rig = rig;
    this.n = rig.nodes;
    this.rest = rig.rest;
    // a model missing an optional node should not crash the loop
    ['body', 'head', 'ear_L', 'ear_R', 'eyes', 'eyelid_L', 'eyelid_R',
     'leg_FL', 'leg_FR', 'leg_BL', 'leg_BR', 'tail_1', 'tail_2', 'tail_3', 'tail_4'
    ].forEach(k => {
      if (!this.n[k]) {
        const g = new THREE.Group();
        g.name = k;
        (this.n.body || rig.root).add(g);
        this.n[k] = g;
        this.rest[k] = { position: g.position.clone(), rotation: g.rotation.clone(), scale: g.scale.clone() };
      }
    });

    this.t = 0;
    this.mode = 'sit';            // sit | stand | walk | loaf | nap
    this.walkPhase = 0;
    this.walkSpeed = 0;
    this.lookEnabled = true;
    this.look = { x: 0, y: 0, tx: 0, ty: 0 };
    this.squint = 0; this.squintT = 0;
    this.blink = 0; this.nextBlink = 2 + Math.random() * 3; this.blinkQueue = 0;
    this.earTwitch = [0, 0]; this.nextTwitch = 3 + Math.random() * 4;
    this.tailAmp = 1; this.tailSpeed = 1;
    this.crouch = 0; this.squash = 0; this.squashV = 0;
    this.clip = null;
    this.breath = 0;
  }

  setMode(m) { this.mode = m; }
  setSquint(v) { this.squintT = v; }
  lookAtScreen(nx, ny) { this.look.tx = clamp(nx, -1, 1); this.look.ty = clamp(ny, -1, 1); }
  impulse(v) { this.squashV -= v; }

  play(name, dur) { this.clip = { name, dur, t: 0 }; }
  get busyClip() { return !!this.clip; }

  update(dt) {
    this.t += dt;
    const t = this.t, n = this.n, rest = this.rest;

    /* ---------- timers ---------- */
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink = 1;
      this.blinkQueue = Math.random() < 0.25 ? 1 : 0;      // sometimes a double blink
      this.nextBlink = 2 + Math.random() * 4;
    }
    if (this.blink > 0) {
      this.blink = Math.max(0, this.blink - dt * 6.5);
      if (this.blink === 0 && this.blinkQueue > 0) { this.blinkQueue--; this.blink = 1; }
    }
    this.nextTwitch -= dt;
    if (this.nextTwitch <= 0) {
      const i = Math.random() < 0.5 ? 0 : 1;
      this.earTwitch[i] = 1;
      this.nextTwitch = 2.5 + Math.random() * 5;
    }
    this.earTwitch = this.earTwitch.map(v => Math.max(0, v - dt * 4));

    this.squint += (this.squintT - this.squint) * (1 - Math.exp(-dt * 6));
    const k = 1 - Math.exp(-dt * 7);
    this.look.x += (this.look.tx - this.look.x) * k;
    this.look.y += (this.look.ty - this.look.y) * k;

    this.squashV += (-170 * this.squash - 12 * this.squashV) * dt;
    this.squash += this.squashV * dt;

    /* ---------- reset to rest ---------- */
    for (const key in rest) {
      const node = n[key];
      if (!node || key === 'root') continue;
      node.position.copy(rest[key].position);
      node.rotation.copy(rest[key].rotation);
      node.scale.copy(rest[key].scale);
    }

    /* ---------- breathing ---------- */
    const napping = this.mode === 'nap';
    this.breath += dt * (napping ? 0.9 : 1.7);
    const br = Math.sin(this.breath) * (napping ? 0.035 : 0.022);
    n.body.scale.set(1 + br, 1 - br * 0.5 + this.squash * 0.08, 1 + br);
    n.body.position.y = rest.body.position.y - this.squash * 0.12 - this.crouch * 0.5;

    /* ---------- posture ---------- */
    const legs = [n.leg_FL, n.leg_FR, n.leg_BL, n.leg_BR];
    if (this.mode === 'walk') {
      this.walkPhase += dt * this.walkSpeed * 7.5;
      const p = this.walkPhase;
      [0, 1, 2, 3].forEach(i => {
        const phase = p + (i === 0 || i === 3 ? 0 : Math.PI);
        legs[i].rotation.x = Math.sin(phase) * 0.75;
      });
      n.body.position.y += Math.abs(Math.sin(p)) * 0.045;
      n.body.rotation.z = Math.sin(p) * 0.04;
      n.body.rotation.x = -0.04;
    } else if (this.mode === 'sit') {
      n.leg_BL.rotation.x = 1.35; n.leg_BR.rotation.x = 1.35;
      n.body.rotation.x = -0.16;
      n.body.position.y -= 0.12;
    } else if (this.mode === 'loaf' || napping) {
      legs.forEach(l => { l.rotation.x = 1.5; l.scale.y = 0.55; });
      n.body.position.y -= 0.3;
      n.body.rotation.x = 0.02;
    }

    /* ---------- head: follows the cursor ----------
       The cursor is in screen space, the head turns in world space, so the
       pointer is first mapped onto the floor plane through the fixed iso
       camera (screen right = +x −z, screen up = −x −z) and then measured
       against whichever way the body happens to be facing. */
    let headYaw = 0, headPitch = 0;
    if (this.lookEnabled && !napping) {
      const dx = this.look.x * 0.707 + this.look.y * 0.37;
      const dz = -this.look.x * 0.707 + this.look.y * 0.37;
      const bodyYaw = this.rig.root ? this.rig.root.rotation.y : 0;
      const d = Math.atan2(dx, dz) - bodyYaw;
      // sin() of that angle, not the angle itself: a clamped angle flips sign the
      // moment the cursor crosses straight behind the head, which snaps. This is
      // continuous all the way round — the head eases back through centre instead.
      const reach = Math.min(1, Math.hypot(this.look.x, this.look.y) * 1.8);
      headYaw = 0.5 * Math.tanh(Math.sin(d) * 1.9) * reach;
      headPitch = this.look.y * 0.22;
    }
    if (napping) headPitch = 0.3;
    if (this.mode === 'loaf') headPitch += 0.06;

    /* ---------- tail ---------- */
    const tails = [n.tail_1, n.tail_2, n.tail_3, n.tail_4];
    const amp = this.tailAmp * (napping ? 0.25 : 1);
    tails.forEach((seg, i) => {
      if (!seg) return;
      const ph = t * 1.5 * this.tailSpeed - i * 0.6;
      seg.rotation.y = Math.sin(ph) * 0.2 * amp * (0.4 + i * 0.3);
      seg.rotation.x = (i === 0 ? 0.75 : -0.18) + Math.cos(ph * 0.8) * 0.08 * amp;
    });

    /* ---------- ears ---------- */
    n.ear_L.rotation.z = rest.ear_L.rotation.z + this.earTwitch[0] * 0.5;
    n.ear_R.rotation.z = rest.ear_R.rotation.z - this.earTwitch[1] * 0.5;
    n.ear_L.rotation.x = -this.earTwitch[0] * 0.3;
    n.ear_R.rotation.x = -this.earTwitch[1] * 0.3;

    /* ---------- clip on top ---------- */
    let lidExtra = 0;
    if (this.clip) {
      this.clip.t += dt;
      const p = clamp(this.clip.t / this.clip.dur, 0, 1);
      lidExtra = this.applyClip(this.clip.name, p, { headYaw, headPitch });
      if (p >= 1) this.clip = null;
    }

    n.head.rotation.y = headYaw + (this.clipYaw || 0);
    n.head.rotation.x = headPitch + (this.clipPitch || 0);
    this.clipYaw = 0; this.clipPitch = 0;

    /* ---------- eyelids ---------- */
    const lid = clamp(Math.max(this.blink, this.squint * 0.85, lidExtra, napping ? 1 : 0), 0, 1);
    const scale = Math.max(0.001, lid);
    n.eyelid_L.scale.y = scale;
    n.eyelid_R.scale.y = scale;
  }

  /** Returns extra eyelid closure (0..1). Sets clipYaw/clipPitch as side channels. */
  applyClip(name, p, base) {
    const n = this.n;
    switch (name) {
      case 'sneeze': {
        // pull back, snap forward, squeeze eyes
        if (p < 0.4) {
          const q = ease(p / 0.4);
          this.clipPitch = -0.32 * q;
          return q * 0.75;
        }
        if (p < 0.52) {
          const q = (p - 0.4) / 0.12;
          this.clipPitch = lerp(-0.32, 0.4, ease(q));
          return 1;
        }
        const q = (p - 0.52) / 0.48;
        this.clipPitch = lerp(0.4, 0, ease(q));
        return 1 - ease(q);
      }
      case 'groom': {
        const q = Math.sin(p * Math.PI);
        this.clipPitch = 0.42 * q;
        this.clipYaw = Math.sin(p * Math.PI * 6) * 0.14 * q;
        n.leg_FR.rotation.x = -1.1 * q;
        n.leg_FR.rotation.z = 0.3 * q;
        return 0.5 * q;
      }
      case 'meow': {
        // chin up, mouth open on the call, ears pulled back a touch
        const q = Math.sin(p * Math.PI);
        const open = Math.sin(Math.min(1, p * 1.25) * Math.PI);
        this.clipPitch = -0.26 * q;
        n.head.scale.y = 1 + 0.1 * open;
        n.head.position.y += 0.045 * q;
        n.ear_L.rotation.z -= 0.18 * q;
        n.ear_R.rotation.z += 0.18 * q;
        return 0.35 * q;
      }
      case 'yawn': {
        const q = Math.sin(p * Math.PI);
        this.clipPitch = -0.3 * q;
        n.head.scale.y = 1 + 0.12 * q;
        return q;
      }
      case 'stretch': {
        const q = Math.sin(p * Math.PI);
        n.body.rotation.x = -0.3 * q;
        n.body.position.y += 0.12 * q;
        n.leg_FL.rotation.x = -0.9 * q; n.leg_FR.rotation.x = -0.9 * q;
        this.clipPitch = 0.2 * q;
        return 0.6 * q;
      }
      case 'wave': {
        const q = Math.sin(p * Math.PI * 3);
        n.leg_FR.rotation.x = -1.25 + q * 0.5;
        n.leg_FR.rotation.z = 0.25;
        n.body.rotation.x = -0.18;
        this.clipPitch = -0.08;
        return 0;
      }
      case 'eat': {
        const dip = Math.max(0, Math.sin(p * Math.PI * 5));
        this.clipPitch = 0.42 * dip;
        return 0.3 * dip;
      }
      case 'purr': {
        n.body.position.y += Math.sin(this.t * 26) * 0.012;
        return 0.8;
      }
      case 'land': {
        const q = 1 - p;
        n.body.scale.y *= 1 - 0.22 * q;
        n.body.scale.x *= 1 + 0.14 * q;
        n.body.scale.z *= 1 + 0.14 * q;
        return 0.4 * q;
      }
      default: return 0;
    }
  }
}

// What the cat decides to do: idle loop on the desk, occasional wandering,
// the treat sequence, and sneezes that wait for a safe moment.
import * as THREE from 'three';
import { ROOM } from './room.js';
import { findPath, simplify, nearestFree } from './pathfinding.js';
import { CAT_VOX } from './cat.js';

const VOX = ROOM.VOX;
const cellWorld = c => ({ x: (c.x + 0.5) * VOX, z: (c.z + 0.5) * VOX });
const worldCell = p => ({ x: Math.floor(p.x / VOX), z: Math.floor(p.z / VOX) });
const shortAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const rand = (a, b) => a + Math.random() * (b - a);
const FACE_CAMERA = Math.PI * 0.25;   // the camera looks in from +X +Z

const IDLE_POOL = [
  { clip: null,      mode: 'sit',  status: 'sit',  dur: [4, 8] },
  { clip: null,      mode: 'loaf', status: 'loaf', dur: [6, 11] },
  { clip: 'groom',   mode: 'sit',  status: 'groom', dur: [2.6, 2.6] },
  { clip: 'yawn',    mode: 'sit',  status: 'yawn', dur: [1.8, 1.8] },
  { clip: 'stretch', mode: 'sit',  status: 'stretch', dur: [2.2, 2.2] },
  { clip: null,      mode: 'nap',  status: 'nap',  dur: [9, 16] }
];

export class Behavior {
  constructor(opts) {
    this.room = opts.room;
    this.rig = opts.rig;
    this.ctrl = opts.ctrl;
    this.audio = opts.audio;
    this.scene = opts.scene;
    this.onStatus = opts.onStatus || (() => {});
    this.onTreatDone = opts.onTreatDone || (() => {});
    this.onFed = opts.onFed || (() => {});

    this.pos = { x: this.room.deskHome.x * VOX, z: this.room.deskHome.z * VOX };
    this.y = ROOM.DESK_TOP;
    this.yaw = Math.PI * 0.25;
    this.yawTarget = this.yaw;

    this.queue = [];
    this.action = null;
    this.onDesk = true;
    this.treatRunning = false;
    this.sneezeTimer = 60;
    this.pendingSneeze = false;
    this.meowTimer = rand(15, 20);
    this.hungry = false;
    this.purring = false;

    this.treatMesh = null;
    this.puffs = [];
  }

  /* ---------------- public ---------------- */
  requestSneeze() {
    if (this.canInterrupt()) this.doSneeze();
    else this.pendingSneeze = true;
  }

  requestTreat() {
    if (this.treatRunning) return false;
    this.treatRunning = true;
    this.queue.length = 0;
    this.action = null;
    this.stopPurr();
    const corner = this.frontCorner();
    const seq = [];
    if (this.onDesk) seq.push(this.aJumpDown());
    seq.push(this.aWalkTo(corner, 'treatWalk'));
    seq.push(this.aFaceCamera());
    seq.push(this.aClip('wave', 1.6, 'treatWave', 'sit'));
    seq.push(this.aFn(() => this.spawnTreat()));
    seq.push(this.aClip('eat', 2.2, 'treatEat', 'sit', () => { this.audio.play('munch'); this.onFed(); }));
    seq.push(this.aFn(() => this.despawnTreat()));
    seq.push(this.aPurr(3.2, 'treatPurr', 'loaf'));
    seq.push(this.aWalkTo(this.room.deskExit, 'back'));
    seq.push(this.aJumpUp());
    seq.push(this.aFn(() => {
      this.treatRunning = false;
      this.meowTimer = 60;                   // fed: a minute of quiet, then back to asking
      this.onTreatDone();
    }));
    this.queue = seq;
    return true;
  }

  canInterrupt() {
    return !this.action || this.action.interruptible !== false;
  }

  /** Down to the last heart, the cat asks far more often. main.js sets this every frame. */
  setHungry(on) {
    if (on === this.hungry) return;
    this.hungry = on;
    if (on && !this.treatRunning) this.meowTimer = Math.min(this.meowTimer, this.meowGap());
  }
  meowGap() { return this.hungry ? rand(5, 8) : rand(15, 20); }

  /* ---------------- loop ---------------- */
  update(dt) {
    if (this.delayed) {
      this.delayed.t -= dt;
      if (this.delayed.t <= 0) { const fn = this.delayed.fn; this.delayed = null; fn(); }
    }

    this.sneezeTimer -= dt;
    if (this.sneezeTimer <= 0) { this.sneezeTimer = 60; this.pendingSneeze = true; }
    // a purr is long and soft, so it may be sneezed through; a short clip may not
    if (this.pendingSneeze && this.canInterrupt() && !(this.ctrl.busyClip && !this.purring)) {
      this.pendingSneeze = false;
      this.doSneeze();
    }

    // a meow every 15–20 s (5–8 s on the last heart) — a nap or a purr gets cut
    // short for it, a treat does not
    this.meowTimer -= dt;
    if (this.meowTimer <= 0) {
      const shortClipRunning = this.ctrl.busyClip && !this.purring;
      if (this.treatRunning) this.meowTimer = 5;
      else if (!this.canInterrupt() || shortClipRunning) this.meowTimer = 0.6;
      else {
        if (this.ctrl.mode === 'nap') this.breakIdle();   // stirs awake, then calls out
        this.doMeow();                                    // a purr just carries on underneath
        this.meowTimer = this.meowGap();
      }
    }

    if (!this.action) {
      if (!this.queue.length) this.planIdle();
      this.action = this.queue.shift();
      if (this.action && this.action.start) this.action.start();
    }
    if (this.action) {
      const done = this.action.update(dt);
      if (done) this.action = null;
    }

    // smooth turn
    const d = shortAngle(this.yawTarget - this.yaw);
    this.yaw += d * Math.min(1, dt * 7);

    const root = this.rig.root;
    root.position.set(this.pos.x, this.y, this.pos.z);
    root.rotation.y = this.yaw;

    this.updatePuffs(dt);
  }

  /* ---------------- idle planning ---------------- */
  planIdle() {
    if (!this.onDesk) {
      this.queue.push(this.aWalkTo(this.room.deskExit, 'back'), this.aJumpUp());
      return;
    }
    if (Math.random() < 0.3) {
      const poi = this.pickPoi();
      const stay = rand(poi.stay[0], poi.stay[1]);
      // lying down somewhere comfortable is the most likely place to hear a purr
      const purrs = poi.mode === 'loaf' ? Math.random() < 0.7 : Math.random() < 0.25;
      this.queue.push(
        this.aJumpDown(),
        this.aWalkTo(poi.cell, 'walk'),
        poi.face ? this.aFaceCell(poi.face) : this.aFn(() => {}),
        purrs ? this.aPurr(stay, poi.key, poi.mode || 'sit')
              : this.aWait(stay, poi.key, poi.mode || 'sit'),
        this.aWalkTo(this.room.deskExit, 'back'),
        this.aJumpUp()
      );
      return;
    }
    this.yawTarget = FACE_CAMERA;
    if (Math.random() < 0.38) {                // settles down and purrs to itself
      this.queue.push(this.aPurr(rand(7, 13), 'purr', 'loaf'));
      return;
    }
    const pick = IDLE_POOL[Math.floor(Math.random() * IDLE_POOL.length)];
    if (pick.clip) this.queue.push(this.aClip(pick.clip, pick.dur[0], pick.status, pick.mode));
    else this.queue.push(this.aWait(rand(pick.dur[0], pick.dur[1]), pick.status, pick.mode));
  }

  /* ---------------- actions ---------------- */
  aWait(dur, status, mode) {
    let t = 0;
    return {
      interruptible: true,
      start: () => { this.ctrl.setMode(mode); this.ctrl.setSquint(mode === 'nap' ? 1 : 0); this.status(status); },
      update: (dt) => { t += dt; return t >= dur; }
    };
  }

  /** Settles, rumbles, and always stops its own loop — even when cut short. */
  aPurr(dur, status, mode) {
    let t = 0;
    return {
      interruptible: true,
      start: () => {
        this.ctrl.setMode(mode || 'loaf');
        this.ctrl.setSquint(0.85);
        this.ctrl.play('purr', dur);
        this.status(status);
        this.startPurr();
      },
      update: (dt) => {
        t += dt;
        if (t < dur) {
          // a meow or a sneeze borrows the clip slot; pick the rumble back up after
          if (!this.ctrl.busyClip && dur - t > 0.3) this.ctrl.play('purr', dur - t);
          return false;
        }
        this.stopPurr();
        return true;
      }
    };
  }

  startPurr() {
    if (this.purring) return;
    this.purring = true;
    this.audio.loop('purr', true);
  }
  stopPurr() {
    if (!this.purring) return;
    this.purring = false;
    this.audio.loop('purr', false);
  }

  /** Drops whatever quiet thing the cat was doing so something louder can happen. */
  breakIdle() {
    this.stopPurr();
    this.action = null;
    this.queue.length = 0;
    this.ctrl.setMode('sit');
    this.ctrl.setSquint(0);
  }

  aClip(name, dur, status, mode, onStart) {
    let t = 0;
    return {
      interruptible: name !== 'wave',
      start: () => {
        this.ctrl.setMode(mode || 'sit');
        this.ctrl.setSquint(name === 'purr' ? 0.9 : 0);
        this.ctrl.play(name, dur);
        this.status(status);
        if (onStart) onStart();
      },
      update: (dt) => { t += dt; return t >= dur; }
    };
  }

  aFn(fn) {
    return { interruptible: true, update: () => { fn(); return true; } };
  }

  aFaceCamera() {
    return this.aFaceDir(1, 1, 'treatWave');
  }
  aFaceCell(cell) {
    const w = cellWorld(cell);
    return this.aFaceDir(w.x - this.pos.x, w.z - this.pos.z, null);
  }
  aFaceDir(dx, dz, status) {
    let t = 0;
    return {
      interruptible: true,
      start: () => {
        this.ctrl.setMode('sit');
        this.yawTarget = Math.atan2(dx, dz);
        if (status) this.status(status);
      },
      update: (dt) => { t += dt; return t > 0.6; }
    };
  }

  aWalkTo(cell, status) {
    let path = null, i = 0;
    const speed = 2.4;
    return {
      interruptible: true,
      start: () => {
        const from = worldCell(this.pos);
        const goal = nearestFree(this.room.grid, cell) || cell;
        path = simplify(findPath(this.room.grid, from, goal)) || [goal];
        i = 1;
        this.ctrl.setMode('walk');
        this.ctrl.setSquint(0);
        this.ctrl.walkSpeed = 1;
        this.ctrl.tailSpeed = 1.5;
        this.status(status);
      },
      update: (dt) => {
        if (!path || i >= path.length) { this.ctrl.tailSpeed = 1; return true; }
        const target = cellWorld(path[i]);
        const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.06) { i++; return i >= path.length ? (this.ctrl.tailSpeed = 1, true) : false; }
        const step = Math.min(dist, speed * dt);
        this.pos.x += (dx / dist) * step;
        this.pos.z += (dz / dist) * step;
        this.yawTarget = Math.atan2(dx, dz);
        return false;
      }
    };
  }

  aJumpDown() {
    const to = cellWorld(this.room.deskExit);
    return this.aJump(to, ROOM.FLOOR_TOP, 'jumpDown', () => { this.onDesk = false; });
  }
  aJumpUp() {
    const to = { x: this.room.deskHome.x * VOX, z: this.room.deskHome.z * VOX };
    return this.aJump(to, ROOM.DESK_TOP, 'jumpUp', () => {
      this.onDesk = true;
      this.yawTarget = FACE_CAMERA;
    });
  }

  aJump(to, toY, status, onEnd) {
    let t = 0, from = null, fromY = 0, landed = false;
    const CROUCH = 0.22, AIR = 0.5, LAND = 0.26;
    const total = CROUCH + AIR + LAND;
    return {
      interruptible: false,
      start: () => {
        from = { x: this.pos.x, z: this.pos.z };
        fromY = this.y;
        this.yawTarget = Math.atan2(to.x - from.x, to.z - from.z);
        this.ctrl.setMode('stand');
        this.ctrl.setSquint(0);
        this.status(status);
      },
      update: (dt) => {
        t += dt;
        if (t < CROUCH) {
          this.ctrl.crouch = (t / CROUCH) * 0.6;
          return false;
        }
        if (t < CROUCH + AIR) {
          const p = (t - CROUCH) / AIR;
          this.ctrl.crouch = 0;
          this.pos.x = from.x + (to.x - from.x) * p;
          this.pos.z = from.z + (to.z - from.z) * p;
          const peak = Math.max(fromY, toY) + 1.5;
          this.y = (1 - p) * (1 - p) * fromY + 2 * (1 - p) * p * peak + p * p * toY;
          return false;
        }
        if (!landed) {
          landed = true;
          this.ctrl.impulse(2.6);
          this.ctrl.play('land', LAND);
          this.audio.play('land');
        }
        this.y = toY;
        if (t >= total) { if (onEnd) onEnd(); return true; }
        return false;
      }
    };
  }

  /* ---------------- one-offs ---------------- */
  /** The clip is stretched to whatever take the audio layer picked. */
  doMeow() {
    const dur = this.audio.play('meow');
    this.ctrl.play('meow', Math.max(0.55, Math.min(1.6, dur || 0.8)));
    this.status('meow');
  }

  doSneeze() {
    this.ctrl.play('sneeze', 1.1);
    this.status('sneeze');
    // the clip winds up first: the sound, the jolt and the puff all land on the snap
    this.after(0.42, () => {
      this.audio.play('sneeze');
      this.ctrl.impulse(1.4);
      this.spawnPuff();
    });
  }

  /** One-shot timer used to line effects up with a point inside a clip. */
  after(t, fn) { this.delayed = { t, fn }; }

  /**
   * Weighted pick, with one re-roll so the cat does not visit the same spot
   * twice in a row. Weights live in room.js — the rug carries the heaviest one.
   */
  pickPoi() {
    const pois = this.room.pois;
    const draw = () => {
      let total = 0;
      for (const p of pois) total += p.weight || 1;
      let r = Math.random() * total;
      for (const p of pois) { r -= (p.weight || 1); if (r <= 0) return p; }
      return pois[pois.length - 1];
    };
    let poi = draw();
    if (poi === this.lastPoi && pois.length > 1) poi = draw();
    this.lastPoi = poi;
    return poi;
  }

  /** The corner closest to the camera — the one the viewer is looking straight at. */
  frontCorner() {
    let best = null, bestScore = -Infinity;
    for (const c of this.room.corners) {
      const score = c.x + c.z;            // camera is toward +X +Z
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  spawnTreat() {
    this.despawnTreat();
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xC98A3E, roughness: 0.7 });
    const geo = new THREE.BoxGeometry(CAT_VOX * 0.8, CAT_VOX * 0.8, CAT_VOX * 0.8);
    [[0, 0, 0], [0.8, 0, 0.2], [0.4, 0.8, -0.1]].forEach(([x, y, z]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x * CAT_VOX, y * CAT_VOX, z * CAT_VOX);
      m.castShadow = true;
      g.add(m);
    });
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    g.position.set(this.pos.x + fx * 0.75, this.y + CAT_VOX * 0.4, this.pos.z + fz * 0.75);
    this.scene.add(g);
    this.treatMesh = g;
  }
  despawnTreat() {
    if (this.treatMesh) { this.scene.remove(this.treatMesh); this.treatMesh = null; }
  }

  spawnPuff() {
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        color: 0xFFFFFF, transparent: true, opacity: 0.6, depthWrite: false
      }));
      const sc = 0.12 + Math.random() * 0.12;
      s.scale.set(sc, sc, 1);
      s.position.set(
        this.pos.x + fx * 1.0 + (Math.random() - 0.5) * 0.3,
        this.y + 1.6 + (Math.random() - 0.5) * 0.25,
        this.pos.z + fz * 1.0 + (Math.random() - 0.5) * 0.3
      );
      this.scene.add(s);
      this.puffs.push({ s, life: 0.7, vx: fx * rand(1, 2.2), vz: fz * rand(1, 2.2), vy: rand(0.2, 0.9) });
    }
  }
  updatePuffs(dt) {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.s); this.puffs.splice(i, 1); continue; }
      p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt; p.s.position.y += p.vy * dt;
      p.s.material.opacity = Math.max(0, p.life) * 0.7;
      const k = 1 + dt * 1.6;
      p.s.scale.multiplyScalar(k);
    }
  }

  status(key) { if (key) this.onStatus(key); }
}

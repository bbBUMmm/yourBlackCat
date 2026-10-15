// Sound files from assets/sounds/. Missing files simply stay silent.
// A key may name one file or several takes — several means the cat never
// repeats itself twice in a row. Only the files listed in
// assets/manifest.json are fetched, so a project without sound makes no
// failed requests.
export const DEFAULT_FILES = {
  sneeze: ['sneeze_1.mp3', 'sneeze_2.mp3', 'sneeze_3.mp3'],
  meow:   ['meow_1.mp3', 'meow_2.mp3', 'meow_3.mp3'],
  purr:   'purr.mp3',
  munch:  'munch.mp3',
  land:   'land.mp3'
};
const GAIN = { sneeze: 0.85, purr: 0.55, meow: 0.8, munch: 0.6, land: 0.35 };

export class Audio {
  constructor(files) {
    this.files = files && Object.keys(files).length ? files : null;
    this.buffers = {};        // key -> [AudioBuffer, …]
    this.last = {};           // key -> index of the take played last
    this.ready = false;
    this.muted = false;
    try { this.muted = localStorage.getItem('pcr.muted') === '1'; } catch (e) {}
    this.ctx = null;
    this.loops = {};
    this.missing = [];
  }

  /** Called from the first real click — browsers require a gesture. */
  async unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    await this.loadAll();
  }

  /** Safe to call repeatedly: only fetches what is not in memory yet. */
  async loadAll() {
    if (!this.ctx || !this.files || this.loading) return;
    const todo = Object.entries(this.files).filter(([k]) => !this.buffers[k]);
    if (!todo.length) { this.ready = true; return; }
    this.loading = true;
    await Promise.all(todo.map(([key, spec]) => this.loadKey(key, spec)));
    this.loading = false;
    this.ready = true;
  }

  /** Called once the manifest is known; loads immediately if already unlocked. */
  setFiles(files) {
    if (!files || !Object.keys(files).length) return;
    this.files = files;
    this.loadAll();
  }

  async loadKey(key, spec) {
    const list = Array.isArray(spec) ? spec : [spec];
    const takes = await Promise.all(list.map(f => this.decode(f)));
    const ok = takes.filter(Boolean);
    if (ok.length) this.buffers[key] = ok;
  }

  async decode(file) {
    try {
      const res = await fetch('assets/sounds/' + file);
      if (!res.ok) throw new Error(String(res.status));
      return await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch (e) {
      this.missing.push(file);
      return null;
    }
  }

  /** A random take, never the same one as last time. */
  pick(key) {
    const list = this.buffers[key];
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    let i = Math.floor(Math.random() * list.length);
    if (i === this.last[key]) i = (i + 1) % list.length;
    this.last[key] = i;
    return list[i];
  }

  /** Returns the length of what it played, so animation can match the sound. */
  play(key) {
    if (!this.ctx || this.muted) return 0;
    const buf = this.pick(key);
    if (!buf) return 0;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = GAIN[key] != null ? GAIN[key] : 0.6;
    src.buffer = buf;
    src.connect(g); g.connect(this.master);
    src.start();
    return buf.duration;
  }

  loop(key, on) {
    const list = this.buffers[key];
    if (!this.ctx || !list || !list.length) return;
    if (on) {
      if (this.loops[key]) return;
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      src.buffer = list[0];
      src.loop = true;
      src.connect(g); g.connect(this.master);
      src.start();
      g.gain.setTargetAtTime(GAIN[key] || 0.5, this.ctx.currentTime, 0.3);
      this.loops[key] = { src, g };
    } else if (this.loops[key]) {
      const { src, g } = this.loops[key];
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
      setTimeout(() => { try { src.stop(); } catch (e) {} }, 700);
      delete this.loops[key];
    }
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('pcr.muted', m ? '1' : '0'); } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.15);
  }
}

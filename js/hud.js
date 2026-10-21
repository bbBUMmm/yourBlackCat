// Pixel HUD over the room: Terraria-style hearts in the top-right corner, the
// help book in the top-left, the care page the book opens, and the full-screen
// "found treats" notice for when the hearts run out. All the art is drawn here
// from tiny pixel maps, so it costs no image requests.
import { t, lang } from './i18n.js';
import { EYE_COLORS, COLLAR_COLORS } from './cat.js';
import { MAX_HEARTS } from './health.js';

/* ---------------- pixel art ---------------- */
/** Pixel map -> crisp SVG. '.' (or any char without a colour) is empty. */
function pixelArt(rows, pal) {
  const w = rows[0].length, h = rows.length;
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < w;) {
      const ch = row[x];
      let end = x + 1;
      while (end < w && row[end] === ch) end++;
      if (pal[ch]) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${pal[ch]}"/>`;
      x = end;
    }
  });
  return `<svg viewBox="0 0 ${w} ${h}" style="--w:${w};--h:${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}

// 14 wide so the notch is two pixels and half a heart is exactly the left lobe.
const HEART = [
  '..XXX....XXX..',
  '.XHHRX..XRRRX.',
  'XHWHRRXXRRRRRX',
  'XHHRRRRRRRRRDX',
  'XRRRRRRRRRRRDX',
  'XRRRRRRRRRRDDX',
  '.XRRRRRRRRRDX.',
  '..XRRRRRRRDX..',
  '...XRRRRRDX...',
  '....XRRRDX....',
  '.....XRDX.....',
  '......XX......'
];
const HEART_PAL = {
  X: '#2A0E12', W: '#FFE4DC', H: '#FF7B7B', R: '#E3263A', D: '#A3142C',
  E: '#E3D3C3', e: '#CDBAA6'                // an empty heart: hollow, not black
};
const HEART_COLS = 12;                      // interior columns 1..12 — one per hour

function heartArt(cols) {
  const rows = HEART.map(row => row.replace(/[WHRD]/g, (ch, x) => (x <= cols ? ch : ch === 'D' ? 'e' : 'E')));
  return pixelArt(rows, HEART_PAL);
}
const HEART_ART = Array.from({ length: HEART_COLS + 1 }, (_, c) => heartArt(c));

const BOOK = [
  '.XXXXXXXXXXXXX.',
  'XSLLLLLLLLLLLLX',
  'XSLCCCCCCCCCCDX',
  'XSLCCCGGGGCCCDX',
  'XSLCCGGCCGGCCDX',
  'XSLCCCCCCGGCCDX',
  'XSLCCCCCGGCCCDX',
  'XSLCCCCGGCCCCDX',
  'XSLCCCCGGCCCCDX',
  'XSLCCCCCCCCCCDX',
  'XSLCCCCGGCCCCDX',
  'XSDDDDDDDDDDDDX',
  'XSXXXXXXXXXXXXX',
  'XSPPPPPPPPRRPPX',
  'XSppppppppRRppX',
  '.XXXXXXXXXRRXX.',
  '..........Rr...'
];
const BOOK_PAL = {
  X: '#2B1A12', S: '#4E2216', L: '#B4603F', C: '#8E3F2B', D: '#6A2C1D',
  G: '#F2C14E', P: '#F6EBD3', p: '#D8C5A1', R: '#3F8A74', r: '#2C6656'
};

const TREAT = [
  '...XXXXX......',
  '..XLLLLLX...XX',
  '.XLLLLLLLX.XLX',
  'XLLOLLLLLLXLLX',
  'XCCCCCCCCCCCCX',
  'XCCCCCCCCCXCDX',
  '.XDCCCCCDX.XDX',
  '..XDDDDDX...XX',
  '...XXXXX......'
];
const TREAT_PAL = { X: '#4A2C14', L: '#E3AE62', C: '#C98A3E', D: '#9A6428', O: '#2B1A12' };

const CIGARETTE = [
  '...........s.s.',
  '............s..',
  '...........s...',
  '............s..',
  'XXXXXXXXXXXXXX.',
  'XFFFWWWWWWWWAEX',
  'XfffwwwwwwwwaeX',
  'XXXXXXXXXXXXXX.'
];
const CIGARETTE_PAL = {
  X: '#3A2A22', F: '#E0913F', f: '#B86E2A', W: '#FBF7EF', w: '#D9D1C4',
  A: '#9A948E', a: '#77716B', E: '#F25A2C', e: '#C23A1E', s: '#A9A39C'
};

const BUBBLE = [
  '.XXXXXXXXXXX.',
  'XWWWWWWWWWWWX',
  'XWWWWKWKWWWWX',
  'XWWWWKWKWWWWX',
  'XWWWWKWKWWWWX',
  'XWWWWWWWWWWWX',
  'XWWWWKWKWWWWX',
  'XwwwwwwwwwwwX',
  '.XXXwXXXXXXX.',
  '...XwX.......',
  '...XX........'
];
const BUBBLE_PAL = { X: '#2B1A12', W: '#FFFDF6', w: '#E2D6C2', K: '#C23A2C' };

const CAT_FACE = [
  '....K.........K....',
  '....KK.......KK....',
  '....KPK.....KPK....',
  '...KKPPKKKKKPPKK...',
  '...KKKKkkkkkKKKK...',
  '..KKKKKKKKKKKKKKK..',
  '..KKKEIEKKKEIEKKK..',
  '..KKKEIEKKKEIEKKK..',
  'wwKKKKKKKNKKKKKKKww',
  '.w.KKKKKmKmKKKKK.w.',
  '....KKKKKKKKKKK....',
  '......KKKKKKK......',
  '......CCCTCCC......',
  '.........T.........'
];

/** The cat from the setup screen: its eye colour, its collar (or none). */
function catFace(p) {
  const collar = COLLAR_COLORS[p.collar] || null;
  return pixelArt(CAT_FACE, {
    K: '#1E1B19', k: '#38322E', P: '#C9787A', N: '#E59A9A', I: '#14110F', w: '#D8CFC2', m: '#4A4440',
    E: EYE_COLORS[p.eye] || EYE_COLORS.amber,
    C: collar, T: collar && '#F2C14E'
  });
}

const BOOK_ART = pixelArt(BOOK, BOOK_PAL);
const TREAT_ART = pixelArt(TREAT, TREAT_PAL);
const CIGARETTE_ART = pixelArt(CIGARETTE, CIGARETTE_PAL);
const BUBBLE_ART = pixelArt(BUBBLE, BUBBLE_PAL);

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rule = (art, text, cls = '') => `<p class="rule ${cls}"><span class="px-art">${art}</span><span>${text}</span></p>`;

/** One art pixel ≈ 3 CSS px, nudged onto whole device pixels so the art stays crisp at 125 % / 150 %. */
function fitPixel() {
  const dpr = window.devicePixelRatio || 1;
  document.documentElement.style.setProperty('--px', (Math.max(1, Math.round(3 * dpr)) / dpr) + 'px');
}

/* ---------------- the HUD ---------------- */
export class Hud {
  constructor({ health, profile }) {
    this.health = health;
    this.profile = profile;                 // () => { name, eye, collar }
    this.app = document.getElementById('app');
    this.bar = document.getElementById('hearts');
    this.helpBtn = document.getElementById('helpBtn');
    this.helpDlg = document.getElementById('helpDlg');
    this.foundDlg = document.getElementById('foundDlg');

    this.hearts = [];
    for (let i = 0; i < MAX_HEARTS; i++) {
      const el = document.createElement('span');
      el.className = 'heart px-art';
      el.addEventListener('animationend', e => { if (e.animationName === 'heart-pop') el.classList.remove('pop'); });
      this.bar.appendChild(el);
      this.hearts.push({ el, cols: -1 });
    }
    this.shown = health.value();            // what the bar shows; eases up after a refill
    this.labelKey = '';

    this.helpBtn.innerHTML = BOOK_ART;
    this.helpBtn.addEventListener('click', () => this.openHelp());
    // a click on the dimmed backdrop lands on the <dialog> itself
    this.helpDlg.addEventListener('click', e => { if (e.target === this.helpDlg) this.helpDlg.close(); });
    // however the notice is dismissed (button or Esc), the cat has eaten
    this.foundDlg.addEventListener('close', () => this.health.refill());

    fitPixel();
    window.addEventListener('resize', fitPixel);
    // fetch the pixel font now, so the first page opened does not swap fonts
    try { document.fonts.load('18px Tiny5').catch(() => {}); } catch (e) {}

    this.applyLang();
  }

  /** Per frame: follow the clock, and catch the moment the hearts run out. */
  update(dt) {
    const v = this.health.value();
    this.shown = v > this.shown ? Math.min(v, this.shown + dt * 6) : v;
    this.render();
    if (v <= 0 && !this.foundDlg.open && !this.app.hidden) this.openFound();
  }

  render() {
    const low = this.shown > 0 && this.shown <= 1;
    this.hearts.forEach((h, i) => {
      const frac = Math.max(0, Math.min(1, this.shown - i));
      const cols = Math.max(0, Math.ceil(frac * HEART_COLS - 1e-6));
      if (cols !== h.cols) {
        // hearts only ever fill up on a refill — each one pops as it does
        if (cols === HEART_COLS && h.cols >= 0) h.el.classList.add('pop');
        h.el.innerHTML = HEART_ART[cols];
        h.cols = cols;
      }
      h.el.classList.toggle('beat', low && i === 0);   // the last heart throbs
    });
    const v = Math.round(this.shown * 10) / 10;
    const key = lang() + v;
    if (key !== this.labelKey) {
      this.labelKey = key;
      const label = t('ui.health', { v: v.toLocaleString(lang(), { maximumFractionDigits: 1 }) });
      this.bar.setAttribute('aria-label', label);
      this.bar.title = label;
    }
  }

  applyLang() {
    const help = t('ui.help');
    this.helpBtn.setAttribute('aria-label', help);
    this.helpBtn.title = help;
    this.labelKey = '';
    this.render();
  }

  catName() { return esc(this.profile().name || t('setup.namePlaceholder')); }

  openHelp() {
    const n = this.catName();
    this.helpDlg.querySelector('.book').innerHTML = `
      <div class="page">
        <h2 id="helpTitle">${t('help.title')}</h2>
        ${rule(TREAT_ART, t('help.feed', { n }))}
        ${rule(CIGARETTE_ART, t('help.smoke'), 'warn')}
      </div>
      <div class="page">
        ${rule(HEART_ART[HEART_COLS], t('help.hearts'))}
        ${rule(BUBBLE_ART, t('help.meow', { n }))}
        <form method="dialog"><button class="px-btn" type="submit">${t('help.close')}</button></form>
      </div>`;
    this.helpDlg.showModal();
  }

  openFound() {
    const n = this.catName();
    this.foundDlg.querySelector('.found-card').innerHTML = `
      <div class="found-art px-art">${TREAT_ART}<span class="big">${catFace(this.profile())}</span>${TREAT_ART}</div>
      <h2 id="foundTitle">${t('found.title', { n })}</h2>
      <p>${t('found.text', { n })}</p>
      <div class="found-hearts px-art">${HEART_ART[HEART_COLS].repeat(MAX_HEARTS)}</div>
      <form method="dialog"><button class="px-btn" type="submit">${t('found.ok')}</button></form>`;
    this.foundDlg.showModal();
  }
}

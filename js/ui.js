// Setup screen, language switcher, status line.
import { DICT, setLang, lang, t, L } from './i18n.js';
import { EYE_COLORS, COLLAR_COLORS } from './cat.js';

const KEY = 'pcr.profile';

export const profile = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || !p.name) return null;
      return p;
    } catch (e) { return null; }
  },
  save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }
};

const el = {
  setup: document.getElementById('setup'),
  app: document.getElementById('app'),
  name: document.getElementById('catName'),
  random: document.getElementById('randomName'),
  eyes: document.getElementById('eyeSwatches'),
  collars: document.getElementById('collarSwatches'),
  start: document.getElementById('startBtn'),
  langCtl: document.getElementById('langCtl'),
  langSetup: document.getElementById('langSetup'),
  status: document.getElementById('status'),
  brand: document.getElementById('brandName')
};

let draft = { name: '', eye: 'amber', collar: 'none' };
let statusKey = 'sit';
let onLangChange = () => {};

export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.getAttribute('data-i18n'));
  });
  el.name.placeholder = t('setup.namePlaceholder');
  document.getElementById('muteBtn').setAttribute('aria-label', t('ui.mute'));
  renderSwatches();
  renderLang();
  renderStatus();
  if (el.brand) el.brand.textContent = draft.name || t('setup.namePlaceholder');
}

/** The same switcher on both screens — the setup card and the room's topbar. */
function renderLang() {
  [el.langCtl, el.langSetup].forEach(host => {
    if (!host) return;
    host.innerHTML = '';
    Object.keys(DICT).forEach(code => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = DICT[code].label;
      b.setAttribute('aria-pressed', String(code === lang()));
      b.addEventListener('click', () => {
        setLang(code, true);          // an explicit pick is the one worth remembering
        applyI18n();
        onLangChange();
      });
      host.appendChild(b);
    });
  });
}

function swatch(host, key, colorHex, selected, title, onPick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sw' + (colorHex ? '' : ' none');
  b.title = title;
  b.setAttribute('aria-label', title);
  b.setAttribute('aria-pressed', String(selected));
  const i = document.createElement('i');
  if (colorHex) i.style.background = colorHex;
  b.appendChild(i);
  b.addEventListener('click', () => { onPick(key); renderSwatches(); });
  host.appendChild(b);
}

function renderSwatches() {
  if (!el.eyes) return;
  el.eyes.innerHTML = '';
  Object.entries(EYE_COLORS).forEach(([key, hex]) => {
    swatch(el.eyes, key, hex, draft.eye === key, t('eyes.' + key), k => { draft.eye = k; });
  });
  el.collars.innerHTML = '';
  Object.entries(COLLAR_COLORS).forEach(([key, hex]) => {
    swatch(el.collars, key, hex, draft.collar === key, t('collars.' + key), k => { draft.collar = k; });
  });
}

export function initUI(opts) {
  onLangChange = opts.onLangChange || (() => {});

  el.random.addEventListener('click', () => {
    const list = L().names;
    el.name.value = list[Math.floor(Math.random() * list.length)];
    draft.name = el.name.value;
    if (el.brand) el.brand.textContent = draft.name;
  });
  el.name.addEventListener('input', () => {
    draft.name = el.name.value.trim();
    if (el.brand) el.brand.textContent = draft.name || t('setup.namePlaceholder');
  });
  el.start.addEventListener('click', () => {
    if (!draft.name) draft.name = L().names[Math.floor(Math.random() * L().names.length)];
    profile.save(draft);
    opts.onStart({ ...draft });
  });
}

export function openSetup(existing) {
  draft = existing ? { ...existing } : { name: '', eye: 'amber', collar: 'none' };
  el.name.value = draft.name || '';
  el.setup.hidden = false;
  el.app.hidden = true;
  applyI18n();
  setTimeout(() => { try { el.name.focus({ preventScroll: true }); } catch (e) {} }, 80);
}

export function openApp() {
  el.setup.hidden = true;
  el.app.hidden = false;
  applyI18n();
}

export function setStatus(key) {
  statusKey = key;
  renderStatus();
}

function renderStatus() {
  if (!el.status) return;
  const name = draft.name || t('setup.namePlaceholder');
  const line = t('status.' + statusKey, { n: name });
  el.status.innerHTML = line.replace(name, '<b>' + name + '</b>');
}

export function currentProfile() { return { ...draft }; }

/** Adopt a saved profile without opening the setup screen. */
export function useProfile(p) { draft = { ...p }; }

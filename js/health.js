// The cat's hearts. Five of them; one lasts 12 hours; a treat refills them all.
// Stored as "hp at a moment" ({hp, at}), so the value is worked out from the
// clock — a visitor who comes back tomorrow finds it lower, not frozen.
const KEY = 'pcr.health';
export const MAX_HEARTS = 5;
export const START_HEARTS = 2.5;
export const HEART_MS = 12 * 60 * 60 * 1000;

export class Health {
  constructor() {
    this.hp = START_HEARTS;
    this.at = Date.now();
    this.known = false;
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Number.isFinite(s.hp) && Number.isFinite(s.at)) {
        this.hp = Math.max(0, Math.min(MAX_HEARTS, s.hp));
        this.at = s.at;
        this.known = true;
      }
    } catch (e) { /* first visit, or storage blocked */ }
  }

  /** Called when the room opens: a brand-new cat starts half fed. */
  begin() {
    if (this.known) return;
    this.known = true;
    this.hp = START_HEARTS;
    this.at = Date.now();
    this.save();
  }

  /** Hearts left right now, 0..5. A clock set backwards never adds hearts. */
  value(now = Date.now()) {
    const spent = Math.max(0, now - this.at) / HEART_MS;
    return Math.max(0, Math.min(MAX_HEARTS, this.hp - spent));
  }

  refill() {
    this.hp = MAX_HEARTS;
    this.at = Date.now();
    this.known = true;
    this.save();
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ hp: this.hp, at: this.at })); } catch (e) {}
  }
}

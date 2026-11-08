// ============ Raccourcis clavier configurables ============
const KEY_ACTIONS = [
  { group: 'Compétences', id: 'ab0', label: 'Compétence 1', azerty: 'a', qwerty: 'q' },
  { group: 'Compétences', id: 'ab1', label: 'Compétence 2', azerty: 'z', qwerty: 'w' },
  { group: 'Compétences', id: 'ab2', label: 'Compétence 3', azerty: 'e', qwerty: 'e' },
  { group: 'Compétences', id: 'ab3', label: 'Ultime', azerty: 'r', qwerty: 'r' },
  { group: 'Sorts', id: 'sp0', label: 'Saut', azerty: 'd', qwerty: 'd' },
  { group: 'Sorts', id: 'sp1', label: 'Rustine', azerty: 'f', qwerty: 'f' },
  { group: 'Actions', id: 'recall', label: 'Retour à la base', azerty: 'b', qwerty: 'b' },
  { group: 'Actions', id: 'shop', label: 'Boutique', azerty: 'p', qwerty: 'p' },
  { group: 'Actions', id: 'stop', label: 'Stop', azerty: 's', qwerty: 's' },
  { group: 'Actions', id: 'scoreboard', label: 'Tableau des scores (maintenir)', azerty: 'Tab', qwerty: 'Tab' },
  { group: 'Caméra', id: 'camLock', label: 'Verrouiller / libérer la caméra', azerty: 'y', qwerty: 'y' },
  { group: 'Caméra', id: 'camCenter', label: 'Centrer sur le héros (maintenir)', azerty: ' ', qwerty: ' ' },
];
const FIXED_CONTROLS = [
  ['Se déplacer', 'Clic droit sur le sol (maintenir pour suivre la souris)'],
  ['Attaquer', 'Clic droit sur un ennemi'],
  ['Lancer une compétence', 'Maintenir sa touche pour viser, relâcher pour lancer. Clic droit pendant la visée : annuler'],
  ['Améliorer une compétence', 'Ctrl + touche de la compétence, ou bouton + sous l’icône'],
  ['Caméra libre', 'Flèches, bords de l’écran, clic molette glissé, clic gauche sur la minimap'],
  ['Déplacement par la minimap', 'Clic droit sur la minimap'],
  ['Zoom', 'Molette'],
  ['Menu', 'Échap : annuler la visée, fermer la boutique, puis pause'],
];
class KeyBindings {
  constructor(saved) {
    this.layout = saved && saved.layout === 'qwerty' ? 'qwerty' : 'azerty';
    this.map = {}; this.applyLayout(this.layout);
    if (saved && saved.map) for (const id in saved.map) if (this.map[id] !== undefined) this.map[id] = saved.map[id];
  }
  applyLayout(l) { this.layout = l; for (const a of KEY_ACTIONS) this.map[a.id] = a[l]; }
  get(id) { return this.map[id]; }
  set(id, key) { const prev = this.map[id]; for (const o in this.map) if (o !== id && this.map[o] === key) this.map[o] = prev; this.map[id] = key; }
  save() { return { layout: this.layout, map: { ...this.map } }; }
  actionFor(key) { for (const id in this.map) if (this.map[id] === key) return id; return null; }
  static norm(e) { if (e.key === 'Spacebar') return ' '; return e.key.length === 1 ? e.key.toLowerCase() : e.key; }
  static label(k) {
    if (!k) return '—';
    const n = { ' ': 'Espace', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Échap', Enter: 'Entrée', Shift: 'Maj' };
    return n[k] || (k.length === 1 ? k.toUpperCase() : k);
  }
  label(id) { return KeyBindings.label(this.map[id]); }
}

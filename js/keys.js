// ============ Raccourcis clavier configurables ============
// Chaque action a une touche par défaut ; les changements sont enregistrés dans les réglages.
const KEY_ACTIONS = [
  { group: 'Caméra', id: 'camUp', label: 'Caméra vers le haut', def: 'z' },
  { group: 'Caméra', id: 'camLeft', label: 'Caméra vers la gauche', def: 'q' },
  { group: 'Caméra', id: 'camDown', label: 'Caméra vers le bas', def: 's' },
  { group: 'Caméra', id: 'camRight', label: 'Caméra vers la droite', def: 'd' },
  { group: 'Caméra', id: 'center', label: 'Centrer sur le Bastion', def: ' ' },
  { group: 'Ordres', id: 'attackMove', label: 'Attaque en mouvement (puis clic)', def: 'a' },
  { group: 'Ordres', id: 'stop', label: 'Stop', def: 'x' },
  { group: 'Ordres', id: 'stanceAggressive', label: 'Tactique agressive', def: 'g' },
  { group: 'Ordres', id: 'stanceNeutral', label: 'Tactique neutre', def: 'n' },
  { group: 'Ordres', id: 'stanceEvasive', label: 'Tactique évasive', def: 'v' },
  { group: 'Ordres', id: 'formation0', label: 'Formation libre', def: 'F1' },
  { group: 'Ordres', id: 'formation1', label: 'Formation delta', def: 'F2' },
  { group: 'Ordres', id: 'formation2', label: 'Formation ligne', def: 'F3' },
  { group: 'Ordres', id: 'formation3', label: 'Formation colonne', def: 'F4' },
  { group: 'Production (Bastion ou atelier sélectionné)', id: 'produce_collector', label: 'Récupérateur', def: 'c' },
  { group: 'Production (Bastion ou atelier sélectionné)', id: 'produce_scout', label: 'Motard', def: 'e' },
  { group: 'Production (Bastion ou atelier sélectionné)', id: 'produce_interceptor', label: 'Buggy', def: 'i' },
  { group: 'Production (Bastion ou atelier sélectionné)', id: 'produce_corvette', label: 'Technical', def: 't' },
  { group: 'Production (Bastion ou atelier sélectionné)', id: 'produce_assault', label: 'Blindé d’assaut', def: 'f' },
  { group: 'Production (Bastion ou atelier sélectionné)', id: 'produce_ion', label: 'Lance‑roquettes', def: 'o' },
  { group: 'Production (Bastion ou atelier sélectionné)', id: 'produce_destroyer', label: 'Char lourd', def: 'h' },
  { group: 'Construction', id: 'build', label: 'Ouvrir / fermer la construction', def: 'b' },
  { group: 'Construction', id: 'research', label: 'Ouvrir / fermer les améliorations', def: 'r' },
  { group: 'Construction', id: 'place_shipyard', label: 'Placer un atelier', def: 'u' },
  { group: 'Construction', id: 'place_turret', label: 'Placer un bunker', def: 'k' },
  { group: 'Construction', id: 'place_research', label: 'Placer un laboratoire', def: 'l' },
  { group: 'Construction', id: 'place_relay', label: 'Placer un mirador', def: 'm' },
  { group: 'Partie', id: 'pause', label: 'Pause', def: 'F8' },
  { group: 'Partie', id: 'speedUp', label: 'Accélérer', def: '+' },
  { group: 'Partie', id: 'speedDown', label: 'Ralentir', def: '-' },
];

// Commandes fixes, non réassignables (affichées dans le guide)
const FIXED_CONTROLS = [
  ['Sélectionner', 'Clic gauche / glisser · Maj : ajouter · double‑clic : même type à l’écran'],
  ['Ordre contextuel', 'Clic droit : déplacer, attaquer, récupérer, décharger, point de ralliement'],
  ['Groupes', 'Ctrl + 1‑5 : assigner · 1‑5 : rappeler · deux fois : centrer la caméra'],
  ['Caméra à la souris', 'Bords de l’écran · clic milieu glissé · minimap (clic droit : attaque en mouvement)'],
  ['Zoom', 'Molette : en dézoomant, les véhicules deviennent des icônes tactiques'],
  ['Placement', 'Maj + clic : placer plusieurs bâtiments · clic droit : annuler'],
  ['Menu', 'Échap : annuler, puis désélectionner, puis menu de pause'],
];

class KeyBindings {
  constructor(saved) {
    this.map = {};
    for (const a of KEY_ACTIONS) this.map[a.id] = a.def;
    if (saved) for (const id in saved) if (this.map[id] !== undefined && typeof saved[id] === 'string') this.map[id] = saved[id];
  }
  get(id) { return this.map[id]; }
  set(id, key) {
    // Une touche ne sert qu'à une action : l'autre action reçoit l'ancienne touche
    const prev = this.map[id];
    for (const o in this.map) if (o !== id && this.map[o] === key) this.map[o] = prev;
    this.map[id] = key;
  }
  reset() { for (const a of KEY_ACTIONS) this.map[a.id] = a.def; }
  overrides() { const o = {}; for (const a of KEY_ACTIONS) if (this.map[a.id] !== a.def) o[a.id] = this.map[a.id]; return o; }
  actionFor(key) { for (const id in this.map) if (this.map[id] === key) return id; return null; }
  // Normalise une touche d'événement clavier
  static norm(e) {
    if (e.key === 'Spacebar') return ' ';
    if (e.key.length === 1) return e.key.toLowerCase();
    return e.key;
  }
  static label(key) {
    if (key === undefined || key === null || key === '') return '—';
    const names = { ' ': 'Espace', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Échap', Enter: 'Entrée', Backspace: 'Retour', Tab: 'Tab', Delete: 'Suppr', Shift: 'Maj', Control: 'Ctrl', Alt: 'Alt' };
    return names[key] || (key.length === 1 ? key.toUpperCase() : key);
  }
  label(id) { return KeyBindings.label(this.map[id]); }
}

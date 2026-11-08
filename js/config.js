// ============ Configuration et données de gameplay — Dernier Convoi ============
const CONFIG = {
  MAPS: {
    small:  { label: 'Vallée',   w: 3600, h: 2600 },
    medium: { label: 'Plateau',  w: 4800, h: 3400 },
    large:  { label: 'Désert',   w: 6400, h: 4400 },
  },
  RESOURCES: {
    low:    { label: 'Maigres',    v: 450 },
    normal: { label: 'Normales',   v: 800 },
    high:   { label: 'Abondantes', v: 1600 },
  },
  START_COLLECTORS: 3,
  BUILD_RADIUS: 440,
  ZOOM_MIN: 0.16, ZOOM_MAX: 2.4,
  ICON_ZOOM: 0.5,
  CAMERA_SPEED: 1100,
  REPAIR_RANGE: 280, REPAIR_RATE: 0.025,
  BASE_CAP: 24,
  AGGRO: 1.3,
  VIS_TICK: 0.1,
  STORM_SENSOR: 0.6,          // portée radio pendant une tempête de poussière
  STORM_FIRST: 200, STORM_GAP: [240, 420], STORM_DUR: [35, 60],
};

const FACTION = { PLAYER: 0, ENEMY: 1, NEUTRAL: 2 };
const FACTION_COLORS = {
  [FACTION.PLAYER]:  { team: '#4fb8dc', hull: '#7d8470', hullDark: '#3e4238', glow: '#bfe9f7', name: 'Les Convoyeurs' },
  [FACTION.ENEMY]:   { team: '#e8503a', hull: '#6a4a3a', hullDark: '#35241c', glow: '#ffb49a', name: 'Les Charognards' },
  [FACTION.NEUTRAL]: { team: '#a89c8a', hull: '#6b5f50', hullDark: '#3b332b', glow: '#ffffff', name: 'Neutre' },
};

// Les clés internes des classes sont conservées ; seuls les libellés changent.
const CLASSES = { utility: 'Utilitaire', fighter: 'Véhicule léger', corvette: 'Véhicule moyen', frigate: 'Blindé', capital: 'Char lourd', structure: 'Structure' };

// Multiplicateurs de dégâts : type d'attaquant → classe de la cible
const DAMAGE_TABLE = {
  scout:       { utility: 1.0, fighter: 1.0, corvette: 0.5, frigate: 0.3, capital: 0.2, structure: 0.3 },
  interceptor: { utility: 1.2, fighter: 1.0, corvette: 0.6, frigate: 1.0, capital: 1.6, structure: 1.2 },
  corvette:    { utility: 1.0, fighter: 1.8, corvette: 1.0, frigate: 0.6, capital: 0.5, structure: 0.6 },
  assault:     { utility: 1.0, fighter: 0.5, corvette: 1.6, frigate: 1.0, capital: 0.7, structure: 1.0 },
  ion:         { utility: 0.8, fighter: 0.2, corvette: 0.5, frigate: 1.0, capital: 1.8, structure: 1.5 },
  destroyer:   { utility: 1.0, fighter: 0.3, corvette: 0.7, frigate: 1.6, capital: 1.0, structure: 1.3 },
  turret:      { utility: 1.0, fighter: 1.2, corvette: 1.0, frigate: 1.0, capital: 0.8, structure: 1.0 },
};

const UNIT_TYPES = {
  collector: {
    name: 'Récupérateur', plural: 'Récupérateurs', cls: 'utility', key: 'C', cost: 60, buildTime: 10, hp: 170, speed: 95, radius: 10, sensor: 260, cap: 1,
    damage: 0, range: 0, fireRate: 0, capacity: 35, mineRate: 7, stance: 'evasive',
    desc: 'Camion-grue qui découpe la ferraille des décharges et la ramène au Bastion. Fuit les menaces par défaut.',
  },
  scout: {
    name: 'Motard', plural: 'Motards', cls: 'fighter', key: 'E', cost: 40, buildTime: 6, hp: 65, speed: 240, radius: 7, sensor: 700, cap: 1,
    damage: 3, range: 150, fireRate: 0.5, weapon: 'mg', stance: 'evasive',
    desc: 'Éclaireur à moto avec une radio longue portée. Voit loin, frappe peu : postez‑le sur les routes d’approche.',
  },
  interceptor: {
    name: 'Buggy', plural: 'Buggys', cls: 'fighter', key: 'I', cost: 70, buildTime: 9, hp: 115, speed: 185, radius: 8, sensor: 330, cap: 1,
    damage: 9, range: 150, fireRate: 0.45, weapon: 'mg', stance: 'neutral',
    desc: 'Buggy de raid armé d’une mitrailleuse. En meute, il tourne autour des chars lourds trop lents pour le viser.',
  },
  corvette: {
    name: 'Technical', plural: 'Technicals', cls: 'corvette', key: 'T', cost: 120, buildTime: 13, hp: 270, speed: 130, radius: 11, sensor: 350, cap: 2,
    damage: 11, range: 185, fireRate: 0.3, weapon: 'hmg', stance: 'neutral',
    desc: 'Pick‑up à mitrailleuse lourde. Déchiquette buggys et motards.',
  },
  assault: {
    name: 'Blindé d’assaut', short: 'Blindé', plural: 'Blindés d’assaut', cls: 'frigate', key: 'F', cost: 220, buildTime: 20, hp: 640, speed: 95, radius: 15, sensor: 390, cap: 3,
    damage: 26, range: 235, fireRate: 0.9, weapon: 'cannon', stance: 'neutral',
    desc: 'Semi‑chenillé blindé avec canon. Colonne vertébrale du convoi, il écrase les technicals.',
  },
  ion: {
    name: 'Lance‑roquettes', short: 'Roquettes', plural: 'Lance‑roquettes', cls: 'frigate', key: 'O', cost: 270, buildTime: 24, hp: 540, speed: 85, radius: 15, sensor: 400, cap: 3,
    damage: 72, range: 310, fireRate: 2.6, weapon: 'rocket', stance: 'neutral',
    desc: 'Camion lance‑roquettes. Ses salves perforent chars lourds et bunkers, mais ratent tout ce qui est petit et rapide.',
  },
  destroyer: {
    name: 'Char lourd', short: 'Char', plural: 'Chars lourds', cls: 'capital', key: 'H', cost: 620, buildTime: 46, hp: 2300, speed: 55, radius: 24, sensor: 460, cap: 6,
    damage: 95, range: 330, fireRate: 2.2, weapon: 'arty', stance: 'neutral', requires: 'shipyard',
    desc: 'Char de bataille rafistolé. Son obusier pulvérise les blindés par zones, mais les buggys le contournent.',
  },
};

const STRUCTURE_TYPES = {
  mothership: {
    name: 'Bastion', cls: 'structure', fem: false, key: null, cost: 0, buildTime: 1, hp: 5200, radius: 62, sensor: 680, cap: CONFIG.BASE_CAP,
    produces: ['collector', 'scout', 'interceptor', 'corvette', 'assault', 'ion', 'destroyer'], deposit: true, regen: 4,
    desc: 'Place forte du convoi. Produit tous les véhicules, reçoit la ferraille et répare les véhicules garés à proximité.',
  },
  shipyard: {
    name: 'Atelier', cls: 'structure', fem: false, key: 'U', cost: 420, buildTime: 45, hp: 1500, radius: 36, sensor: 400, cap: 12,
    produces: ['corvette', 'assault', 'ion', 'destroyer'], deposit: false, regen: 0,
    desc: 'Hangar mécanique. Assemble blindés et chars lourds, ajoute 12 places au convoi et répare à proximité.',
  },
  turret: {
    name: 'Bunker', cls: 'structure', fem: false, key: 'K', cost: 150, buildTime: 18, hp: 720, radius: 15, sensor: 360, cap: 0,
    damage: 24, range: 270, fireRate: 0.6, weapon: 'hmg',
    desc: 'Casemate en béton avec mitrailleuse lourde. Tient un carrefour, protège les récupérateurs.',
  },
  research: {
    name: 'Laboratoire', cls: 'structure', fem: false, key: 'L', cost: 320, buildTime: 40, hp: 850, radius: 23, sensor: 300, cap: 0, max: 1,
    desc: 'Débloque les améliorations : blindage, munitions, moteurs, récupération, radio.',
  },
  relay: {
    name: 'Mirador', cls: 'structure', fem: false, key: 'M', cost: 110, buildTime: 12, hp: 320, radius: 12, sensor: 1150, cap: 0,
    desc: 'Tour de guet avec projecteur. Dévoile une large zone. Fragile : à planter sur les routes d’approche.',
  },
};

const RESEARCH = {
  armor1:   { name: 'Plaques soudées',        cost: 200, time: 45, key: 'armor',   value: 0.15, desc: '+15 % de points de structure pour tous les véhicules et bâtiments.' },
  armor2:   { name: 'Blindage réactif',       cost: 360, time: 60, key: 'armor',   value: 0.15, requires: 'armor1', desc: '+15 % de points de structure supplémentaires.' },
  weapons1: { name: 'Munitions perforantes',  cost: 200, time: 45, key: 'weapons', value: 0.15, desc: '+15 % de dégâts pour tous les véhicules et bunkers.' },
  weapons2: { name: 'Obus à charge creuse',   cost: 360, time: 60, key: 'weapons', value: 0.15, requires: 'weapons1', desc: '+15 % de dégâts supplémentaires.' },
  engines:  { name: 'Moteurs trafiqués',      cost: 240, time: 50, key: 'engines', value: 0.20, desc: '+20 % de vitesse pour tous les véhicules.' },
  mining:   { name: 'Grues hydrauliques',     cost: 180, time: 40, key: 'mining',  value: 0.35, desc: '+35 % de vitesse de récupération et de capacité des récupérateurs.' },
  sensors:  { name: 'Radio longue portée',    cost: 150, time: 35, key: 'sensors', value: 0.40, desc: '+40 % de portée de détection.' },
};

const STANCES = {
  aggressive: { label: 'Agressif', key: 'G', glyph: '⚔', desc: 'Engage tout ennemi repéré et le poursuit sans limite.' },
  neutral:    { label: 'Neutre',   key: 'N', glyph: '◉', desc: 'Engage les ennemis à portée de tir puis revient à son poste.' },
  evasive:    { label: 'Évasif',   key: 'V', glyph: '↯', desc: 'N’engage pas. Se replie vers le bâtiment allié le plus proche s’il est attaqué.' },
};

const FORMATIONS = {
  none:   { label: 'Libre',   desc: 'Regroupement compact.' },
  delta:  { label: 'Delta',   desc: 'Pointe de flèche : les blindés devant.' },
  wall:   { label: 'Ligne',   desc: 'Ligne face à l’objectif : toutes les armes tirent en même temps.' },
  column: { label: 'Colonne', desc: 'File indienne, pratique dans les ruines et les canyons.' },
};

const DIFFICULTY = {
  easy:   { label: 'Pillard',           income: 0.75, attackSize: 10, attackGrowth: 0.5, reaction: 1.6, startBonus: 0,   firstAttack: 360, brief: 'Une bande désorganisée, peu agressive. Idéale pour apprendre les commandes et les contres.' },
  normal: { label: 'Chef de meute',     income: 1.0,  attackSize: 8,  attackGrowth: 0.8, reaction: 1.0, startBonus: 150, firstAttack: 270, brief: 'Un adversaire équilibré qui adapte sa meute à votre convoi et protège ses récupérateurs.' },
  hard:   { label: 'Seigneur de guerre', income: 1.35, attackSize: 7,  attackGrowth: 1.0, reaction: 0.6, startBonus: 400, firstAttack: 170, brief: 'Économie renforcée, raids précoces, contre‑attaques rapides. Pas de quartier.' },
};

// ============ Configuration et données de gameplay ============
const CONFIG = {
  MAPS: {
    small:  { label: 'Petite',  w: 3600, h: 2600 },
    medium: { label: 'Moyenne', w: 4800, h: 3400 },
    large:  { label: 'Grande',  w: 6400, h: 4400 },
  },
  RESOURCES: {
    low:    { label: 'Faibles',   v: 450 },
    normal: { label: 'Normales',  v: 800 },
    high:   { label: 'Élevées',   v: 1600 },
  },
  START_COLLECTORS: 3,
  BUILD_RADIUS: 440,
  ZOOM_MIN: 0.16, ZOOM_MAX: 2.4,
  ICON_ZOOM: 0.5,            // sous ce zoom, les vaisseaux deviennent des icônes stratégiques
  CAMERA_SPEED: 1100,
  REPAIR_RANGE: 280, REPAIR_RATE: 0.025,
  BASE_CAP: 24,
  AGGRO: 1.3,                // multiplicateur de portée pour l'engagement automatique (neutre)
  VIS_TICK: 0.1,
};

const FACTION = { PLAYER: 0, ENEMY: 1, NEUTRAL: 2 };
const FACTION_COLORS = {
  [FACTION.PLAYER]:  { team: '#5fd3ff', hull: '#c9d3dc', hullDark: '#6f7c8a', glow: '#8fe6ff', name: 'Flotte Kiith' },
  [FACTION.ENEMY]:   { team: '#ff5c5c', hull: '#5b5257', hullDark: '#2c2629', glow: '#ff8a8a', name: 'Flotte Taiidan' },
  [FACTION.NEUTRAL]: { team: '#9aa5b1', hull: '#5a5248', hullDark: '#3a342e', glow: '#ffffff', name: 'Neutre' },
};

const CLASSES = { utility: 'Utilitaire', fighter: 'Chasseur', corvette: 'Corvette', frigate: 'Frégate', capital: 'Vaisseau capital', structure: 'Structure' };

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
    name: 'Collecteur', plural: 'Collecteurs', cls: 'utility', key: 'C', cost: 60, buildTime: 10, hp: 170, speed: 95, radius: 10, sensor: 260, cap: 1,
    damage: 0, range: 0, fireRate: 0, capacity: 35, mineRate: 7, stance: 'evasive',
    desc: 'Extrait les minéraux des astéroïdes et les rapporte au vaisseau‑mère. Fuit les menaces par défaut.',
  },
  scout: {
    name: 'Éclaireur', plural: 'Éclaireurs', cls: 'fighter', key: 'E', cost: 40, buildTime: 6, hp: 65, speed: 240, radius: 7, sensor: 700, cap: 1,
    damage: 3, range: 150, fireRate: 0.5, weapon: 'laser', stance: 'evasive',
    desc: 'Très rapide, capteurs à longue portée. Repère l’ennemi et garde vos flancs sous surveillance.',
  },
  interceptor: {
    name: 'Intercepteur', plural: 'Intercepteurs', cls: 'fighter', key: 'I', cost: 70, buildTime: 9, hp: 115, speed: 185, radius: 8, sensor: 330, cap: 1,
    damage: 9, range: 150, fireRate: 0.45, weapon: 'laser', stance: 'neutral',
    desc: 'Chasseur d’attaque. En essaim, il harcèle les vaisseaux capitaux trop lents pour le suivre.',
  },
  corvette: {
    name: 'Corvette', plural: 'Corvettes', cls: 'corvette', key: 'V', cost: 120, buildTime: 13, hp: 270, speed: 130, radius: 11, sensor: 350, cap: 2,
    damage: 11, range: 185, fireRate: 0.3, weapon: 'flak', stance: 'neutral',
    desc: 'Canons antiaériens à tir rapide. Le fléau des chasseurs.',
  },
  assault: {
    name: 'Frégate d’assaut', short: 'Assaut', plural: 'Frégates d’assaut', cls: 'frigate', key: 'F', cost: 220, buildTime: 20, hp: 640, speed: 95, radius: 15, sensor: 390, cap: 3,
    damage: 26, range: 235, fireRate: 0.9, weapon: 'missile', stance: 'neutral',
    desc: 'Vaisseau de ligne polyvalent aux missiles guidés. Écrase les corvettes.',
  },
  ion: {
    name: 'Frégate ionique', short: 'Ionique', plural: 'Frégates ioniques', cls: 'frigate', key: 'N', cost: 270, buildTime: 24, hp: 540, speed: 85, radius: 15, sensor: 400, cap: 3,
    damage: 72, range: 310, fireRate: 2.6, weapon: 'ion', stance: 'neutral',
    desc: 'Canon ionique longue portée. Perce les vaisseaux capitaux et les structures, inutile contre les chasseurs.',
  },
  destroyer: {
    name: 'Destroyer', plural: 'Destroyers', cls: 'capital', key: 'D', cost: 620, buildTime: 46, hp: 2300, speed: 55, radius: 24, sensor: 460, cap: 6,
    damage: 95, range: 330, fireRate: 2.2, weapon: 'plasma', stance: 'neutral', requires: 'shipyard',
    desc: 'Vaisseau capital. Son artillerie à plasma pulvérise les frégates, mais les chasseurs le contournent.',
  },
};

const STRUCTURE_TYPES = {
  mothership: {
    name: 'Vaisseau‑mère', cls: 'structure', fem: false, key: null, cost: 0, buildTime: 1, hp: 5200, radius: 62, sensor: 680, cap: CONFIG.BASE_CAP,
    produces: ['collector', 'scout', 'interceptor', 'corvette', 'assault', 'ion', 'destroyer'], deposit: true, regen: 4,
    desc: 'Cœur de la flotte. Produit tous les vaisseaux, reçoit les minéraux et répare les vaisseaux à proximité.',
  },
  shipyard: {
    name: 'Chantier naval', cls: 'structure', fem: false, key: 'T', cost: 420, buildTime: 45, hp: 1500, radius: 36, sensor: 400, cap: 12,
    produces: ['corvette', 'assault', 'ion', 'destroyer'], deposit: false, regen: 0,
    desc: 'Produit frégates et destroyers, augmente la capacité de flotte de 12 et répare à proximité.',
  },
  turret: {
    name: 'Plateforme de défense', cls: 'structure', fem: true, key: 'P', cost: 150, buildTime: 18, hp: 720, radius: 15, sensor: 360, cap: 0,
    damage: 24, range: 270, fireRate: 0.6, weapon: 'laser',
    desc: 'Tourelle laser automatique. Tient un point, protège les collecteurs.',
  },
  research: {
    name: 'Module de recherche', cls: 'structure', fem: false, key: 'M', cost: 320, buildTime: 40, hp: 850, radius: 23, sensor: 300, cap: 0, max: 1,
    desc: 'Débloque les technologies : blindage, armement, propulsion, extraction, capteurs.',
  },
  relay: {
    name: 'Relais de capteurs', cls: 'structure', fem: false, key: 'L', cost: 110, buildTime: 12, hp: 320, radius: 12, sensor: 1150, cap: 0,
    desc: 'Dévoile une large zone. Peu coûteux, fragile : à placer sur les routes d’approche.',
  },
};

const RESEARCH = {
  armor1:   { name: 'Blindage composite',    cost: 200, time: 45, key: 'armor',   value: 0.15, desc: '+15 % de points de structure pour tous les vaisseaux.' },
  armor2:   { name: 'Blindage ablatif',      cost: 360, time: 60, key: 'armor',   value: 0.15, requires: 'armor1', desc: '+15 % de points de structure supplémentaires.' },
  weapons1: { name: 'Armement amélioré',     cost: 200, time: 45, key: 'weapons', value: 0.15, desc: '+15 % de dégâts pour tous les vaisseaux et plateformes.' },
  weapons2: { name: 'Armement lourd',        cost: 360, time: 60, key: 'weapons', value: 0.15, requires: 'weapons1', desc: '+15 % de dégâts supplémentaires.' },
  engines:  { name: 'Propulsion ionique',    cost: 240, time: 50, key: 'engines', value: 0.20, desc: '+20 % de vitesse pour tous les vaisseaux.' },
  mining:   { name: 'Extraction avancée',    cost: 180, time: 40, key: 'mining',  value: 0.35, desc: '+35 % de vitesse d’extraction et de capacité des collecteurs.' },
  sensors:  { name: 'Capteurs longue portée', cost: 150, time: 35, key: 'sensors', value: 0.40, desc: '+40 % de portée des capteurs.' },
};

const STANCES = {
  aggressive: { label: 'Agressif', key: 'G', glyph: '⚔', desc: 'Engage tout ennemi détecté par ses capteurs et le poursuit sans limite.' },
  neutral:    { label: 'Neutre',   key: 'N', glyph: '◉', desc: 'Engage les ennemis à portée d’armes puis revient à sa position.' },
  evasive:    { label: 'Évasif',   key: 'V', glyph: '↯', desc: 'N’engage pas. Se replie vers le bâtiment allié le plus proche s’il est attaqué.' },
};

const FORMATIONS = {
  none:   { label: 'Libre',   desc: 'Regroupement compact.' },
  delta:  { label: 'Delta',   desc: 'Pointe de flèche : les vaisseaux lourds devant.' },
  wall:   { label: 'Mur',     desc: 'Ligne face à l’objectif : toutes les armes tirent en même temps.' },
  column: { label: 'Colonne', desc: 'File indienne, pratique dans les ceintures d’astéroïdes.' },
};

const DIFFICULTY = {
  easy:   { label: 'Recrue',     income: 0.75, attackSize: 10, attackGrowth: 0.5, reaction: 1.6, startBonus: 0,   firstAttack: 360, brief: 'Un commandant prudent, peu agressif. Idéal pour apprendre les contrôles et les contres.' },
  normal: { label: 'Vétéran',    income: 1.0,  attackSize: 8,  attackGrowth: 0.8, reaction: 1.0, startBonus: 150, firstAttack: 270, brief: 'Un adversaire équilibré qui adapte sa flotte à la vôtre et défend ses collecteurs.' },
  hard:   { label: 'Amiral',     income: 1.35, attackSize: 7,  attackGrowth: 1.0, reaction: 0.6, startBonus: 400, firstAttack: 170, brief: 'Économie renforcée, vagues précoces, contre‑attaques rapides. Pas de quartier.' },
};

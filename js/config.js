// Configuration globale et définitions des unités / bâtiments
const CONFIG = {
  WORLD_W: 4200,
  WORLD_H: 3000,
  START_MINERALS: 400,
  START_HARVESTERS: 3,
  MINIMAP_W: 220,
  MINIMAP_H: 165,
  BUILD_RADIUS: 380,      // distance max d'un bâtiment existant pour construire
  AGGRO_RANGE: 1.35,      // multiplicateur de portée pour l'acquisition automatique
  ZOOM_MIN: 0.35,
  ZOOM_MAX: 2.2,
  CAMERA_SPEED: 900,
};

const FACTION = { PLAYER: 0, ENEMY: 1, NEUTRAL: 2 };

const FACTION_COLORS = {
  [FACTION.PLAYER]: { main: '#4fc3f7', dark: '#0b5f8a', light: '#b3e5fc' },
  [FACTION.ENEMY]:  { main: '#ff5252', dark: '#8a0b0b', light: '#ffb3b3' },
  [FACTION.NEUTRAL]: { main: '#9e9e9e', dark: '#424242', light: '#e0e0e0' },
};

const UNIT_TYPES = {
  harvester: {
    name: 'Collecteur', key: 'C', cost: 50, buildTime: 8, hp: 140, speed: 95, radius: 9,
    damage: 0, range: 0, fireRate: 0, capacity: 30, mineRate: 6,
    desc: 'Extrait les minéraux des astéroïdes et les ramène à la station.',
  },
  fighter: {
    name: 'Chasseur', key: 'H', cost: 75, buildTime: 9, hp: 100, speed: 170, radius: 8,
    damage: 7, range: 140, fireRate: 0.45, projectile: 'laser',
    desc: 'Intercepteur rapide et fragile. Idéal contre les collecteurs.',
  },
  frigate: {
    name: 'Frégate', key: 'F', cost: 150, buildTime: 16, hp: 280, speed: 105, radius: 12,
    damage: 20, range: 210, fireRate: 1.1, projectile: 'missile',
    desc: 'Vaisseau polyvalent à missiles guidés.',
  },
  cruiser: {
    name: 'Croiseur', key: 'R', cost: 320, buildTime: 28, hp: 750, speed: 62, radius: 18,
    damage: 55, range: 270, fireRate: 2.0, projectile: 'plasma',
    desc: 'Lent et blindé, son canon à plasma dévaste les structures.',
  },
};

const STRUCTURE_TYPES = {
  station: {
    name: 'Station', fem: true, key: null, cost: 0, buildTime: 1, hp: 2400, radius: 42,
    produces: ['harvester', 'fighter', 'frigate', 'cruiser'], deposit: true,
    desc: 'Cœur de votre empire. Produit toutes les unités et reçoit les minéraux.',
  },
  shipyard: {
    name: 'Chantier', key: 'T', cost: 250, buildTime: 30, hp: 1000, radius: 28,
    produces: ['fighter', 'frigate', 'cruiser'], deposit: false,
    desc: 'Produit les vaisseaux de combat. Permet de doubler la production.',
  },
  turret: {
    name: 'Tourelle', fem: true, key: 'O', cost: 120, buildTime: 14, hp: 550, radius: 14,
    damage: 22, range: 240, fireRate: 0.7, projectile: 'laser',
    desc: 'Défense statique à longue portée.',
  },
};

const DIFFICULTY = {
  // firstAttack : temps minimum (s) avant la première offensive de l'IA
  easy:   { label: 'Facile',    income: 0.75, attackSize: 10, attackGrowth: 0.5, reaction: 1.6, startBonus: 0,   firstAttack: 330 },
  normal: { label: 'Normal',    income: 1.0,  attackSize: 8,  attackGrowth: 0.8, reaction: 1.0, startBonus: 100, firstAttack: 240 },
  hard:   { label: 'Difficile', income: 1.35, attackSize: 7,  attackGrowth: 1.0, reaction: 0.6, startBonus: 300, firstAttack: 150 },
};

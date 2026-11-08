// ============ Données de jeu : arène, héros, sbires, tourelles, objets, difficultés ============
const CONFIG = {
  W: 5000, H: 1800,
  LANE: [[420, 1380], [1100, 1260], [1800, 1080], [2500, 900], [3200, 720], [3900, 540], [4580, 420]],
  LANE_HALF: 215,         // demi-largeur de la voie praticable
  BASE_R: 400,            // rayon des bases
  FOUNTAIN_R: 250,        // zone de soin de la citerne
  WAVE_FIRST: 20, WAVE_PERIOD: 30, SIEGE_EVERY: 3,
  START_GOLD: 500, PASSIVE_GOLD: 2.0,
  XP_RANGE: 700, MAX_LEVEL: 12,
  RESPAWN_BASE: 5, RESPAWN_PER_LVL: 2.6,
  RECALL_TIME: 6,
  ASSIST_WINDOW: 10,
  ZOOM_MIN: 0.6, ZOOM_MAX: 1.7, ZOOM_DEFAULT: 1.2,
};
function xpToNext(lvl) { return 140 + 85 * (lvl - 1); }
// Les temps de réapparition s'allongent après 15 minutes pour que les parties se concluent
function respawnTime(lvl, t = 0) { return CONFIG.RESPAWN_BASE + CONFIG.RESPAWN_PER_LVL * lvl + Math.max(0, (t - 900) / 60) * 2; }

const TEAM_INFO = {
  0: { name: 'Convoyeurs', color: '#4fb8dc', dark: '#1d5a70', light: '#bfe9f7', bar: '#3fa9d8' },
  1: { name: 'Charognards', color: '#e8503a', dark: '#7a2418', light: '#ffc2b4', bar: '#d9472f' },
};

const HEROES = {
  briseroc: {
    name: 'Brise‑Roc', title: 'Le colosse de la casse', role: 'Combattant', difficulty: 1, ranged: false, radius: 26,
    lore: 'Démolisseur de l’ancien monde, il a gardé son marteau hydraulique et en a fait une religion. Il entre le premier dans la mêlée et en ressort le dernier.',
    tip: 'Foncez avec Bélier, sonnez le groupe avec Onde de choc, puis encaissez avec Tôle soudée.',
    ratings: { Dégâts: 2, Robustesse: 3, Contrôle: 3, Mobilité: 2 },
    base: { hp: 650, hpRegen: 2.4, mana: 260, manaRegen: 2.0, ad: 62, armor: 32, resist: 30, as: 0.68, range: 62, ms: 152 },
    growth: { hp: 95, hpRegen: 0.25, mana: 38, manaRegen: 0.12, ad: 3.8, armor: 3.8, resist: 1.6, as: 0.025 },
    abilities: ['ram', 'plate', 'quake', 'roller'], skillOrder: [2, 0, 1],
    build: ['boots', 'vest', 'plates', 'tankshell', 'chainsaw', 'gasmask'],
  },
  vipere: {
    name: 'Vipère', title: 'La tireuse des dunes', role: 'Tireuse', difficulty: 2, ranged: true, radius: 21, projectile: 'bullet',
    lore: 'Chasseuse de primes née dans une tempête de sable. Son fusil a plus de soudures que de pièces d’origine, et il ne la trahit jamais.',
    tip: 'Restez derrière vos sbires, achevez-les pour l’or, posez des pièges et punissez avec Chevrotine.',
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 2, Mobilité: 2 },
    base: { hp: 540, hpRegen: 1.8, mana: 300, manaRegen: 2.2, ad: 60, armor: 22, resist: 28, as: 0.70, range: 235, ms: 148 },
    growth: { hp: 84, hpRegen: 0.18, mana: 36, manaRegen: 0.14, ad: 3.4, armor: 3.4, resist: 1.2, as: 0.03 },
    abilities: ['buckshot', 'roll', 'trap', 'lead'], skillOrder: [0, 1, 2],
    build: ['knife', 'boots', 'trigger', 'autogun', 'chainsaw', 'tankshell'],
  },
  doc: {
    name: 'Le Doc', title: 'Le médecin de la décharge', role: 'Soutien', difficulty: 2, ranged: true, radius: 21, projectile: 'dart',
    lore: 'Personne ne connaît son vrai nom. Il soigne avec ce qu’il trouve et empoisonne avec ce qui reste. Ses patients survivent, en général.',
    tip: 'Soignez vos alliés avec Seringue, accélérez-les avec Adrénaline et tenez les ennemis à distance dans le gaz.',
    ratings: { Dégâts: 1, Robustesse: 2, Contrôle: 2, Mobilité: 2 },
    base: { hp: 560, hpRegen: 2.0, mana: 360, manaRegen: 2.8, ad: 50, armor: 24, resist: 30, as: 0.62, range: 215, ms: 148 },
    growth: { hp: 82, hpRegen: 0.2, mana: 45, manaRegen: 0.18, ad: 2.8, armor: 3.4, resist: 1.4, as: 0.02 },
    abilities: ['syringe', 'gas', 'adrenaline', 'stim'], skillOrder: [0, 2, 1],
    build: ['jerrycan', 'boots', 'battery', 'medkit', 'gasmask', 'reactor'],
  },
  etincelle: {
    name: 'Étincelle', title: 'L’ingénieure foudroyante', role: 'Mage', difficulty: 3, ranged: true, radius: 21, projectile: 'spark',
    lore: 'Elle a rallumé la centrale de sa ville à seize ans. Depuis, elle transporte la foudre sur son dos et cherche quelqu’un sur qui la décharger.',
    tip: 'Visez les groupes : Arc électrique rebondit, Mine magnétique ralentit, et Tempête achève tout ce qui reste.',
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 2, Mobilité: 3 },
    base: { hp: 500, hpRegen: 1.8, mana: 360, manaRegen: 2.4, ad: 48, armor: 20, resist: 30, as: 0.62, range: 225, ms: 146 },
    growth: { hp: 80, hpRegen: 0.18, mana: 48, manaRegen: 0.16, ad: 2.6, armor: 3.2, resist: 1.4, as: 0.02 },
    abilities: ['arc', 'mine', 'overload', 'storm'], skillOrder: [0, 1, 2],
    build: ['battery', 'boots', 'coil', 'reactor', 'gasmask', 'tankshell'],
  },
};

const MINIONS = {
  melee:  { name: 'Pillard',       hp: 420, ad: 14, period: 1.1, range: 40,  ms: 118, armor: 0,  radius: 13, gold: 21, xp: 58, ranged: false },
  ranged: { name: 'Arbalétrier',   hp: 290, ad: 22, period: 1.5, range: 190, ms: 118, armor: 0,  radius: 12, gold: 15, xp: 30, ranged: true },
  siege:  { name: 'Camion‑bélier', hp: 850, ad: 42, period: 2.0, range: 230, ms: 112, armor: 25, radius: 22, gold: 55, xp: 92, ranged: true, siege: true },
};
const TOWER = { hp: 2300, dmg: 150, perMin: 8, period: 1.0, range: 300, radius: 38 };
const CORE = { hp: 3200, radius: 58 };

const ITEMS = {
  boots:      { name: 'Bottes de récup',        cost: 300,  tier: 1, stats: { ms: 22 } },
  knife:      { name: 'Couteau de boucher',     cost: 350,  tier: 1, stats: { ad: 15 } },
  bloodpump:  { name: 'Pompe à sang',           cost: 450,  tier: 1, stats: { ad: 12, lifesteal: 0.1 } },
  trigger:    { name: 'Gâchette limée',         cost: 450,  tier: 1, stats: { as: 0.22 } },
  plates:     { name: 'Plaques de carrosserie', cost: 400,  tier: 1, stats: { armor: 28 } },
  insulation: { name: 'Isolant de chantier',    cost: 400,  tier: 1, stats: { resist: 28 } },
  battery:    { name: 'Batterie de camion',     cost: 450,  tier: 1, stats: { ap: 35 } },
  jerrycan:   { name: 'Jerrican',               cost: 350,  tier: 1, stats: { mana: 250, manaRegen: 1.5 } },
  vest:       { name: 'Gilet rembourré',        cost: 400,  tier: 1, stats: { hp: 200 } },
  chainsaw:   { name: 'Tronçonneuse',           cost: 1300, tier: 2, stats: { ad: 40, as: 0.15 } },
  autogun:    { name: 'Pistolet‑mitrailleur',   cost: 1350, tier: 2, stats: { ad: 25, as: 0.35, lifesteal: 0.08 } },
  reactor:    { name: 'Réacteur portatif',      cost: 1400, tier: 2, stats: { ap: 80, mana: 300 } },
  tankshell:  { name: 'Carapace de char',       cost: 1400, tier: 2, stats: { hp: 400, armor: 40 } },
  gasmask:    { name: 'Masque intégral',        cost: 1300, tier: 2, stats: { hp: 300, resist: 45 } },
  medkit:     { name: 'Trousse de chirurgien',  cost: 1200, tier: 2, stats: { ap: 40, hp: 200, manaRegen: 2, healPower: 0.2 } },
  coil:       { name: 'Bobine instable',        cost: 1350, tier: 2, stats: { ap: 60, cdr: 0.15 } },
};
const STAT_LABELS = {
  hp: ['Points de vie', v => '+' + v], mana: ['Énergie', v => '+' + v], ad: ['Dégâts d’attaque', v => '+' + v], ap: ['Puissance', v => '+' + v],
  armor: ['Blindage', v => '+' + v], resist: ['Isolation', v => '+' + v], as: ['Vitesse d’attaque', v => '+' + Math.round(v * 100) + ' %'],
  ms: ['Vitesse', v => '+' + v], lifesteal: ['Vol de vie', v => '+' + Math.round(v * 100) + ' %'], cdr: ['Réduction des délais', v => '+' + Math.round(v * 100) + ' %'],
  manaRegen: ['Régén. d’énergie', v => '+' + v + '/s'], hpRegen: ['Régén. de vie', v => '+' + v + '/s'], healPower: ['Puissance des soins', v => '+' + Math.round(v * 100) + ' %'],
};

const DIFFICULTY = {
  easy:   { label: 'Recrue',      reaction: 0.55, skill: 0.35, aggression: -0.15, lastHit: 0.55, brief: 'Des bots hésitants qui ratent des sbires et utilisent peu leurs compétences. Idéal pour découvrir le genre.' },
  normal: { label: 'Vétéran',     reaction: 0.35, skill: 0.7,  aggression: 0,     lastHit: 0.85, brief: 'Des bots qui farment, combinent leurs compétences et se replient quand ça tourne mal.' },
  hard:   { label: 'Impitoyable', reaction: 0.2,  skill: 1,    aggression: 0.15,  lastHit: 1,    brief: 'Des bots précis et agressifs qui plongent sur les héros affaiblis. Pas de quartier.' },
};

// ============ Données : carte, héros, sbires, monstres, structures, objets ============
const CONFIG = {
  W: 5000, H: 5000,
  BASE_CENTER: [700, 4300], BASE_R: 950,
  FOUNTAIN: [290, 4710], FOUNTAIN_R: 330, SHOP_R: 760,
  NEXUS: [590, 4410],
  NEXUS_TOWERS: [[840, 4470], [530, 4160]],
  WAVE_FIRST: 25, WAVE_PERIOD: 30, SIEGE_EVERY: 3,
  START_GOLD: 500, PASSIVE_GOLD: 2.0,
  XP_RANGE: 700, MAX_LEVEL: 18,
  RESPAWN_BASE: 6, RESPAWN_PER_LVL: 2.0,
  RECALL_TIME: 6, ASSIST_WINDOW: 10,
  INHIB_RESPAWN: 240,
  VISION: { hero: 650, minion: 420, tower: 700, inhib: 450, nexus: 700, fountain: 900 },
  ZOOM_MIN: 0.7, ZOOM_MAX: 1.45,
  TOWER_PROGRESS: { top: [2650, 1500, 760], mid: [1900, 1250, 620], bot: [2650, 1500, 760] },
};
// Voies, de la base bleue vers la base rouge (la voie basse est le reflet de la voie haute)
const LANE_POINTS = (() => {
  const S = [700, 4300], E = [4300, 700];
  const top = [S, [560, 3700], [560, 1050], [720, 720], [1050, 560], [3700, 560], E];
  const bot = top.map(p => [CONFIG.W - p[0], CONFIG.H - p[1]]).reverse();
  return { top, mid: [S, [2500, 2500], E], bot };
})();
const LANES = ['top', 'mid', 'bot'];
const LANE_NAMES = { top: 'Voie haute', mid: 'Voie du milieu', bot: 'Voie basse' };
function xpToNext(lvl) { return 150 + 90 * (lvl - 1); }
function respawnTime(lvl, t = 0) { return CONFIG.RESPAWN_BASE + CONFIG.RESPAWN_PER_LVL * lvl + Math.max(0, (t - 900) / 60) * 1.5; }

const TEAM_INFO = {
  0: { name: 'Convoyeurs', color: '#3fb6e8', dark: '#164f6a', light: '#bfeaff', bar: '#3aa6dd', hex: 0x3fb6e8 },
  1: { name: 'Charognards', color: '#ef4a32', dark: '#7a2014', light: '#ffc0b0', bar: '#de3f2a', hex: 0xef4a32 },
};

const ROLES = {
  top:     { label: 'Haut',    lane: 'top', desc: 'Duel en voie haute. Combattants et colosses.' },
  jungle:  { label: 'Jungle',  lane: null,  desc: 'Nettoie les camps, prend les objectifs et aide les voies.' },
  mid:     { label: 'Milieu',  lane: 'mid', desc: 'Voie la plus courte. Mages et assassins.' },
  adc:     { label: 'Tireur',  lane: 'bot', desc: 'Voie basse avec le soutien. Dégâts continus en fin de partie.' },
  support: { label: 'Soutien', lane: 'bot', desc: 'Protège le tireur, contrôle et soigne.' },
};
const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support'];

const HEROES = {
  briseroc: {
    name: 'Brise‑Roc', title: 'Le colosse de la casse', role: 'Combattant', roles: ['top', 'jungle'], difficulty: 1, ranged: false, radius: 26,
    lore: 'Démolisseur de l’ancien monde, il a gardé son marteau hydraulique et en a fait une religion. Il entre le premier dans la mêlée et en ressort le dernier.',
    tip: 'Foncez avec Bélier, sonnez le groupe avec Onde de choc, puis encaissez avec Tôle soudée.',
    ratings: { Dégâts: 2, Robustesse: 3, Contrôle: 3, Mobilité: 2 },
    base: { hp: 680, hpRegen: 2.6, mana: 280, manaRegen: 2.0, ad: 64, armor: 34, resist: 30, as: 0.68, range: 62, ms: 168 },
    growth: { hp: 98, hpRegen: 0.25, mana: 38, manaRegen: 0.12, ad: 3.6, armor: 3.8, resist: 1.6, as: 0.022 },
    abilities: ['ram', 'plate', 'quake', 'roller'], skillOrder: [2, 0, 1],
    build: ['boots', 'vest', 'bootsArmor', 'exoarmor', 'tankshell', 'gasmask', 'chainsaw'],
  },
  vipere: {
    name: 'Vipère', title: 'La tireuse des dunes', role: 'Tireuse', roles: ['adc'], difficulty: 2, ranged: true, radius: 21, projectile: 'bullet',
    lore: 'Chasseuse de primes née dans une tempête de sable. Son fusil a plus de soudures que de pièces d’origine, et il ne la trahit jamais.',
    tip: 'Restez derrière vos sbires, achevez-les pour l’or, posez des pièges et punissez avec Chevrotine.',
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 2, Mobilité: 2 },
    base: { hp: 560, hpRegen: 1.8, mana: 300, manaRegen: 2.2, ad: 60, armor: 24, resist: 28, as: 0.70, range: 240, ms: 164 },
    growth: { hp: 86, hpRegen: 0.18, mana: 36, manaRegen: 0.14, ad: 3.2, armor: 3.4, resist: 1.2, as: 0.028 },
    abilities: ['buckshot', 'roll', 'trap', 'lead'], skillOrder: [0, 1, 2],
    build: ['knife', 'boots', 'railgun', 'bootsAtk', 'autogun', 'vampire', 'gasmask'],
  },
  doc: {
    name: 'Le Doc', title: 'Le médecin de la décharge', role: 'Soutien', roles: ['support'], difficulty: 2, ranged: true, radius: 21, projectile: 'dart',
    lore: 'Personne ne connaît son vrai nom. Il soigne avec ce qu’il trouve et empoisonne avec ce qui reste. Ses patients survivent, en général.',
    tip: 'Soignez vos alliés avec Seringue, accélérez-les avec Adrénaline et tenez les ennemis à distance dans le gaz.',
    ratings: { Dégâts: 1, Robustesse: 2, Contrôle: 2, Mobilité: 2 },
    base: { hp: 570, hpRegen: 2.0, mana: 360, manaRegen: 2.8, ad: 50, armor: 26, resist: 30, as: 0.62, range: 220, ms: 164 },
    growth: { hp: 84, hpRegen: 0.2, mana: 45, manaRegen: 0.18, ad: 2.8, armor: 3.4, resist: 1.4, as: 0.02 },
    abilities: ['syringe', 'gas', 'adrenaline', 'stim'], skillOrder: [0, 2, 1],
    build: ['jerrycan', 'boots', 'medkit', 'bootsMag', 'reactor', 'gasmask'],
  },
  etincelle: {
    name: 'Étincelle', title: 'L’ingénieure foudroyante', role: 'Mage', roles: ['mid'], difficulty: 3, ranged: true, radius: 21, projectile: 'spark',
    lore: 'Elle a rallumé la centrale de sa ville à seize ans. Depuis, elle transporte la foudre sur son dos et cherche quelqu’un sur qui la décharger.',
    tip: 'Visez les groupes : Arc électrique rebondit, Mine magnétique ralentit, et Tempête achève tout ce qui reste.',
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 2, Mobilité: 3 },
    base: { hp: 530, hpRegen: 1.8, mana: 380, manaRegen: 2.5, ad: 48, armor: 22, resist: 30, as: 0.62, range: 230, ms: 162 },
    growth: { hp: 82, hpRegen: 0.18, mana: 48, manaRegen: 0.16, ad: 2.6, armor: 3.2, resist: 1.4, as: 0.02 },
    abilities: ['arc', 'mine', 'overload', 'storm'], skillOrder: [0, 1, 2],
    build: ['battery', 'boots', 'tesla', 'bootsMag', 'reactor', 'gasmask'],
  },
  rempart: {
    name: 'Rempart', title: 'Le dernier gardien', role: 'Tank', roles: ['support', 'top'], difficulty: 1, ranged: false, radius: 25,
    lore: 'Ancien gendarme d’un monde qui n’existe plus. Il a gardé son bouclier anti‑émeute et sa conviction qu’on ne passe pas.',
    tip: 'Engagez avec Charge au bouclier, retenez l’ennemi avec Provocation et protégez votre équipe avec Mur de boucliers.',
    ratings: { Dégâts: 1, Robustesse: 3, Contrôle: 3, Mobilité: 2 },
    base: { hp: 700, hpRegen: 2.8, mana: 300, manaRegen: 2.2, ad: 56, armor: 38, resist: 32, as: 0.64, range: 62, ms: 166 },
    growth: { hp: 102, hpRegen: 0.28, mana: 40, manaRegen: 0.14, ad: 3.0, armor: 4.2, resist: 1.8, as: 0.018 },
    abilities: ['shieldbash', 'shieldwall', 'taunt', 'bastion'], skillOrder: [0, 2, 1],
    build: ['vest', 'boots', 'kevlar', 'bootsArmor', 'spikes', 'gasmask', 'tankshell'],
  },
  crocs: {
    name: 'Crocs', title: 'Le mutant des fourrés', role: 'Assassin', roles: ['jungle'], difficulty: 3, ranged: false, radius: 22,
    lore: 'Enfant perdu dans les zones irradiées, il en est revenu avec des griffes, des yeux qui voient la nuit et un appétit qui ne se calme jamais.',
    tip: 'Nettoyez les camps, surgissez avec Bond et achevez les fuyards avec Curée.',
    ratings: { Dégâts: 3, Robustesse: 2, Contrôle: 1, Mobilité: 3 },
    base: { hp: 600, hpRegen: 2.4, mana: 260, manaRegen: 2.2, ad: 66, armor: 28, resist: 30, as: 0.72, range: 58, ms: 172 },
    growth: { hp: 90, hpRegen: 0.22, mana: 34, manaRegen: 0.12, ad: 3.8, armor: 3.4, resist: 1.4, as: 0.03 },
    abilities: ['pounce', 'rend', 'frenzy', 'hunt'], skillOrder: [1, 0, 2],
    build: ['knife', 'boots', 'bloodpump', 'bootsAtk', 'vampire', 'chainsaw', 'tankshell'],
  },
  cendre: {
    name: 'Cendre', title: 'La pyromane du raffinerie', role: 'Mage', roles: ['mid', 'support'], difficulty: 2, ranged: true, radius: 22, projectile: 'ember',
    lore: 'Elle a grandi entre les cuves d’une raffinerie en flammes. Elle ne s’est jamais éloignée du feu, et le feu ne s’est jamais éloigné d’elle.',
    tip: 'Enflammez vos cibles avec Lance‑flammes : Combustion inflige bien plus de dégâts aux ennemis qui brûlent.',
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 2, Mobilité: 1 },
    base: { hp: 540, hpRegen: 1.9, mana: 370, manaRegen: 2.4, ad: 50, armor: 22, resist: 30, as: 0.62, range: 225, ms: 162 },
    growth: { hp: 84, hpRegen: 0.18, mana: 46, manaRegen: 0.16, ad: 2.6, armor: 3.2, resist: 1.4, as: 0.02 },
    abilities: ['flamer', 'molotov', 'ignite', 'inferno'], skillOrder: [0, 2, 1],
    build: ['battery', 'boots', 'reactor', 'bootsMag', 'tesla', 'gasmask'],
  },
  mecano: {
    name: 'Mécano', title: 'Le bricoleur blindé', role: 'Combattant', roles: ['top', 'jungle'], difficulty: 2, ranged: false, radius: 24,
    lore: 'Il a construit sa première tourelle avec une machine à laver. Aujourd’hui, il porte sur son dos un exosquelette qui pourrait soulever un camion.',
    tip: 'Posez une tourelle portative avant le combat, sautez dans la mêlée avec Ressort et enfilez l’exosquelette pour finir le travail.',
    ratings: { Dégâts: 2, Robustesse: 3, Contrôle: 2, Mobilité: 2 },
    base: { hp: 650, hpRegen: 2.5, mana: 290, manaRegen: 2.1, ad: 63, armor: 32, resist: 30, as: 0.67, range: 64, ms: 166 },
    growth: { hp: 94, hpRegen: 0.24, mana: 38, manaRegen: 0.13, ad: 3.5, armor: 3.6, resist: 1.5, as: 0.024 },
    abilities: ['wrench', 'turret', 'spring', 'exo'], skillOrder: [0, 1, 2],
    build: ['knife', 'boots', 'hydraulics', 'bootsArmor', 'chainsaw', 'exoarmor', 'gasmask'],
  },
};

const MINIONS = {
  melee:  { name: 'Pillard',       hp: 440,  ad: 14, period: 1.1, range: 40,  ms: 150, armor: 0,  resist: 0,  radius: 13, gold: 21, xp: 60, ranged: false },
  ranged: { name: 'Arbalétrier',   hp: 300,  ad: 22, period: 1.5, range: 190, ms: 150, armor: 0,  resist: 0,  radius: 12, gold: 15, xp: 30, ranged: true },
  siege:  { name: 'Camion‑bélier', hp: 900,  ad: 44, period: 2.0, range: 230, ms: 142, armor: 25, resist: 0,  radius: 22, gold: 55, xp: 95, ranged: true, siege: true },
  super:  { name: 'Mastodonte',    hp: 1800, ad: 120, period: 0.9, range: 50, ms: 150, armor: 60, resist: 40, radius: 24, gold: 40, xp: 100, ranged: false, super: true },
};

const MONSTERS = {
  wolfAlpha:  { name: 'Chef de meute',     hp: 1150, ad: 26, period: 1.2, range: 50,  radius: 21, armor: 12, resist: 0,  gold: 60,  xp: 85 },
  wolf:       { name: 'Chien sauvage',     hp: 420,  ad: 16, period: 1.1, range: 45,  radius: 15, armor: 8,  resist: 0,  gold: 18,  xp: 30 },
  vultureBig: { name: 'Grand vautour',     hp: 900,  ad: 22, period: 1.2, range: 150, radius: 19, armor: 10, resist: 0,  gold: 50,  xp: 60, ranged: true },
  vulture:    { name: 'Vautour',           hp: 280,  ad: 11, period: 1.0, range: 140, radius: 12, armor: 0,  resist: 0,  gold: 12,  xp: 18, ranged: true },
  golem:      { name: 'Golem de ferraille', hp: 1350, ad: 32, period: 1.5, range: 55,  radius: 27, armor: 22, resist: 10, gold: 60,  xp: 90 },
  golemSmall: { name: 'Petit golem',       hp: 650,  ad: 22, period: 1.3, range: 45,  radius: 18, armor: 14, resist: 5,  gold: 30,  xp: 45 },
  toad:       { name: 'Crapaud mutant',    hp: 1550, ad: 30, period: 1.4, range: 170, radius: 27, armor: 10, resist: 10, gold: 80,  xp: 110, ranged: true },
  blueBuff:   { name: 'Noyau radioactif',  hp: 2100, ad: 38, period: 1.6, range: 60,  radius: 32, armor: 18, resist: 18, gold: 100, xp: 150, buff: 'blue' },
  redBuff:    { name: 'Bête écarlate',     hp: 2100, ad: 44, period: 1.5, range: 60,  radius: 32, armor: 18, resist: 18, gold: 100, xp: 150, buff: 'red' },
  worm:       { name: 'Ver des sables',    hp: 4600, ad: 110, period: 1.8, range: 260, radius: 48, armor: 30, resist: 30, gold: 120, xp: 260, ranged: true, epic: 'worm' },
  titan:      { name: 'Titan de rouille',  hp: 9000, ad: 170, period: 1.6, range: 120, radius: 62, armor: 60, resist: 50, gold: 300, xp: 600, epic: 'titan' },
};
// Camps côté bleu ; le côté rouge est le reflet par le centre de la carte
const CAMPS = [
  { id: 'blue',    name: 'Noyau radioactif', x: 1150, y: 2350, mobs: ['blueBuff'],                                 first: 80, respawn: 150 },
  { id: 'wolves',  name: 'Meute',           x: 1450, y: 2900, mobs: ['wolfAlpha', 'wolf', 'wolf'],                first: 80, respawn: 110 },
  { id: 'toad',    name: 'Crapaud',         x: 950,  y: 1850, mobs: ['toad'],                                     first: 80, respawn: 110 },
  { id: 'red',     name: 'Bête écarlate',   x: 2650, y: 3850, mobs: ['redBuff'],                                  first: 80, respawn: 150 },
  { id: 'vultures',name: 'Vautours',        x: 2150, y: 3550, mobs: ['vultureBig', 'vulture', 'vulture', 'vulture'], first: 80, respawn: 110 },
  { id: 'golems',  name: 'Golems',          x: 3200, y: 4000, mobs: ['golem', 'golemSmall'],                      first: 80, respawn: 110 },
];
const EPICS = [
  { id: 'worm',  name: 'Ver des sables',   x: 3520, y: 3520, mobs: ['worm'],  first: 300, respawn: 300 },
  { id: 'titan', name: 'Titan de rouille', x: 1480, y: 1480, mobs: ['titan'], first: 900, respawn: 420 },
];
const BUFFS = {
  blue:  { name: 'Noyau radioactif', dur: 120, desc: '+20 % de réduction des délais et +6 énergie/s.' },
  red:   { name: 'Sang de la bête',  dur: 120, desc: 'Les attaques brûlent et ralentissent la cible.' },
  titan: { name: 'Faveur du Titan',  dur: 180, desc: '+40 dégâts d’attaque et de puissance. Les sbires proches deviennent plus forts.' },
};

const TOWER = { hp: 3000, dmg: 155, perMin: 7, period: 1.0, range: 320, radius: 38 };
const INHIB = { hp: 2200, radius: 36 };
const NEXUS = { hp: 4500, radius: 62 };

// ---------- Objets : composants, intermédiaires, légendaires ----------
const ITEM_DEFS = {
  // Composants
  knife:      { name: 'Couteau de boucher',   tier: 1, cat: 'atk', recipe: 350, stats: { ad: 10 } },
  pipe:       { name: 'Barre à mine',         tier: 1, cat: 'atk', recipe: 875, stats: { ad: 25 } },
  trigger:    { name: 'Gâchette limée',       tier: 1, cat: 'atk', recipe: 300, stats: { as: 0.12 } },
  scope:      { name: 'Lunette fêlée',        tier: 1, cat: 'atk', recipe: 400, stats: { crit: 0.15 } },
  plates:     { name: 'Plaques de tôle',      tier: 1, cat: 'def', recipe: 300, stats: { armor: 15 } },
  insulation: { name: 'Isolant de chantier',  tier: 1, cat: 'def', recipe: 400, stats: { resist: 20 } },
  vest:       { name: 'Gilet rembourré',      tier: 1, cat: 'def', recipe: 400, stats: { hp: 150 } },
  vial:       { name: 'Fiole verte',          tier: 1, cat: 'def', recipe: 250, stats: { hpRegen: 3 } },
  battery:    { name: 'Batterie de voiture',  tier: 1, cat: 'mag', recipe: 400, stats: { ap: 20 } },
  capacitor:  { name: 'Gros condensateur',    tier: 1, cat: 'mag', recipe: 850, stats: { ap: 40 } },
  jerrycan:   { name: 'Jerrican',             tier: 1, cat: 'mag', recipe: 350, stats: { mana: 250 } },
  gear:       { name: 'Engrenage',            tier: 1, cat: 'mag', recipe: 300, stats: { cdr: 0.06 } },
  boots:      { name: 'Bottes de récup',      tier: 1, cat: 'spd', recipe: 300, stats: { ms: 25 } },
  potion:     { name: 'Potion de rafistolage', tier: 0, cat: 'use', recipe: 50, stats: {}, consumable: true, stack: 5, desc: 'Rend 150 PV en 12 s. Clic sur l’objet ou touche de l’emplacement.' },
  // Intermédiaires
  bloodpump:  { name: 'Pompe à sang',         tier: 2, cat: 'atk', from: ['knife', 'vial'], recipe: 400, stats: { ad: 15, lifesteal: 0.1 } },
  revolver:   { name: 'Revolver à barillet',  tier: 2, cat: 'atk', from: ['trigger', 'knife'], recipe: 350, stats: { ad: 15, as: 0.2 } },
  sight:      { name: 'Viseur laser',         tier: 2, cat: 'atk', from: ['scope', 'trigger'], recipe: 300, stats: { crit: 0.2, as: 0.15 } },
  hydraulics: { name: 'Vérin hydraulique',    tier: 2, cat: 'atk', from: ['knife', 'gear'], recipe: 350, stats: { ad: 18, cdr: 0.1 } },
  kevlar:     { name: 'Gilet pare‑balles',    tier: 2, cat: 'def', from: ['plates', 'vest'], recipe: 300, stats: { armor: 25, hp: 200 } },
  faraday:    { name: 'Cage de Faraday',      tier: 2, cat: 'def', from: ['insulation', 'vest'], recipe: 300, stats: { resist: 30, hp: 200 } },
  bulwark:    { name: 'Pavois',               tier: 2, cat: 'def', from: ['vest', 'vest'], recipe: 350, stats: { hp: 380 } },
  coil:       { name: 'Bobine de cuivre',     tier: 2, cat: 'mag', from: ['battery', 'gear'], recipe: 350, stats: { ap: 30, cdr: 0.1 } },
  generator:  { name: 'Groupe électrogène',   tier: 2, cat: 'mag', from: ['jerrycan', 'battery'], recipe: 300, stats: { ap: 25, mana: 300 } },
  bootsArmor: { name: 'Rangers ferrés',       tier: 2, cat: 'spd', from: ['boots', 'plates'], recipe: 300, stats: { ms: 35, armor: 20 } },
  bootsAtk:   { name: 'Bottes de pillard',    tier: 2, cat: 'spd', from: ['boots', 'trigger'], recipe: 300, stats: { ms: 35, as: 0.25 } },
  bootsMag:   { name: 'Bottes isolées',       tier: 2, cat: 'spd', from: ['boots', 'gear'], recipe: 300, stats: { ms: 35, cdr: 0.1 } },
  // Légendaires
  chainsaw:   { name: 'Tronçonneuse',         tier: 3, cat: 'atk', from: ['pipe', 'hydraulics'], recipe: 500, stats: { ad: 55, cdr: 0.15, hp: 200 } },
  railgun:    { name: 'Fusil de rail',        tier: 3, cat: 'atk', from: ['pipe', 'sight'], recipe: 600, stats: { ad: 50, crit: 0.25 }, passive: 'Les coups critiques infligent 225 % des dégâts au lieu de 175 %.' },
  autogun:    { name: 'Mitrailleuse lourde',  tier: 3, cat: 'atk', from: ['revolver', 'sight'], recipe: 500, stats: { ad: 20, as: 0.4, crit: 0.25 } },
  vampire:    { name: 'Sangsue',              tier: 3, cat: 'atk', from: ['bloodpump', 'pipe'], recipe: 400, stats: { ad: 45, lifesteal: 0.18 } },
  exoarmor:   { name: 'Exo‑armure',           tier: 3, cat: 'def', from: ['hydraulics', 'bulwark'], recipe: 550, stats: { ad: 35, hp: 400, cdr: 0.1 } },
  tankshell:  { name: 'Carapace de char',     tier: 3, cat: 'def', from: ['kevlar', 'bulwark'], recipe: 500, stats: { hp: 450, armor: 50 } },
  gasmask:    { name: 'Masque intégral',      tier: 3, cat: 'def', from: ['faraday', 'bulwark'], recipe: 500, stats: { hp: 400, resist: 55 } },
  spikes:     { name: 'Armure à pointes',     tier: 3, cat: 'def', from: ['kevlar', 'plates'], recipe: 600, stats: { armor: 70, hp: 200, thorns: 0.25 }, passive: 'Renvoie 25 % des dégâts des attaques reçues.' },
  reactor:    { name: 'Réacteur portatif',    tier: 3, cat: 'mag', from: ['capacitor', 'generator'], recipe: 600, stats: { ap: 90, mana: 400 } },
  tesla:      { name: 'Bobine instable',      tier: 3, cat: 'mag', from: ['capacitor', 'coil'], recipe: 600, stats: { ap: 75, cdr: 0.2 } },
  medkit:     { name: 'Trousse de chirurgien', tier: 3, cat: 'mag', from: ['coil', 'vest'], recipe: 650, stats: { ap: 40, hp: 250, cdr: 0.1, healPower: 0.25 } },
};
// Coût total = recette + coût total des composants
const ITEMS = {};
(function resolve() {
  const total = id => { const d = ITEM_DEFS[id]; return d.recipe + (d.from || []).reduce((s, c) => s + total(c), 0); };
  for (const id in ITEM_DEFS) ITEMS[id] = { ...ITEM_DEFS[id], id, cost: total(id), into: [] };
  for (const id in ITEMS) for (const c of (ITEMS[id].from || [])) if (!ITEMS[c].into.includes(id)) ITEMS[c].into.push(id);
})();
const ITEM_CATS = { all: 'Tout', atk: 'Attaque', mag: 'Puissance', def: 'Défense', spd: 'Bottes', use: 'Consommables' };
const STAT_LABELS = {
  hp: ['Points de vie', v => '+' + v], mana: ['Énergie', v => '+' + v], ad: ['Dégâts d’attaque', v => '+' + v], ap: ['Puissance', v => '+' + v],
  armor: ['Blindage', v => '+' + v], resist: ['Isolation', v => '+' + v], as: ['Vitesse d’attaque', v => '+' + Math.round(v * 100) + ' %'],
  ms: ['Vitesse', v => '+' + v], lifesteal: ['Vol de vie', v => '+' + Math.round(v * 100) + ' %'], cdr: ['Réduction des délais', v => '+' + Math.round(v * 100) + ' %'],
  crit: ['Chance de critique', v => '+' + Math.round(v * 100) + ' %'], hpRegen: ['Régénération', v => '+' + v + ' PV/s'],
  healPower: ['Puissance des soins', v => '+' + Math.round(v * 100) + ' %'], thorns: ['Épines', v => Math.round(v * 100) + ' %'],
};

const DIFFICULTY = {
  easy:   { label: 'Recrue',      reaction: 0.55, skill: 0.35, aggression: -0.15, lastHit: 0.55, brief: 'Des bots hésitants qui ratent des sbires et utilisent peu leurs compétences. Idéal pour découvrir le genre.' },
  normal: { label: 'Vétéran',     reaction: 0.35, skill: 0.7,  aggression: 0,     lastHit: 0.85, brief: 'Des bots qui farment, combinent leurs compétences, prennent les objectifs et se replient quand ça tourne mal.' },
  hard:   { label: 'Impitoyable', reaction: 0.2,  skill: 1,    aggression: 0.15,  lastHit: 1,    brief: 'Des bots précis et agressifs qui plongent sur les héros affaiblis et punissent chaque erreur.' },
};

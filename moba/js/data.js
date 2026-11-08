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
  rouille: {
    name: 'Mère Rouille', title: 'La matriarche de la casse', role: 'Tank', roles: ['top', 'support'], difficulty: 1, ranged: false, radius: 26, passive: 'scrap',
    lore: 'Elle tenait la plus grande casse de la rocade bien avant la Chute. Quand le monde s’est effondré, elle a simplement continué : tout ce qui tombe finit chez elle. Les gamins du convoi l’appellent Mémé. Ceux qui lui doivent de l’argent ne l’appellent pas du tout.',
    identity: 'Gouailleuse, protectrice, rancunière. Elle traite ses alliés comme ses petits‑enfants et ses ennemis comme de la ferraille à trier.',
    quote: 'Tout ce qui est en métal m’appartient. Et toi, mon grand, t’as beaucoup de métal.',
    tip: 'Accrochez une cible avec Grappin, faites‑la décoller avec Presse hydraulique, puis transformez votre ferraille en bouclier.',
    voice: { pick: ['On va faire le tri.'], ult: ['Viens voir Mémé !', 'Tout le monde à la casse !'], kill: ['À la casse.', 'Encore un pour la pile.'], death: ['J’ai connu pire…'], respawn: ['Bon. Où on en était ?'] },
    ratings: { Dégâts: 1, Robustesse: 3, Contrôle: 3, Mobilité: 1 },
    base: { hp: 700, hpRegen: 2.8, mana: 300, manaRegen: 2.1, ad: 60, armor: 36, resist: 32, as: 0.64, range: 64, ms: 164 },
    growth: { hp: 104, hpRegen: 0.28, mana: 40, manaRegen: 0.14, ad: 3.2, armor: 4.0, resist: 1.8, as: 0.018 },
    abilities: ['hook', 'scrapshield', 'press', 'magnet'], skillOrder: [0, 2, 1],
    build: ['vest', 'boots', 'kevlar', 'bootsArmor', 'tankshell', 'spikes', 'gasmask'],
  },
  goudron: {
    name: 'Frère Goudron', title: 'Le pèlerin de l’autoroute', role: 'Combattant', roles: ['top', 'jungle'], difficulty: 2, ranged: false, radius: 24, passive: 'pilgrim',
    lore: 'Il arpente l’autoroute A‑7 depuis onze ans, du nord au sud et retour, pieds nus dans le bitume fondu. Il ne parle qu’une fois par jour. Les Charognards ont cessé de l’attaquer quand ils ont compris qu’il comptait ses pas, et les leurs.',
    identity: 'Serein, laconique, implacable. Chaque combat n’est qu’une étape de son pèlerinage, et il n’aime pas qu’on l’interrompe.',
    quote: 'Chaque pas est une prière. Chaque coup aussi.',
    tip: 'Marchez pour remplir la Ferveur, engluez une cible avec Paume de goudron, puis faites taire tout le groupe avec Vœu de silence.',
    voice: { pick: ['En marche.'], ult: ['Silence.', 'Écoutez.'], kill: ['Ton chemin s’arrête ici.'], death: ['Je reprendrai la route.'], respawn: ['Un pas, puis un autre.'] },
    ratings: { Dégâts: 2, Robustesse: 2, Contrôle: 3, Mobilité: 2 },
    base: { hp: 640, hpRegen: 2.5, mana: 290, manaRegen: 2.0, ad: 64, armor: 32, resist: 32, as: 0.68, range: 62, ms: 168 },
    growth: { hp: 94, hpRegen: 0.24, mana: 38, manaRegen: 0.13, ad: 3.6, armor: 3.6, resist: 1.8, as: 0.024 },
    abilities: ['tarpalm', 'vow', 'slowmarch', 'sermon'], skillOrder: [0, 1, 2],
    build: ['knife', 'boots', 'hydraulics', 'bootsArmor', 'chainsaw', 'exoarmor', 'gasmask'],
  },
  louve: {
    name: 'Louve', title: 'L’enfant de la meute', role: 'Assassin', roles: ['jungle'], difficulty: 3, ranged: false, radius: 22, claws: true, passive: 'scent',
    lore: 'Les chiens mutants l’ont trouvée dans un landau renversé, au bord du cratère de Valmont, et ils l’ont gardée. Elle porte le crâne de l’ancienne cheffe de meute et n’a jamais vraiment choisi entre parler et grogner.',
    identity: 'Sauvage, loyale, affamée. Elle ne chasse jamais vraiment seule : la meute hurle dans sa tête.',
    quote: 'La meute a faim.',
    tip: 'Le Flair révèle les ennemis blessés : bondissez sur eux, marquez‑les avec Curée et finissez‑les avant qu’ils n’atteignent leur tourelle.',
    voice: { pick: ['On chasse.'], ult: ['À moi !', 'Curée !'], kill: ['Proie.', 'La meute mange.'], death: ['La meute… se souviendra.'], respawn: ['*renifle*… Du sang.'] },
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 2, Mobilité: 3 },
    base: { hp: 590, hpRegen: 2.4, mana: 260, manaRegen: 2.2, ad: 66, armor: 28, resist: 30, as: 0.72, range: 58, ms: 172 },
    growth: { hp: 88, hpRegen: 0.22, mana: 34, manaRegen: 0.12, ad: 3.9, armor: 3.3, resist: 1.4, as: 0.03 },
    abilities: ['pounce', 'fangs', 'howl', 'quarry'], skillOrder: [0, 1, 2],
    build: ['knife', 'boots', 'bloodpump', 'bootsAtk', 'vampire', 'chainsaw', 'tankshell'],
  },
  silo: {
    name: 'Vieux Silo', title: 'Le gardien du réservoir', role: 'Tank', roles: ['jungle', 'top'], difficulty: 2, ranged: false, radius: 28, passive: 'reserve',
    lore: 'Pendant la Grande Sécheresse, il a porté sur son dos la dernière citerne d’eau potable de la vallée, de village en village, trois étés durant. Le réservoir ne l’a jamais quitté. Il dit que l’eau se souvient de tous ceux qu’elle a sauvés, et de tous ceux qu’elle a noyés.',
    identity: 'Lent, patient, inébranlable. Un géant bourru qui se place toujours entre le danger et les plus faibles.',
    quote: 'L’eau finit toujours par passer.',
    tip: 'Plongez au milieu des ennemis, trempez‑les dans une Flaque pour que toute l’équipe frappe plus fort, puis lâchez la digue.',
    voice: { pick: ['Je porte. Comme toujours.'], ult: ['Ouvrez les vannes !'], kill: ['Emporté par le courant.'], death: ['La citerne est vide.'], respawn: ['Plein à ras bord.'] },
    ratings: { Dégâts: 1, Robustesse: 3, Contrôle: 3, Mobilité: 2 },
    base: { hp: 720, hpRegen: 3.0, mana: 300, manaRegen: 2.1, ad: 62, armor: 36, resist: 32, as: 0.62, range: 66, ms: 164 },
    growth: { hp: 108, hpRegen: 0.3, mana: 40, manaRegen: 0.14, ad: 3.3, armor: 4.0, resist: 1.8, as: 0.016 },
    abilities: ['jet', 'puddle', 'dive', 'flood'], skillOrder: [2, 0, 1],
    build: ['vest', 'boots', 'bulwark', 'bootsArmor', 'tankshell', 'gasmask', 'exoarmor'],
  },
  neon: {
    name: 'Néon', title: 'La gamine du réseau', role: 'Mage', roles: ['mid'], difficulty: 3, ranged: true, radius: 20, projectile: 'spark', passive: 'surge',
    lore: 'Quatorze ans, des patins à roulettes, et la seule personne des Terres Brûlées capable de rallumer une sous‑station avec un trombone. Elle rebranche l’ancien réseau quartier par quartier, et trouve hilarant de faire griller ceux qui s’y opposent.',
    identity: 'Espiègle, bavarde, un peu cruelle. Pour elle, une bagarre est un jeu vidéo qui sent le brûlé.',
    quote: 'T’as déjà vu un humain faire de la lumière ? Bouge pas.',
    tip: 'Chaque compétence charge la cible. À trois charges, elle grille sur place : enchaînez Arc, Court‑circuit puis Délestage.',
    voice: { pick: ['Branchée !'], ult: ['Délestage général !', 'Coupure de courant !'], kill: ['Court‑circuit !', 'Grillé !'], death: ['Plus de batterie…'], respawn: ['Rechargée à bloc !'] },
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 3, Mobilité: 3 },
    base: { hp: 530, hpRegen: 1.8, mana: 380, manaRegen: 2.5, ad: 48, armor: 22, resist: 30, as: 0.64, range: 230, ms: 166 },
    growth: { hp: 82, hpRegen: 0.18, mana: 48, manaRegen: 0.16, ad: 2.6, armor: 3.2, resist: 1.4, as: 0.02 },
    abilities: ['arc', 'shortcircuit', 'skates', 'blackout'], skillOrder: [0, 1, 2],
    build: ['battery', 'boots', 'tesla', 'bootsMag', 'reactor', 'gasmask'],
  },
  cendre: {
    name: 'Sœur Cendre', title: 'La prêtresse de la raffinerie', role: 'Mage', roles: ['mid', 'support'], difficulty: 2, ranged: true, radius: 22, projectile: 'ember', passive: 'offering',
    lore: 'La raffinerie de Port‑Sombre brûle depuis la Chute, et une petite congrégation vit dans sa lumière. Cendre en est la plus jeune prêtresse. Elle croit que la Flamme purifiera les Terres Brûlées, et elle est très, très pressée d’aider.',
    identity: 'Fervente, douce, terrifiante. Elle bénit ses victimes avant de les allumer.',
    quote: 'N’ayez pas peur. La Flamme vous aime.',
    tip: 'Tout ce que vous touchez brûle. Combustion fait bien plus mal aux cibles en feu, et les ennemis qui meurent en brûlant explosent sur leurs voisins.',
    voice: { pick: ['Que la Flamme nous guide.'], ult: ['Brûlez, et soyez purifiés !'], kill: ['Retourne à la Flamme.'], death: ['Je vois… la lumière…'], respawn: ['La Flamme me rallume.'] },
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 2, Mobilité: 1 },
    base: { hp: 540, hpRegen: 1.9, mana: 370, manaRegen: 2.4, ad: 50, armor: 22, resist: 30, as: 0.62, range: 225, ms: 162 },
    growth: { hp: 84, hpRegen: 0.18, mana: 46, manaRegen: 0.16, ad: 2.6, armor: 3.2, resist: 1.4, as: 0.02 },
    abilities: ['flamer', 'molotov', 'ignite', 'inferno'], skillOrder: [0, 2, 1],
    build: ['battery', 'boots', 'reactor', 'bootsMag', 'tesla', 'gasmask'],
  },
  comtesse: {
    name: 'La Comtesse', title: 'L’aristocrate des ruines', role: 'Tireuse', roles: ['adc'], difficulty: 2, ranged: true, radius: 21, projectile: 'bullet', passive: 'etiquette',
    lore: 'Dernière héritière d’une famille qui possédait la moitié de la côte, elle vit encore dans son château en ruine, entourée de portraits troués de balles. Elle chasse avec la carabine de son grand‑père, en robe du soir : la fin du monde n’excuse pas le manque d’élégance.',
    identity: 'Hautaine, polie, impitoyable. Elle vouvoie ses cibles et ne rate jamais une révérence.',
    quote: 'Tenez‑vous droit, je vous prie. C’est plus net.',
    tip: 'Une attaque sur quatre est un Tir d’honneur à longue portée qui frappe en critique. Révérence le prépare immédiatement.',
    voice: { pick: ['Allons chasser, voulez‑vous ?'], ult: ['Mes hommages.', 'Ne bougez plus.'], kill: ['Quel manque de tenue.', 'Adieu, très cher.'], death: ['Comme c’est… vulgaire.'], respawn: ['Reprenons où nous en étions.'] },
    ratings: { Dégâts: 3, Robustesse: 1, Contrôle: 1, Mobilité: 2 },
    base: { hp: 550, hpRegen: 1.8, mana: 300, manaRegen: 2.2, ad: 60, armor: 24, resist: 28, as: 0.68, range: 250, ms: 164 },
    growth: { hp: 84, hpRegen: 0.18, mana: 36, manaRegen: 0.14, ad: 3.3, armor: 3.3, resist: 1.2, as: 0.026 },
    abilities: ['aimed', 'curtsey', 'snare', 'lastbullet'], skillOrder: [0, 1, 2],
    build: ['knife', 'boots', 'railgun', 'bootsAtk', 'autogun', 'vampire', 'gasmask'],
  },
  gaspard: {
    name: 'Gros Gaspard', title: 'Le mitrailleur du convoi', role: 'Tireur', roles: ['adc'], difficulty: 1, ranged: true, radius: 25, projectile: 'bullet', passive: 'warmup',
    lore: 'Ancien chef d’une cantine de chantier, il a monté une mitrailleuse rotative sur un pied de batteur industriel. Il chante en tirant, il chante en cuisinant, et personne au convoi n’a jamais osé lui demander de se taire.',
    identity: 'Jovial, généreux, assourdissant. Il nourrit ses alliés et arrose ses ennemis avec le même enthousiasme.',
    quote: 'À table ! Tout le monde aura sa part !',
    tip: 'Plus vous tirez sans interruption, plus vous tirez vite. Mettez‑vous En position derrière vos sbires et ne lâchez plus la gâchette.',
    voice: { pick: ['Qui a faim ?!'], ult: ['SERVICE !', 'À la soupe !'], kill: ['Au suivant !', 'Resservez‑vous !'], death: ['Le dessert… attendra…'], respawn: ['J’ai repris des forces !'] },
    ratings: { Dégâts: 3, Robustesse: 2, Contrôle: 1, Mobilité: 1 },
    base: { hp: 580, hpRegen: 2.0, mana: 290, manaRegen: 2.0, ad: 56, armor: 26, resist: 28, as: 0.66, range: 220, ms: 160 },
    growth: { hp: 90, hpRegen: 0.2, mana: 34, manaRegen: 0.12, ad: 3.0, armor: 3.4, resist: 1.3, as: 0.03 },
    abilities: ['burst', 'dugin', 'grenade', 'barrage'], skillOrder: [0, 2, 1],
    build: ['trigger', 'boots', 'autogun', 'bootsAtk', 'railgun', 'vampire', 'tankshell'],
  },
  suture: {
    name: 'Doc Suture', title: 'Le chirurgien sans diplôme', role: 'Soutien', roles: ['support'], difficulty: 2, ranged: true, radius: 21, projectile: 'dart', passive: 'triage',
    lore: 'Il était vétérinaire. Il est maintenant le seul médecin à cent kilomètres, ce qui le rend indispensable et très nerveux. Il recoud les gens au fil de pêche, opère sous masque à gaz et note chaque patient perdu dans un carnet qui ne quitte jamais sa poche.',
    identity: 'Anxieux, macabre, dévoué. Il plaisante sur la mort pour ne pas avoir à y penser.',
    quote: 'Bonne nouvelle : je n’ai perdu que deux patients aujourd’hui. Mauvaise nouvelle : il est dix heures.',
    tip: 'Vos soins sont bien plus forts sur les alliés en danger. Gardez Réanimation pour l’allié que l’ennemi a décidé de tuer.',
    voice: { pick: ['Qui a besoin d’un docteur ?'], ult: ['Pas aujourd’hui !', 'Personne ne meurt sur ma table !'], kill: ['Heure du décès…'], death: ['Je ne me suis pas… recousu…'], respawn: ['Bon, où est ma trousse ?'] },
    ratings: { Dégâts: 1, Robustesse: 2, Contrôle: 2, Mobilité: 1 },
    base: { hp: 620, hpRegen: 2.2, mana: 360, manaRegen: 2.8, ad: 50, armor: 29, resist: 30, as: 0.62, range: 220, ms: 164 },
    growth: { hp: 95, hpRegen: 0.2, mana: 45, manaRegen: 0.18, ad: 2.8, armor: 3.6, resist: 1.5, as: 0.02 },
    abilities: ['syringe', 'transfusion', 'sleepgas', 'revive'], skillOrder: [0, 1, 2],
    build: ['jerrycan', 'boots', 'medkit', 'bootsMag', 'reactor', 'gasmask'],
  },
  crieur: {
    name: 'Le Crieur', title: 'La voix des ondes', role: 'Soutien', roles: ['support', 'mid'], difficulty: 2, ranged: true, radius: 23, projectile: 'note', passive: 'onair',
    lore: 'Radio Bitume émet tous les soirs depuis un camion‑studio hérissé d’antennes. Le Crieur y annonce les tempêtes, les convois et les décès, et passe les trois disques qui lui restent. Sur le champ de bataille, il branche son haut‑parleur de stade et commente le combat en direct, à plein volume.',
    identity: 'Exalté, théâtral, infatigable. Il ne se tait jamais, surtout quand il le faudrait.',
    quote: 'Ici Radio Bitume, et vous écoutez… la DÉFAITE de nos adversaires !',
    tip: 'Chaque compétence protège vos alliés proches. Coupez les sorts ennemis avec Interférences et renversez un combat avec Mur du son.',
    voice: { pick: ['On est en direct !'], ult: ['MONTEZ LE SON !', 'Et maintenant… le grand final !'], kill: ['Et c’est l’élimination !'], death: ['…fin de l’émission…'], respawn: ['Nous revoilà à l’antenne !'] },
    ratings: { Dégâts: 2, Robustesse: 2, Contrôle: 3, Mobilité: 1 },
    base: { hp: 580, hpRegen: 2.1, mana: 350, manaRegen: 2.6, ad: 52, armor: 27, resist: 30, as: 0.62, range: 210, ms: 164 },
    growth: { hp: 88, hpRegen: 0.22, mana: 44, manaRegen: 0.17, ad: 2.8, armor: 3.5, resist: 1.5, as: 0.02 },
    abilities: ['feedback', 'anthem', 'jamming', 'soundwall'], skillOrder: [0, 2, 1],
    build: ['jerrycan', 'boots', 'generator', 'bootsMag', 'medkit', 'gasmask', 'reactor'],
  },
  balafre: {
    name: 'Balafre', title: 'Le duelliste du péage', role: 'Combattant', roles: ['top', 'mid'], difficulty: 3, ranged: false, radius: 23, blade: true, passive: 'guard',
    lore: 'Il gardait la barrière de péage de Saint‑Ferréol, et personne ne passait sans payer. Après la Chute, il a continué. Il s’est forgé une épée dans une lame de ressort de camion ; la cicatrice qui lui barre le visage date de la dernière fois que quelqu’un a refusé de payer.',
    identity: 'Fier, rigoureux, obsédé par le règlement. Chaque duel est une transaction : on paie en sang, au tarif affiché.',
    quote: 'Péage. Tarif unique.',
    tip: 'Sa Garde pare automatiquement une attaque de héros toutes les 10 s. Encaissez une rafale avec Contre, puis rendez la monnaie avec Ticket de sortie.',
    voice: { pick: ['Votre ticket, s’il vous plaît.'], ult: ['Tarif plein !', 'Personne ne passe.'], kill: ['Payé.', 'Ticket composté.'], death: ['La barrière… est levée…'], respawn: ['Le péage est ouvert.'] },
    ratings: { Dégâts: 3, Robustesse: 2, Contrôle: 2, Mobilité: 3 },
    base: { hp: 650, hpRegen: 2.5, mana: 280, manaRegen: 2.0, ad: 66, armor: 33, resist: 31, as: 0.7, range: 74, ms: 168 },
    growth: { hp: 92, hpRegen: 0.22, mana: 36, manaRegen: 0.12, ad: 3.8, armor: 3.5, resist: 1.5, as: 0.026 },
    abilities: ['lunge', 'counter', 'whirl', 'ticket'], skillOrder: [0, 2, 1],
    build: ['knife', 'boots', 'hydraulics', 'bootsArmor', 'chainsaw', 'vampire', 'gasmask'],
  },
  vase: {
    name: 'Capitaine Vase', title: 'La corsaire des dunes', role: 'Combattante', roles: ['jungle', 'top'], difficulty: 2, ranged: false, radius: 22, blade: true, passive: 'powder',
    lore: 'Elle commandait un voilier des sables qui pillait les convois sur la mer de dunes. Le navire s’est échoué, l’équipage s’est dispersé, mais elle a gardé son sabre, son pistolet à silex et la conviction que tout ce qui roule sur le sable lui revient de droit.',
    identity: 'Flamboyante, joueuse, sans scrupules. Elle se bat comme elle naviguait : au vent, et sans jamais virer de bord.',
    quote: 'À l’abordage, et que le sable vous engloutisse !',
    tip: 'Chaque compétence recharge son pistolet : la prochaine attaque devient un tir à distance renforcé. Alternez le sabre et la poudre.',
    voice: { pick: ['Hissez la grand‑voile !'], ult: ['Feu à volonté !', 'Bordée !'], kill: ['Par‑dessus bord !'], death: ['Le navire… coule…'], respawn: ['La marée remonte !'] },
    ratings: { Dégâts: 3, Robustesse: 2, Contrôle: 2, Mobilité: 2 },
    base: { hp: 610, hpRegen: 2.4, mana: 280, manaRegen: 2.1, ad: 64, armor: 30, resist: 30, as: 0.68, range: 66, ms: 170 },
    growth: { hp: 90, hpRegen: 0.22, mana: 36, manaRegen: 0.13, ad: 3.7, armor: 3.4, resist: 1.4, as: 0.026 },
    abilities: ['slash', 'pistol', 'boarding', 'broadside'], skillOrder: [0, 1, 2],
    build: ['knife', 'boots', 'hydraulics', 'bootsAtk', 'chainsaw', 'vampire', 'tankshell'],
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
  blueBuff:   { name: 'Noyau radioactif',  hp: 2100, ad: 34, period: 1.6, range: 60,  radius: 32, armor: 18, resist: 18, gold: 100, xp: 150, buff: 'blue' },
  redBuff:    { name: 'Bête écarlate',     hp: 2100, ad: 38, period: 1.5, range: 60,  radius: 32, armor: 18, resist: 18, gold: 100, xp: 150, buff: 'red' },
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

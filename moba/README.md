# Terres Brûlées

MOBA 5 contre 5 en 3D dans les ruines de l’ancien monde, jouable dans le navigateur.
JavaScript pur, sans outil de build. Le rendu 3D utilise Three.js (r128), fourni dans `vendor/`, donc aucun accès réseau n’est nécessaire.

## Lancer le jeu

Ouvrez `moba/index.html` dans un navigateur récent avec WebGL, ou servez le dossier :

```bash
python3 -m http.server 8000
```

puis rendez-vous sur <http://localhost:8000/moba/>.

## La partie

Vous jouez un héros chez les **Convoyeurs** (en bas à gauche) avec quatre alliés bots, contre cinq bots **Charognards**.
À la sélection, vous choisissez un héros, un rôle (Haut, Jungle, Milieu, Tireur, Soutien) et une difficulté.

### La carte

- **Trois voies.** Haut, milieu et bas, avec sur chacune deux tourelles puis un inhibiteur par camp.
- **Base.** Le réacteur (nexus) est protégé par deux tourelles. Elles ne deviennent attaquables qu’une fois un inhibiteur tombé. La citerne soigne votre équipe, foudroie les intrus et donne accès à la boutique.
- **Inhibiteurs.** Un inhibiteur détruit fait apparaître des **Mastodontes** (super‑sbires) dans la voie. Il se reconstruit après 4 minutes.
- **Rivière.** Elle coupe la carte en diagonale. Le Ver des sables et le Titan de rouille s’y trouvent.
- **Brouillard de guerre.** Chaque équipe ne voit que ce que ses unités et ses structures voient. Les bots respectent la même règle.

### La jungle

Six camps par côté, entre les voies :

| Camp | Effet |
|---|---|
| Molosses, Crapaud, Vautours, Golems | Or et expérience |
| Gardien bleu | Buff bleu : réduction des temps de recharge et régénération d’énergie |
| Gardien rouge | Buff rouge : les attaques brûlent et ralentissent |
| **Ver des sables** (5 min) | +6 % de dégâts pour l’équipe, cumulable |
| **Titan de rouille** (15 min) | Bonus de puissance et sbires renforcés pendant un temps limité |

Les monstres reviennent à leur camp s’ils sont entraînés trop loin. Les junglers ont le sort **Châtiment**, qui inflige des dégâts bruts aux monstres et aux sbires.

### Équipement à recettes

37 objets en trois paliers :

1. **Composants** : pièces bon marché (couteau de boucher, plaques de tôle, batterie de voiture, engrenage…).
2. **Objets intermédiaires** : assemblés à partir de composants, y compris trois améliorations de bottes.
3. **Objets légendaires** : Tronçonneuse, Fusil de rail, Mitrailleuse lourde, Sangsue, Exo‑armure, Carapace de char, Masque intégral, Armure à pointes, Réacteur portatif, Bobine instable, Trousse de chirurgien.

Le prix d’une recette déduit les composants que vous possédez déjà. Dans la boutique, la fiche d’un objet montre son arbre de fabrication, avec les pièces possédées en surbrillance, et ce qu’il permet de fabriquer.
Six emplacements sont disponibles. Les potions se consomment avec les touches `1` à `6`. Pour revendre un objet, faites un clic droit dessus dans l’inventaire.

## Héros

| Héros | Rôles | Compétences |
|---|---|---|
| Brise‑Roc | Haut, Jungle | Bélier · Tôle soudée · Onde de choc · Rouleau compresseur |
| Vipère | Tireur | Chevrotine · Roulade · Piège à loups · Pluie de plomb |
| Le Doc | Soutien | Seringue · Gaz toxique · Adrénaline · Stimulant de masse |
| Étincelle | Milieu | Arc électrique · Mine magnétique · Surcharge · Tempête électrique |
| Rempart | Soutien, Haut | Charge au bouclier · Mur de boucliers · Provocation · Dernier rempart |
| Crocs | Jungle | Bond · Griffure · Frénésie · Curée |
| Cendre | Milieu, Soutien | Lance‑flammes · Cocktail · Combustion · Brasier |
| Mécano | Haut, Jungle | Clé à molette · Tourelle portative · Ressort · Exosquelette |

Niveau maximum : 18. L’ultime se débloque aux niveaux 6, 11 et 16.
Sorts d’invocateur :

- Tous les héros ont **Saut**.
- Les junglers ont aussi **Châtiment**.
- Les autres héros ont aussi **Rustine**.

## Contrôles (AZERTY par défaut, QWERTY disponible)

| Action | Commande |
|---|---|
| Se déplacer / attaquer | Clic droit (maintenir pour suivre la souris) |
| Compétences | `A` `Z` `E` `R` : maintenir pour viser, relâcher pour lancer |
| Améliorer une compétence | `Ctrl` + touche de la compétence, ou bouton + |
| Sorts | `D` · `F` |
| Objets | `1` à `6` |
| Retour à la base | `B` |
| Boutique | `P` |
| Stop | `S` |
| Portée d’attaque | `C` (maintenir) |
| Tableau des scores | `Tab` (maintenir) |
| Caméra | `Y` verrouiller / libérer · `Espace` centrer · flèches, bords de l’écran, molette |
| Minimap | Clic gauche : déplacer la caméra · clic droit : déplacer le héros |

Toutes les touches se changent dans **Options → Touches**.

## Structure du code

```
index.html          Page, HUD et écrans
css/style.css       Thème laiton et rouille
vendor/three.min.js Three.js r128 (licence MIT, voir THREE-LICENSE.txt)
js/utils.js         Utilitaires
js/data.js          Carte, héros, sbires, monstres, camps, objets et recettes
js/map.js           Voies, obstacles, grille de navigation, A*
js/entities.js      Héros, sbires, monstres, structures, projectiles, zones
js/abilities.js     Compétences et sorts, avec leur logique pour les bots
js/keys.js          Raccourcis configurables
js/models.js        Modèles 3D low‑poly (héros, monstres, structures)
js/studio.js        Portraits, cartes, plateau tournant et scène du menu
js/icons.js         Icônes des compétences, sorts et objets
js/audio.js         Son synthétisé (WebAudio)
js/bot.js           IA par rôle : laning, jungle, ganks, objectifs, achats
js/game.js          Simulation : vagues, jungle, combat, vision, or, niveaux
js/render3d.js      Rendu 3D, brouillard, indicateurs, barres, minimap
js/input.js         Souris, clavier, caméra
js/ui.js            HUD, boutique à recettes, tableau des scores
js/menu.js          Menu, sélection, versus, guide, options, fin
js/main.js          Assemblage et boucle
```

## Pistes pour la suite

- Buissons
- Plus de héros, et des objets à effets actifs
- Multijoueur

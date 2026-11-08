# Terres Brûlées

MOBA en 3 contre 3 dans les ruines de l’ancien monde, jouable dans le navigateur.
HTML5 Canvas et JavaScript pur : aucune dépendance, aucun outil de build.

## Lancer le jeu

Ouvrez `moba/index.html` dans un navigateur récent, ou servez le dossier :

```bash
python3 -m http.server 8000
```

puis rendez-vous sur <http://localhost:8000/moba/>.

## La partie

Deux équipes de trois héros s’affrontent sur une seule voie, une autoroute effondrée.
Vous jouez un héros chez les **Convoyeurs** avec deux alliés bots, contre trois bots **Charognards**.

- **Structures.** Chaque camp protège deux tourelles puis son réacteur. Le premier réacteur détruit perd la partie.
- **Sbires.** Une vague part de chaque base toutes les 30 secondes : pillards, arbalétriers, et un camion‑bélier toutes les trois vagues.
- **Or et expérience.** Le dernier coup sur un sbire rapporte de l’or. Rester à proximité suffit pour l’expérience.
- **Tourelles.** Elles visent d’abord les sbires, mais se retournent contre vous si vous attaquez un héros à leur portée. Leurs tirs s’intensifient à chaque coup.
- **Protection.** Sans sbires alliés à proximité, les structures ne subissent que 40 % des dégâts. La tourelle intérieure et le réacteur restent invulnérables tant que la structure précédente tient.
- **Niveaux.** Niveau maximum 12. Chaque niveau donne un point de compétence. L’ultime se débloque aux niveaux 6, 9 et 12.
- **Base.** La citerne soigne votre équipe et foudroie les héros ennemis qui s’en approchent. La boutique n’est accessible qu’à la base ou à terre.
- **Fin de partie.** Après 15 minutes, les réapparitions s’allongent et les sbires frappent plus fort les structures.

## Héros

| Héros | Rôle | Compétences |
|---|---|---|
| Brise‑Roc | Combattant, mêlée | Bélier · Tôle soudée · Onde de choc · Rouleau compresseur |
| Vipère | Tireuse, distance | Chevrotine · Roulade · Piège à loups · Pluie de plomb |
| Le Doc | Soutien, distance | Seringue · Gaz toxique · Adrénaline · Stimulant de masse |
| Étincelle | Mage, distance | Arc électrique · Mine magnétique · Surcharge · Tempête électrique |

Tous les héros disposent de deux sorts : **Saut** (téléportation courte) et **Rustine** (soin et accélération).
Seize objets sont disponibles, en pièces détachées et en équipement lourd.

## Contrôles (AZERTY par défaut, QWERTY disponible)

| Action | Commande |
|---|---|
| Se déplacer / attaquer | Clic droit (maintenir pour suivre la souris) |
| Compétences | `A` `Z` `E` `R` : maintenir pour viser, relâcher pour lancer |
| Améliorer une compétence | `Ctrl` + touche de la compétence, ou bouton + |
| Sorts | `D` Saut · `F` Rustine |
| Retour à la base | `B` |
| Boutique | `P` |
| Stop | `S` |
| Tableau des scores | `Tab` (maintenir) |
| Caméra | `Y` verrouiller / libérer · `Espace` centrer · flèches, bords, molette |

Toutes les touches se changent dans **Options → Touches**.

## Structure du code

```
index.html        Page, HUD et écrans
css/style.css     Thème rouille et poussière
js/utils.js       Utilitaires
js/data.js        Arène, héros, sbires, tourelles, objets, difficultés
js/map.js         Géométrie de la voie et des bases
js/entities.js    Héros, sbires, tourelles, réacteurs, projectiles, zones
js/abilities.js   Compétences et sorts, avec leur logique pour les bots
js/keys.js        Raccourcis configurables
js/art.js         Héros vus de dessus, portraits, icônes
js/audio.js       Son synthétisé (WebAudio)
js/bot.js         IA des héros : farm, combat, repli, achats
js/game.js        Simulation : vagues, tourelles, combat, or, niveaux
js/render.js      Rendu de l’arène, effets, barres, indicateurs, minimap
js/input.js       Souris, clavier, caméra
js/ui.js          HUD, boutique, tableau des scores
js/menu.js        Menu, sélection, versus, guide, options, fin
js/main.js        Assemblage et boucle
```

## Pistes pour la suite

- Buissons et brouillard de guerre
- Une forêt avec des camps neutres entre deux voies
- Nouveaux héros et objets à recettes
- Multijoueur

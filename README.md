# Dernier Convoi

> Ce dépôt contient aussi **Terres Brûlées**, un MOBA en 3 contre 3 dans le même univers : voir le dossier [`moba/`](moba/README.md).

Jeu de stratégie en temps réel dans les Terres désolées, jouable dans le navigateur.
HTML5 Canvas et JavaScript pur : aucune dépendance, aucun outil de build.

Quarante et un ans après la Chute, deux convois se disputent un territoire jonché d'épaves.
Vous menez les Convoyeurs. En face, les Charognards.

## Lancer le jeu

Ouvrez `index.html` dans un navigateur récent, ou servez le dossier :

```bash
python3 -m http.server 8000
```

puis rendez-vous sur <http://localhost:8000>.

## La partie

Votre **Bastion** se déploie dans un coin du territoire, celui des Charognards dans le coin opposé.
Les **récupérateurs** découpent la **ferraille** des décharges et des épaves qui bordent l'autoroute abandonnée.
La ferraille paie véhicules, bâtiments et améliorations.
**Objectif : détruire tous les bâtiments ennemis.**

- **Brouillard de guerre.** Seuls vos détecteurs révèlent l'ennemi. Motards et miradors étendent votre vision.
- **Tempêtes de poussière.** Elles réduisent la portée de détection de tout le monde. Le moment idéal pour un coup de main.
- **Places du convoi.** Chaque véhicule occupe des places. Le Bastion en offre 24, chaque atelier 12.
- **Contres.** Buggys > Chars lourds > Blindés > Technicals > Buggys. Le lance‑roquettes perce les chars lourds et les bunkers.
- **Tactiques.** Agressif (poursuit tout ce qu'il repère), Neutre (engage à portée puis revient), Évasif (se replie s'il est attaqué).
- **Formations.** Libre, Delta, Ligne, Colonne, appliquées à chaque ordre de déplacement.
- **Améliorations.** Blindage, munitions, moteurs, récupération, radio, depuis le laboratoire.
- **Réparation.** Les véhicules abîmés se réparent près du Bastion ou d'un atelier.
- **Zoom tactique.** En dézoomant, les véhicules s'affichent en icônes sur une grille.

## Véhicules

| Véhicule | Classe | Coût | Places | Rôle |
|---|---|---|---|---|
| Récupérateur | Utilitaire | 60 | 1 | Récupération de ferraille |
| Motard | Léger | 40 | 1 | Éclaireur, détection longue portée |
| Buggy | Léger | 70 | 1 | Harcèle les chars lourds |
| Technical | Moyen | 120 | 2 | Anti‑véhicules légers |
| Blindé d'assaut | Blindé | 220 | 3 | Ligne polyvalente, écrase les technicals |
| Lance‑roquettes | Blindé | 270 | 3 | Anti‑chars, anti‑bâtiments |
| Char lourd | Char lourd | 620 | 6 | Obusier à dégâts de zone, nécessite un atelier |

## Bâtiments

| Bâtiment | Coût | Rôle |
|---|---|---|
| Bastion | — | Production, dépôt, réparation, 24 places |
| Atelier | 420 | Blindés et chars, +12 places |
| Bunker | 150 | Mitrailleuse lourde |
| Laboratoire | 320 | Améliorations (un seul) |
| Mirador | 110 | Détection étendue |

## Contrôles

Toutes les touches se changent dans **Options → Touches** (cliquez sur une touche, appuyez sur la nouvelle). Le réglage est conservé dans le navigateur. Le **Carnet du convoi → Contrôles** affiche toujours le guide à jour.

| Action | Commande par défaut |
|---|---|
| Caméra | `Z` `Q` `S` `D` ou flèches, bords de l'écran, clic milieu, minimap · `Espace` : centrer sur le Bastion |
| Sélectionner | Clic gauche / glisser · Maj : ajouter · double‑clic : même type à l'écran |
| Ordre contextuel | Clic droit : déplacer, attaquer, récupérer, décharger, point de ralliement |
| Attaque en mouvement | `A` puis clic |
| Stop | `X` |
| Tactique | `G` agressif · `N` neutre · `V` évasif |
| Formation | `F1` libre · `F2` delta · `F3` ligne · `F4` colonne |
| Groupes | `Ctrl + 1‑5` assigner · `1‑5` rappeler (deux fois : centrer) |
| Production | Bastion ou atelier sélectionné : `C` récupérateur · `E` motard · `I` buggy · `T` technical · `F` blindé · `O` roquettes · `H` char |
| Construction | `B` panneau · `U` atelier · `K` bunker · `L` laboratoire · `M` mirador |
| Améliorations | `R` |
| Partie | `F8` pause · `+` / `-` vitesse · `Échap` annuler / menu |

## Structure du code

```
index.html        Page, HUD et écrans
css/style.css     Thème rouille et poussière
js/utils.js       Utilitaires
js/config.js      Données : véhicules, bâtiments, améliorations, tactiques, difficultés
js/keys.js        Raccourcis clavier configurables et guide des commandes
js/art.js         Art vectoriel vu de dessus : véhicules, bâtiments, icônes tactiques
js/audio.js       Vent, tempêtes et effets sonores synthétisés (WebAudio)
js/entities.js    Classes Asteroid (décharge), Unit, Structure, Projectile, Effect
js/world.js       Terrain : autoroute, décharges, ruines, cratères, texture du sol
js/ai.js          IA : économie, contre‑composition, défense, raids, améliorations
js/game.js        Simulation : ordres, tactiques, formations, armes, tempêtes, brouillard
js/renderer.js    Rendu du terrain, brouillard, zoom tactique, tempêtes, minimap
js/input.js       Souris, clavier, caméra
js/ui.js          HUD : sélection, commandes, construction, améliorations, radio
js/menu.js        Menu principal, escarmouche, carnet, options, pause, fin
js/main.js        Assemblage et boucle protégée
```

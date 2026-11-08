# Nebula Command

Jeu de stratégie en temps réel dans l'espace, jouable dans le navigateur.
HTML5 Canvas et JavaScript pur : aucune dépendance, aucun outil de build.

Inspirations assumées : l'esthétique et les tactiques de flotte de *Homeworld*,
le zoom stratégique de *Supreme Commander*, la lisibilité et les contres de *StarCraft*.

## Lancer le jeu

Ouvrez `index.html` dans un navigateur récent, ou servez le dossier :

```bash
python3 -m http.server 8000
```

puis rendez-vous sur <http://localhost:8000>.

## La partie

Votre **vaisseau‑mère** sort d'hyperespace dans un coin du secteur, celui de l'adversaire dans le coin opposé.
Les **collecteurs** extraient des minéraux des astéroïdes. Les minéraux financent vaisseaux, structures et technologies.
**Objectif : détruire toutes les structures ennemies.**

- **Brouillard de guerre.** Seuls vos capteurs révèlent l'ennemi. Éclaireurs et relais de capteurs étendent votre vision.
- **Capacité de flotte.** Chaque vaisseau occupe des points de commandement. Le vaisseau‑mère en fournit 24, chaque chantier naval 12.
- **Contres.** Intercepteurs > Destroyers > Frégates > Corvettes > Intercepteurs. La frégate ionique perce les vaisseaux capitaux et les structures.
- **Tactiques.** Agressif (poursuit tout ce qu'il détecte), Neutre (engage à portée puis revient), Évasif (se replie s'il est attaqué).
- **Formations.** Libre, Delta, Mur, Colonne. Appliquées à chaque ordre de déplacement.
- **Recherche.** Blindage, armement, propulsion, extraction, capteurs, depuis le module de recherche.
- **Réparation.** Les vaisseaux endommagés se réparent près du vaisseau‑mère ou d'un chantier.
- **Zoom stratégique.** En dézoomant, la flotte s'affiche en icônes tactiques sur une grille.

## Vaisseaux

| Vaisseau | Classe | Coût | Points | Rôle |
|---|---|---|---|---|
| Collecteur | Utilitaire | 60 | 1 | Extraction |
| Éclaireur | Chasseur | 40 | 1 | Capteurs longue portée |
| Intercepteur | Chasseur | 70 | 1 | Harcèle les vaisseaux capitaux |
| Corvette | Corvette | 120 | 2 | Antichasseurs |
| Frégate d'assaut | Frégate | 220 | 3 | Ligne polyvalente, écrase les corvettes |
| Frégate ionique | Frégate | 270 | 3 | Anti‑capital, anti‑structure |
| Destroyer | Capital | 620 | 6 | Artillerie lourde, nécessite un chantier |

## Structures

| Structure | Coût | Rôle |
|---|---|---|
| Vaisseau‑mère | — | Production, dépôt, réparation, 24 points de flotte |
| Chantier naval | 420 | Frégates et destroyers, +12 points de flotte |
| Plateforme de défense | 150 | Tourelle laser |
| Module de recherche | 320 | Technologies (un seul) |
| Relais de capteurs | 110 | Vision étendue |

## Contrôles

| Action | Commande |
|---|---|
| Sélectionner | Clic gauche / glisser · Maj : ajouter · double‑clic : même type à l'écran |
| Ordre contextuel | Clic droit : déplacer, attaquer, extraire, décharger, point de ralliement |
| Attaque en mouvement | `A` puis clic |
| Stop | `S` |
| Tactique | `G` agressif · `N` neutre · `V` évasif |
| Formation | `F1` libre · `F2` delta · `F3` mur · `F4` colonne |
| Groupes | `Ctrl + 1‑5` assigner · `1‑5` rappeler (deux fois : centrer) |
| Production | Vaisseau‑mère sélectionné : `C` `E` `I` `V` `F` `N` `D` |
| Construction / recherche | `B` / `R`, ou `T` `P` `M` `L` directement |
| Caméra | Flèches, bords de l'écran, clic milieu, minimap, molette |
| Divers | `Espace` centrer · `P` pause · `+` / `-` vitesse · `Échap` annuler / menu |

Le codex en jeu détaille chaque vaisseau, ses contres et la doctrine.

## Structure du code

```
index.html        Page, HUD et écrans
css/style.css     Style de l'interface
js/utils.js       Utilitaires
js/config.js      Données : unités, structures, recherche, tactiques, difficultés
js/art.js         Art vectoriel des vaisseaux, structures et icônes stratégiques
js/audio.js       Ambiance et effets sonores synthétisés (WebAudio)
js/entities.js    Classes Asteroid, Unit, Structure, Projectile, Effect
js/world.js       Génération de la carte (ceinture, champs, poussière)
js/ai.js          IA : économie, contre‑composition, défense, vagues, recherche
js/game.js        Simulation : ordres, tactiques, formations, combat, brouillard, recherche
js/renderer.js    Rendu, brouillard de guerre, zoom stratégique, minimap
js/input.js       Souris, clavier, caméra
js/ui.js          HUD : sélection, commandes, construction, recherche, journal
js/menu.js        Menu principal, escarmouche, codex, options, pause, fin
js/main.js        Assemblage et boucle
```

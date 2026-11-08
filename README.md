# Nebula Command — RTS spatial

Jeu de stratégie en temps réel dans l'espace, jouable directement dans le navigateur.
Aucune dépendance, aucun outil de build : HTML5 Canvas + JavaScript pur.

## Lancer le jeu

Ouvrez simplement `index.html` dans un navigateur moderne, ou servez le dossier :

```bash
python3 -m http.server 8000
```

puis rendez-vous sur <http://localhost:8000>.

## Principe

- Vous commencez avec une **Station** et trois **Collecteurs** dans un coin de la carte ; l'IA adverse occupe le coin opposé.
- Les collecteurs extraient des **minéraux** des astéroïdes et les rapportent à la station.
- Les minéraux financent la production de vaisseaux et la construction de bâtiments.
- **Objectif : détruire toutes les structures ennemies** avant qu'il ne détruise les vôtres.

## Unités

| Unité | Coût | Rôle |
|---|---|---|
| Collecteur | 50 | Extraction de minéraux |
| Chasseur | 75 | Rapide et fragile, laser |
| Frégate | 150 | Polyvalente, missiles guidés |
| Croiseur | 320 | Lent, blindé, canon à plasma |

## Bâtiments

| Bâtiment | Coût | Rôle |
|---|---|---|
| Station | — | Produit toutes les unités, reçoit les minéraux |
| Chantier | 250 | Produit les vaisseaux de combat |
| Tourelle | 120 | Défense statique longue portée |

Les bâtiments se placent à proximité d'un bâtiment allié existant.

## Contrôles

| Action | Commande |
|---|---|
| Sélectionner | Clic gauche / glisser (Maj : ajouter) ; double-clic : toutes les unités du même type à l'écran |
| Ordre contextuel | Clic droit (déplacer, attaquer, extraire, retourner à la station) |
| Attaque en mouvement | `A` puis clic |
| Stop | `S` |
| Groupes de contrôle | `Ctrl + 1‑5` pour créer, `1‑5` pour rappeler |
| Production | Sélectionner une station puis `C` / `H` / `F` / `R` ou les boutons |
| Construction | `T` (Chantier), `O` (Tourelle) puis clic sur la carte |
| Point de ralliement | Station sélectionnée + clic droit |
| Caméra | Flèches, bord de l'écran, clic milieu glissé, minimap |
| Zoom | Molette |
| Centrer sur la station | Espace |
| Pause / vitesse | `P`, `+` / `-` |
| Aide | `F1` |

## Structure du code

```
index.html        Page et interface HTML
css/style.css     Styles de l'interface
js/utils.js       Fonctions utilitaires
js/config.js      Constantes, définitions des unités, bâtiments et difficultés
js/entities.js    Classes Asteroid, Unit, Structure, Projectile, Effect
js/world.js       Génération de la carte et du fond étoilé
js/ai.js          IA de la faction adverse
js/game.js        Simulation : ordres, combat, économie, production, commandes
js/input.js       Souris, clavier, caméra
js/renderer.js    Rendu canvas et minimap
js/ui.js          Panneaux HTML, messages, écrans de fin
js/main.js        Assemblage et boucle de jeu
```

## Pistes d'évolution

- Brouillard de guerre et détection
- Technologies / améliorations
- Sons et musique
- Cartes multiples et génération aléatoire configurable
- Multijoueur

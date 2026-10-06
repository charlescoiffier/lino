# Lino

Prépare une image pour la linogravure : séparation en calques par couleur, attribution de teintes, export PNG par calque.
Application 100 % client : les images ne quittent jamais l'appareil.

## Développement

    npm install
    npm run dev        # serveur de développement
    npm test           # tests unitaires (Vitest)
    npm run e2e        # tests de bout en bout (Playwright)

## Réglages de l'image

Dans le panneau de droite : nombre de couleurs, luminosité, contraste, saturation, lissage du grain, nettoyage des points isolés, définition maximale, inversion des valeurs et miroir horizontal (utile pour graver). Les réglages sont enregistrés avec le projet.

## Déploiement (Cloudflare Pages)

- Build command : `npm run build`
- Output directory : `dist`
- Variable d'environnement : `NODE_VERSION=20`

Chaque push sur la branche principale déclenche un déploiement; les autres branches obtiennent une prévisualisation.

## Teintes

Ajouter ou modifier des teintes dans `public/palettes/linocut-inks.json` (`id`, `name`, `hex`, `ref` optionnel).

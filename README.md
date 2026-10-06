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

## Déploiement (GitHub Pages)

Chaque push sur `main` lance `.github/workflows/deploy.yml` : tests, build puis publication sur `https://<compte>.github.io/<dépôt>/`.

Activation (une seule fois) : dans le dépôt GitHub, *Settings*, *Pages*, *Build and deployment*, *Source* : **GitHub Actions**.

Le build lit la variable `BASE_PATH` (le workflow la fixe à `/<dépôt>/`). Sans elle, le site est servi à la racine, comme en local.

## Teintes

Ajouter ou modifier des teintes dans `public/palettes/linocut-inks.json` (`id`, `name`, `hex`, `ref` optionnel).

> [!WARNING]
> Ce projet a été vibecodé avec l’aide de l’intelligence artificielle.

# Lino

[![Build et déploiement](https://github.com/charlescoiffier/lino/actions/workflows/deploy.yml/badge.svg)](https://github.com/charlescoiffier/lino/actions/workflows/deploy.yml)

Une application web qui prépare une image pour la **linogravure** : elle la sépare en calques, un par passage
d'encre, attribue une teinte à chacun et exporte les calques en noir et blanc (en PNG, ou en un PDF multipages avec
repères de calage), prêts à imprimer ou à transférer sur le lino.

**Essayer l'application : https://charlescoiffier.github.io/lino/**

Aucune installation : tout se passe dans le navigateur, et vos images ne quittent jamais votre appareil.

## Aperçu

![Lino sur ordinateur : l'aperçu en couleurs d'une cigale, ses quatre calques et le panneau de réglages](docs/images/apercu-bureau.png)

| Les réglages de l'image | Mode sombre | Sur téléphone |
|---|---|---|
| ![Le panneau de réglages : nombre de couleurs, luminosité, contraste, saturation, lissage, nettoyage, définition, inversion, miroir, largeur de l'image en mm et repères de calage](docs/images/reglages.png) | ![Lino en mode sombre](docs/images/apercu-sombre.png) | ![Lino sur téléphone, en une seule colonne](docs/images/mobile.png) |

---

# Pour tout le monde

## Le projet en bref

En linogravure, chaque couleur demande sa propre plaque : on grave une plaque par passage d'encre, puis on imprime
les plaques l'une après l'autre sur la même feuille. Il faut donc partir d'une image découpée en zones de couleur
bien distinctes, une zone par plaque.

Lino fait ce découpage. Vous choisissez le **nombre de couleurs** (de 2 à 16) ; Lino regroupe les couleurs de
l'image en autant de familles et en tire un **calque** par famille. Chaque calque reçoit une **teinte d'encre**,
choisie dans une bibliothèque d'encres : les 24 couleurs de l'encre **Aqua Wash 60 ml** de Rougier & Plé, avec leur
référence. Les calques s'exportent en noir et blanc, un PNG par calque ou tous ensemble dans un PDF : le noir est ce
qui reçoit l'encre, le blanc ce qui sera creusé.

C'est un outil personnel : pas de compte, pas de serveur, rien à installer.

## Utiliser l'application

1. **Ajouter une image** : le bouton « Ajouter une image » en haut à gauche accepte une photo ou un dessin
   (PNG, JPEG, WebP… tout ce que votre navigateur sait lire). Une image très grande est réduite automatiquement.
2. **Choisir le nombre de couleurs** avec le curseur du panneau « Réglages ». L'aperçu et les calques se mettent à
   jour. Si l'image contient moins de couleurs distinctes que demandé, vous obtenez simplement moins de calques.
3. **Ajuster l'image de base** (voir plus bas) pour obtenir des zones plus nettes ou plus simples à graver.
4. **Choisir une teinte par calque**. Lino propose d'abord l'encre la plus proche de la couleur du calque ; vous
   pouvez en changer. Votre choix est conservé quand vous modifiez ensuite un réglage sans changer le nombre de calques.
5. **Exporter** : un bouton par calque (PNG), un bouton pour tous les calques dans un PDF (taille d'impression et
   repères de calage réglables dans la section Impression), et un pour l'aperçu en couleurs.

Les calques sont triés du plus clair (calque 1) au plus sombre. Chaque ligne indique la part de l'image qu'elle couvre.

### Les réglages de l'image

| Réglage | Effet |
|---|---|
| Nombre de couleurs | Nombre de calques voulus, de 2 à 16. |
| Luminosité | Éclaircit ou assombrit toute l'image (de −100 à +100). |
| Contraste | Écarte ou rapproche les clairs et les foncés (de −100 à +100). |
| Saturation | Rend les couleurs plus vives ou plus ternes ; −100 donne des gris (de −100 à +100). |
| Lissage du grain | Floute légèrement l'image avant le découpage (de 0 à 5 px) : utile pour une photo bruitée, qui donnerait sinon des calques piquetés. |
| Nettoyage des points isolés | Supprime les pixels seuls au milieu d'une autre zone, qu'il serait impossible de graver (de 0 à 3 passes). |
| Définition maximale | Taille maximale de l'image traitée, de 400 à 1600 px sur le grand côté. Moins de pixels, c'est un calcul plus rapide et des zones plus larges. |
| Inverser les valeurs | Échange clairs et foncés. |
| Miroir horizontal | Retourne l'image de gauche à droite. L'impression inverse l'image : graver à l'envers donne un tirage dans le bon sens, ce qui compte surtout avec du texte. |
| Largeur de l'image (mm) | Taille de l'image sur le papier dans l'export PDF, de 1 à 2000 mm ; la hauteur suit les proportions. Vide : l'image est ajustée à une page A4. Le panneau indique la taille obtenue et le format de page choisi. |
| Repères de calage dans le PDF | Ajoute une croix de repérage à chaque coin de l'image sur toutes les pages du PDF (activé par défaut). |

« Réinitialiser les réglages » remet tous les réglages à leur valeur par défaut : 4 couleurs, image inchangée,
largeur d'impression automatique, repères de calage activés.

### Enregistrer et exporter

- **Exporter le calque K** : un PNG noir et blanc nommé `calque-K.png` (noir = encre).
- **Exporter tous les calques (PDF)** : un seul fichier `<nom>-calques.pdf`, une page par calque. Chaque page porte une
  légende avec la couleur de la teinte, son nom et sa référence (par exemple « Calque 2/4 · Jaune foncé · réf. 490473 »).
  L'image est au même endroit sur toutes les pages, et quatre **repères de calage** (une croix dans un cercle à chaque
  coin, juste à l'extérieur de l'image) sont tracés aux mêmes coordonnées : ils permettent de superposer les passages ou
  de repositionner la feuille d'un tirage à l'autre. On peut les désactiver (« Repères de calage dans le PDF »).
  - Sans **largeur** indiquée : page A4 (en portrait ou en paysage selon l'image), image ajustée à la page.
  - Avec une **largeur en mm** (réglage « Largeur de l'image » de la section Impression) : l'image est imprimée à cette
    taille exacte. Lino choisit le plus petit format de page (A4, A3, A2, A1, A0) où elle tient avec ses marges, et une
    page sur mesure au-delà de l'A0. Pour imprimer à l'échelle, imprimez le PDF à 100 % (« taille réelle », sans
    « ajuster à la page »).
- **Exporter l'aperçu** : un PNG en couleurs avec les teintes choisies, nommé `apercu.png`.
- **Enregistrer** : garde le projet (image, nombre de couleurs, teintes, réglages) dans le navigateur. Les projets
  apparaissent dans la barre de gauche, où l'on peut les rouvrir ou les supprimer.
- **Exporter le projet** / **Importer un projet** : un fichier `.lino.json`, pour sauvegarder un projet, le déplacer
  sur un autre appareil ou en garder une copie.

### Limites

- Les projets enregistrés restent **dans le navigateur** où vous les avez créés : ils ne se synchronisent pas entre
  appareils. Utilisez l'export de projet pour les déplacer. Si le navigateur interdit le stockage local (navigation
  privée, par exemple), l'application le signale et reste utilisable, sans sauvegarde.
- Les calques sont exportés à la taille traitée, 1600 px au plus sur le grand côté.
- Les pixels transparents d'une image PNG comptent comme du blanc.
- Le PDF reprend la définition traitée (1600 px au plus) : agrandie à une grande largeur, l'image perd en finesse (la
  résolution effective de l'exemple 1600 px sur 400 mm est d'environ 100 ppi).
- Dans le PDF, les légendes n'acceptent que les caractères Latin-1 (les accents français passent) ; tout autre
  caractère devient « ? ».
- Pas de vectorisation (SVG) dans cette version.

---

# Pour les développeurs

## Démarrage

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev               # serveur de développement (http://localhost:5173)
npm test                  # tests unitaires (Vitest)
npm run build             # vérification des types + build de production dans dist/
npm run preview           # sert le build de production (http://localhost:4173)
npm run e2e               # tests de bout en bout (Playwright) ; construit puis sert l'application
npm run capture:readme    # régénère les images du README (docs/images/)
```

Pour Playwright, `npx playwright install --with-deps chromium` installe le navigateur. Avec un Chromium déjà présent,
indiquez son chemin : `PW_CHROMIUM_PATH=/chemin/vers/chrome npm run e2e` (ou `CHROME_PATH` pour `capture:readme`).

## Technologies

React + TypeScript + [Vite](https://vite.dev/). Les algorithmes sont des fonctions pures, sans DOM, exécutées dans un
**Web Worker** ; le rendu passe par Canvas / OffscreenCanvas. [idb-keyval](https://github.com/jakearchibald/idb-keyval)
pour IndexedDB, [Vitest](https://vitest.dev/) et [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) pour les
tests unitaires, [Playwright](https://playwright.dev/) pour le parcours complet. Application 100 % statique, aucun
serveur. Pas de bibliothèque de composants ni de CSS-in-JS : une seule feuille de style (`src/ui/app.css`).

## Organisation du code

| Dossier / fichier | Rôle |
|---|---|
| `src/core/types.ts` | Types partagés : `RgbaImage`, `Lab`, `Rgb`. |
| `src/core/color.ts` | Conversion sRGB ⇄ Lab (D65). |
| `src/core/adjust.ts` | Réglages (`Settings`, valeurs par défaut, bornes, `normalizeSettings`) et `adjustImage` : fond blanc, lissage, tonalité, inversion, miroir. |
| `src/core/quantize.ts` | Quantification k-means dans Lab : image + N → indices de calques + centroïdes. |
| `src/core/layers.ts` | `despeckle` (nettoyage des pixels isolés) et `layerMasks` (un masque binaire par calque). |
| `src/core/pipeline.ts` | `processImage` : réglages → quantification → nettoyage. Appelé par le worker. |
| `src/core/palette.ts` | Chargement et validation d'une palette JSON, teinte la plus proche. |
| `src/core/render.ts` | RGBA de l'aperçu (`compositeRgba`) et des masques (`maskRgba`). |
| `src/core/pdf.ts` | Export PDF multipages (`layersToPdf`) : écrit le fichier à la main, sans bibliothèque. |
| `src/workers/` | `process.worker.ts` (enveloppe du pipeline), `protocol.ts` (messages), `client.ts` (`ProcessingClient`, annulable). |
| `src/store/projects.ts` | IndexedDB (projets) et fichier projet (export / import). |
| `src/ui/` | `App.tsx` (état et composition), `Sidebar.tsx`, `SettingsPanel.tsx`, `LayerCard.tsx`, `RgbaCanvas.tsx`, `Icon.tsx`, `loadImage.ts`, `export.ts`, `app.css`. |
| `public/palettes/` | Bibliothèques de teintes (JSON). |
| `e2e/` | Tests Playwright. |
| `scripts/capture-readme.mjs` | Génère les images du README (`scripts/assets/cigale.webp` est l'image d'exemple). |
| `docs/images/` | Captures du README (générées). |
| `.github/workflows/deploy.yml` | Tests, build et publication sur GitHub Pages. |
| `docs/superpowers/` | Spécification de conception et plan d'implémentation de la version 1. |

Les tests unitaires (`*.test.ts`) sont à côté du code qu'ils testent.

## Le traitement d'une image

`processImage` (`src/core/pipeline.ts`) enchaîne trois étapes :

1. **`adjustImage`** : l'image est d'abord posée sur fond blanc (les pixels transparents deviennent blancs et opaques),
   puis, dans cet ordre : lissage (flou en boîte, séparable, rayon 0 à 5), saturation, luminosité puis contraste,
   inversion, miroir horizontal. Avec les réglages par défaut, une image opaque ressort inchangée.
2. **`quantize`** : conversion en Lab, puis k-means. Initialisation de type k-means++ (graine fixe, donc résultat
   déterministe), centroïdes calculés sur un échantillon d'environ 50 000 pixels, 20 itérations au plus, arrêt anticipé
   à la convergence ; tous les pixels sont ensuite affectés au centroïde le plus proche. Les clusters vides sont
   supprimés (une image unie donne un seul calque) et les calques sont triés du plus clair au plus sombre.
   `RangeError` si N n'est pas un entier de 2 à 16, ou si l'image est vide.
3. **`despeckle`** : un pixel sans aucun voisin (8-connexité) de même étiquette prend l'étiquette majoritaire de ses
   voisins. Le réglage « nettoyage » répète cette passe 0 à 3 fois.

`layerMasks` produit ensuite un masque par calque : les masques sont disjoints et leur union couvre l'image.

## Export PDF

`layersToPdf` (`src/core/pdf.ts`) écrit le PDF directement, sans bibliothèque : les calques étant des masques binaires,
chaque page contient une **image 1 bit** (`packMask`, 1 pixel = 1 bit, noir = encre) compressée en Flate avec
`CompressionStream` du navigateur (stockée telle quelle si l'API manque). Un PDF de 16 calques de 1600 px pèse une
centaine de Ko et se génère en moins d'une seconde. Le fichier est une structure PDF 1.4 classique : catalogue, liste des
pages, police Helvetica (légendes en Latin-1), puis trois objets par page (page, contenu, image) et la table `xref`.

### Disposition de la page

`pageLayout(width, height, widthMm)` calcule la page de chaque calque :

- **sans largeur** (`widthMm` nul) : A4, en paysage si l'image est plus large que haute, image mise à l'échelle pour
  tenir dans les marges (`PAGE_MARGIN`, 48 pt) sous la légende ;
- **avec une largeur** : l'image est placée à cette taille exacte (mm → points, 72 / 25,4), et la page est le plus petit
  format ISO (A4 à A0, orientation de l'image d'abord) où elle tient avec marges et légende ; au-delà de l'A0, la page est
  sur mesure. `tooLarge` signale une page de plus de 14 400 pt (200 pouces, limite des lecteurs PDF) : `layersToPdf` lève
  alors une `RangeError` et l'interface désactive le bouton.

La disposition ne dépend que des dimensions de l'image et de la largeur, donc tous les calques tombent au même endroit.
Elle renvoie aussi le format retenu et la taille imprimée, que le panneau de réglages affiche. La largeur est le réglage
`printWidthMm` (0 = automatique, 2000 mm au plus).

### Repères de calage

`registrationMarks(layout)` donne les centres des quatre repères : un par coin du cadre de l'image, décalé de 20 pt vers
l'extérieur en diagonale. Chaque repère est un cercle (rayon 5 pt) et deux traits (demi-longueur 9 pt), en noir à 0,5 pt
(`marksContent`). La marge de page et la hauteur réservée à la légende garantissent que les repères restent à plus de
6 mm du bord du papier et ne touchent pas la légende, quelle que soit la taille de l'image ; des tests le vérifient pour
plusieurs formats. L'option `registrationMarks` de `layersToPdf` (réglage du même nom, activé par défaut, enregistré avec
le projet) les désactive.

### Légendes et interface

Chaque page porte une légende (carré de la couleur de la teinte, « Calque 2/4 · nom · réf. … »). Les caractères hors
Latin-1 sont remplacés par « ? ». L'interface (`exportPdf` dans `App.tsx`) compose les légendes à partir des teintes
choisies et télécharge le fichier `<nom>-calques.pdf`.

## Worker et annulation

`ProcessingClient` (`src/workers/client.ts`) crée un worker par calcul. Un nouvel appel à `run` annule le précédent :
la promesse en cours est rejetée avec `CancelledError` et son worker est terminé. Une réponse portant un ancien `id`
est ignorée, donc seule la dernière demande est appliquée. Dans `App.tsx`, les curseurs de réglage réagissent tout de
suite mais le recalcul attend 150 ms de calme (anti-rebond). La **définition maximale** agit au chargement de l'image
(`loadImage`), pas dans le worker : la changer recharge l'image.

## Teintes

Les teintes sont dans `public/palettes/*.json`. Format :

```json
{
  "id": "aqua-wash-60ml",
  "name": "Encre Aqua Wash 60 ml",
  "swatches": [
    { "id": "blanc-de-titane", "name": "Blanc de titane", "hex": "#fffffd", "ref": "490488" },
    { "id": "bleu-ocean", "name": "Bleu océan", "hex": "#1a3982", "ref": "490479" }
  ]
}
```

`id` est unique dans la palette, `hex` s'écrit `#rrggbb`, `ref` (référence d'encre) est facultatif. `parsePalette`
rejette une palette invalide avec un message « Palette invalide : … ». L'application charge `linocut-inks.json`
(le nom du fichier est resté, son contenu est la palette Aqua Wash) ; un test vérifie que cette palette est valide,
complète et que les références sont uniques. La teinte proposée pour un calque est la plus proche de son centroïde,
mesurée dans Lab.

Les codes `hex` ont été relevés sur les pastilles de couleur du site du fournisseur (rendu à l'écran) : ils donnent
une bonne approximation, pas une mesure de l'encre imprimée. Plusieurs noirs ont la même valeur (`#000000` ou `#171717`) ;
à couleur égale, la première teinte de la liste est proposée.

## Persistance

Les projets sont dans IndexedDB (`src/store/projects.ts`, clés `project:<id>`). Un projet contient l'image d'origine
(octets et type), le nombre de couleurs, les teintes choisies et les réglages. Le fichier d'export est un JSON
(`version: 1`, image en base64) : `projectFromFile` valide sa structure, et des `settings` absents (ancien projet) ou
hors bornes sont ramenés à des valeurs valides par `normalizeSettings`. Si IndexedDB est indisponible, `App` bascule en
mode sans sauvegarde et le signale dans la barre latérale.

## Tests

- **Vitest** (`npm test`) : couleur, quantification (nombre de calques, transparence, image unie, N hors bornes),
  réglages, calques (masques disjoints couvrant l'image), palettes (dont la palette livrée), client de worker
  (annulation, réponses périmées), redimensionnement, projets (IndexedDB simulée, fichier projet) et export PDF : bits des
  images, table `xref`, images relues après décompression, échappement des légendes, format de page selon la largeur
  en mm, position des repères de calage.
- **Playwright** (`npm run e2e`) : charger une image, séparer en 4 calques, changer N, attribuer des teintes, exporter,
  fichier qui n'est pas une image, enregistrer puis rouvrir un projet, réglages et réinitialisation, export PDF
  multipages, largeur en mm (taille de l'image et format de page dans le fichier), repères de calage.

## Publication

Le workflow `.github/workflows/deploy.yml` (**GitHub Actions**) s'exécute à chaque push sur `main` : installation
(`npm ci`), tests, build, puis publication sur **GitHub Pages** (https://charlescoiffier.github.io/lino/). Le badge en
tête de ce fichier reflète l'état du dernier run.

- Le site est servi dans un sous-dossier : `vite.config.ts` lit la variable `BASE_PATH`, que le workflow fixe à
  `/<dépôt>/`. Sans elle, le site est servi à la racine, comme en local.
- La source de GitHub Pages doit être réglée sur **GitHub Actions** (Settings → Pages), une seule fois.
- GitHub Pages met les fichiers en cache une dizaine de minutes : après un déploiement, un rechargement forcé
  (Cmd/Ctrl + Maj + R) affiche la nouvelle version.

## Images du README

`npm run capture:readme` (`scripts/capture-readme.mjs`) construit l'application, la sert avec `vite preview`, charge
l'image d'exemple `scripts/assets/cigale.webp` et enregistre les captures (bureau, panneau de réglages, mode sombre,
mobile) dans `docs/images/`. Les images sont versionnées.

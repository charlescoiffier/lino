# Lino: spec de conception

Date: 2026-10-06

## Objectif
Application web pour préparer une image en vue d'une linogravure. L'utilisateur charge une image et choisit un nombre de couleurs N. Lino sépare l'image en N calques (un par passage d'encre). Chaque calque reçoit une teinte choisie dans une bibliothèque de teintes. Les calques sont exportables pour la gravure.

## Périmètre
- Outil personnel, un seul utilisateur, sans compte ni authentification.
- Hébergé dans le cloud comme site statique. Aucun serveur applicatif.
- Hors périmètre v1: comptes, synchronisation entre appareils, partage par lien, vectorisation SVG (v2).

## Décisions
- Approche **100 % client**: tout le traitement d'image s'exécute dans le navigateur. Les images ne quittent jamais l'appareil.
- Évolution possible vers un hybride (API serverless pour teintes et projets) si des comptes deviennent nécessaires.

## Stack
- React + TypeScript + Vite.
- Web Worker pour le traitement; Canvas/OffscreenCanvas pour le rendu.
- Quantification k-means dans l'espace Lab. WASM seulement si les performances l'exigent.
- Teintes: `public/palettes/*.json` (nom, hex, référence d'encre optionnelle).
- Persistance: IndexedDB, plus export/import d'un fichier projet.
- Hébergement: Cloudflare Pages, déploiement continu depuis Git.
- Tests: Vitest (algorithmes), Playwright (parcours complet).

## Modules
- `core/quantize`: image + N → carte d'indices + centroïdes. Fonction pure, sans DOM.
- `core/layers`: carte d'indices → masques binaires par calque, avec nettoyage (médian/morphologique) des pixels isolés.
- `core/palette`: chargement et recherche dans la bibliothèque de teintes.
- `workers/process.worker`: enveloppe `quantize`/`layers`, communication par messages, annulable.
- `store/projects`: lecture/écriture IndexedDB, export/import de fichier projet.
- `ui/`: chargement d'image, réglage de N, aperçu des calques, sélecteur de teinte, export.

## Flux de données
Image chargée → redimensionnée si trop grande → worker (quantification + calques) → aperçu composite et calques → attribution des teintes → export PNG par calque et aperçu final.

## Gestion des erreurs
- Format ou taille d'image non supportés: message clair.
- Changement de N pendant un calcul: le calcul en cours est annulé et relancé.
- IndexedDB indisponible: l'app reste utilisable sans sauvegarde.

## Hypothèses à valider
- Les images font quelques mégapixels (redimensionnement automatique au-delà d'un seuil à fixer pendant l'implémentation).
- Chaque calque s'exporte en noir et blanc, prêt à imprimer ou à transférer sur le lino.

## Vérification
- Vitest: sur images synthétiques, le nombre de calques vaut N, les masques sont disjoints et leur union couvre l'image.
- Playwright: charger une image, choisir N=4, attribuer des teintes, exporter, vérifier les fichiers.
- Déploiement de prévisualisation sur Cloudflare Pages.

# Web SIG - Terrasses en Pierres Sèches du PNR Mont Ventoux

Application Web SIG développée dans le cadre du **Master 2 GEOTER** (2025-2026), Avignon Université, en partenariat avec le Parc Naturel Régional du Mont Ventoux.

**Accès à l'application :** [https://m2geoter-2025-2026.github.io/webmapping_terrasses_ventoux/](https://m2geoter-2025-2026.github.io/webmapping_terrasses_ventoux/)

## Contexte

Les terrasses en pierres sèches constituent un patrimoine agricole et paysager majeur du PNR Mont Ventoux. Souvent masquées par le couvert forestier ou partiellement dégradées, leur identification manuelle est chronophage et difficilement reproductible. Ce projet vise à automatiser leur détection à partir de données **LiDAR HD** et d'algorithmes d'apprentissage automatique, puis à rendre les résultats accessibles via une interface cartographique interactive.

## Méthodologie

### Random Forest

Le modèle Random Forest a été entraîné sur un masque de ~1,6 million de pixels labellisés manuellement, à partir de **10 variables explicatives** :

- **Pente** (dérivée du MNT LiDAR HD, résolution 0.5 m)
- **NDVI** (BD ORTHO IRC 2024, IGN)
- **8 variables focales** : écart-type des pentes et TRI (Terrain Ruggedness Index) calculés sur 4 rayons (3, 7, 9 et 11 m)

La classification finale repose sur le vote majoritaire de plusieurs centaines d'arbres de décision, produisant une probabilité d'appartenance à la classe « terrasse » comprise entre 0 et 1.

**Validation** : Overall Accuracy = 73 %, Kappa = 0.469, Score-F1 = 0.727.

### Ruptures de pentes

Les ruptures de pentes (murs de soutènement en pierre sèche) ont été détectées via la méthode **Multi-Scale Relief Model (MSRM)**. Cet algorithme fonctionne comme un filtre passe-haut multi-échelle : en soustrayant l'altitude moyenne du terrain à l'altitude réelle sur plusieurs rayons de calcul, il neutralise la pente générale du versant pour ne faire ressortir que les micro-reliefs caractéristiques des murets.

## Données cartographiques

| Couche | Type | Source |
|--------|------|--------|
| Probabilité d'occurrence | Raster | ArcGIS Tile Server |
| Terrasses (Random Forest) | Polygones (~131 000 entités) | ArcGIS FeatureServer |
| Ruptures de pentes (MSRM) | Lignes | ArcGIS FeatureServer |
| Modèle Numérique de Terrain | Raster | ArcGIS Tile Server |
| Ombrage (Hillshade) | Raster | ArcGIS Tile Server |
| Communes du PNR | Polygones | GeoJSON local |
| Registres parcellaires | Polygones | GeoJSON local (VectorGrid) |

**Sources :** LiDAR HD et BD ORTHO IRC 2024 — [IGN Geoplateforme](https://geoservices.ign.fr/)

## Fonctionnalités du Web SIG

- **Gestion des couches** : activation/désactivation, opacité ajustable, couleur personnalisable
- **Ordre des calques** : réorganisation par glisser-déposer
- **Clusters adaptatifs** : regroupement dynamique avec compteur (zoom < 14), géométries réelles (zoom ≥ 14)
- **Outils de mesure** : distance, surface, coordonnées au clic, localisation GPS
- **Barre de coordonnées** : affichage temps réel de la position et du niveau de zoom
- **Profil altimétrique** : coupe topographique interactive via l'API Géoplateforme IGN (axe X en km réels)
- **3 fonds de carte** : Google Satellite (défaut), Esri Light, OpenStreetMap — couleurs des limites administratives adaptées automatiquement à chaque fond
- **Légende dynamique** : swatches synchronisés avec le fond de carte actif
- **Export PNG** de la vue carte
- **Interface responsive** : mobile (toolbar fixe, espacement optimisé), tablette et desktop
- **Repli du header/footer** : maximisation de la zone carte en un clic

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `D` | Outil distance |
| `S` | Outil surface |
| `X` | Outil coordonnées |
| `L` | Localisation GPS |
| `F` | Plein écran |
| `P` | Export PNG |
| `Échap` | Annuler l'outil actif |

## Structure du projet

```
.
├── index.html          # Page principale
├── script.js           # Logique applicative (Leaflet + ArcGIS)
├── styles.css          # Feuille de styles
├── data/
│   ├── Emprise_PNR.geojson
│   ├── Communes_PNR.geojson
│   └── Parcelles_PNR.geojson
├── media/
│   ├── LogoPNR.png / .jpg
│   ├── LogoUA.png / .jpeg
│   └── LogoGeoter.png / .jpeg
└── README.md
```

## Technologies

- **Leaflet** 1.9.4 + plugins (MiniMap, VectorGrid, MarkerCluster)
- **Turf.js** 6 (analyse spatiale côté client)
- **Chart.js** (profil altimétrique)
- **html2canvas** (export PNG)
- **Font Awesome** 6.5.1
- **Polices** : Inter (corps), Lora (titres)

## Système de référence

EPSG:4326 - WGS 84

## Licence

CC BY-SA 4.0 — Master GEOTER, Université d'Avignon, 2025/2026

## Dépôt lié

Les scripts de traitement (Random Forest, MSRM, masque d'entraînement) sont disponibles sur le dépôt associé :
[m2geoter-2025-2026/terrasses_ventoux](https://github.com/m2geoter-2025-2026/terrasses_ventoux)

## Auteurs

Master 2 GEOTER (2025-2026) — Avignon Université / PNR Mont Ventoux

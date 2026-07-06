# cfp-export-csv

CLI pour transformer un fichier JSON extrait de ConferenceHall en CSV


## Import Grist

### Générer les fichiers CSV

La commande `node csv-2-grist.js <proposals.json> <output-dir>` permet de créer les fichiers suivants :

* categories.csv
* formats.csv
* languages.csv
* level.csv
* proposals.csv
* speakers.csv
* tags.csv

### Import

Les fichiers peuvent ensuite être importés dans Grist en créant une table par fichier CSV.

### Post-import

Il reste à ajouter les relations sur les différentes colonnes.  

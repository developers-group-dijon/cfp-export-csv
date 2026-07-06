#!/usr/bin/env node
/**
 * Transforme l'export DevFest (JSON Conference Hall) en plusieurs CSV
 * prêts à importer dans Grist.
 *
 * Principe : pour chaque table on construit un tableau d'objets PLATS
 * (aucun sous-objet : review est aplati, et chaque liste est sérialisée en
 * une seule chaîne via joinList). C'est la bibliothèque json-2-csv qui se
 * charge ensuite de tout le formatage / échappement CSV (quoting RFC 4180).
 *
 * Installation :
 *   npm install            (lit package.json -> json-2-csv)
 *
 * Usage :
 *   node json-to-grist-csv.js [chemin/vers/input.json] [dossier/sortie]
 *   (défaut : ./devfest-dijon-2026-proposals.json  ->  ./csv)
 *
 * Tables générées :
 *   formats.csv     (name)
 *   categories.csv  (name)
 *   languages.csv   (name)
 *   level.csv       (name)
 *   tags.csv        (name)
 *   speakers.csv    (id, name, bio, company, references, location, email, socialLinks)
 *   proposals.csv   (id, title, abstract, references,
 *                    review_average, review_positives, review_negatives,
 *                    level, formats, categories, tags, languages, speakers)
 */

import fs from 'node:fs';
import path from 'node:path';
import converter from "json-2-csv";

// ---------------------- Configuration ----------------------
const INPUT_PATH = process.argv[2] || 'devfest-dijon-2026-proposals.json';
const OUTPUT_DIR = process.argv[3] || 'csv';
const LIST_SEP = ', ';      // séparateur des valeurs dans une cellule multi-valuée
const LIST_FORMAT = 'csv'; // 'csv'  = valeurs jointes par LIST_SEP, chaque élément
                           //          contenant le séparateur est quoté -> "a,b",c
                           // 'json' = tableau JSON ["a","b"], format natif des
                           //          listes Grist, robuste à TOUTE valeur.
// -----------------------------------------------------------

// Sérialise une liste de valeurs en UNE seule chaîne, sans ambiguïté même si
// une valeur contient le séparateur (cf. LIST_FORMAT). Le résultat est une
// chaîne scalaire : aucun sous-objet n'est transmis à json-2-csv.
function joinList(items) {
  const arr = (items || []).map((v) => (v === null || v === undefined ? '' : String(v)));
  if (arr.length === 0) return '';
  if (LIST_FORMAT === 'json') return JSON.stringify(arr);
  return arr
    .map((s) =>
      (s.includes(LIST_SEP) || s.includes('"') || s.includes('\n') || s.includes('\r'))
        ? '"' + s.replace(/"/g, '""') + '"'
        : s
    )
    .join(LIST_SEP);
}

// Valeurs uniques, triées en français, vides/null exclus -> [{name}, ...]
function refRows(values) {
  return [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ''))]
    .sort((a, b) => String(a).localeCompare(String(b), 'fr'))
    .map((name) => ({ name }));
}

const CSV_OPTS = {
  expandNestedObjects: false, // objets déjà plats
  expandArrayObjects: false,  // listes déjà sérialisées en chaînes
  unwindArrays: false,        // pas d'éclatement en lignes
  emptyFieldValue: '',        // null/undefined -> cellule vide
};

function writeTable(name, rows, keys) {
  const csv = converter.json2csv(rows, { ...CSV_OPTS, keys });
  fs.writeFileSync(path.join(OUTPUT_DIR, name), csv, 'utf8');
  console.log(`  \u2713 ${name.padEnd(16)} ${rows.length} ligne(s)`);
}

// ---------------------- Lecture ----------------------
const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
const proposals = Array.isArray(data.proposals) ? data.proposals : [];
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
console.log(`Lecture : ${INPUT_PATH}  (${proposals.length} propositions)`);

// ---------------------- Tables de référence ----------------------
writeTable('formats.csv',    refRows(proposals.flatMap((p) => p.formats || [])),    ['name']);
writeTable('categories.csv', refRows(proposals.flatMap((p) => p.categories || [])), ['name']);
writeTable('languages.csv',  refRows(proposals.flatMap((p) => p.languages || [])),  ['name']);
writeTable('level.csv',      refRows(proposals.map((p) => p.level)),                 ['name']);
writeTable('tags.csv',       refRows(proposals.flatMap((p) => p.tags || [])),        ['name']);

// ---------------------- Speakers (dédupliqués par id) ----------------------
const speakersById = new Map();
for (const p of proposals) {
  for (const s of p.speakers || []) {
    if (!speakersById.has(s.id)) speakersById.set(s.id, s);
  }
}
const speakerRows = [...speakersById.values()]
  .sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr'))
  .map((s) => ({
    id: s.id,
    name: s.name,
    bio: s.bio,
    company: s.company,
    references: s.references,
    location: s.location,
    email: s.email,
    socialLinks: joinList(s.socialLinks),
  }));
writeTable('speakers.csv', speakerRows,
  ['id', 'name', 'bio', 'company', 'references', 'location', 'email', 'socialLinks']);

// ---------------------- Proposals ----------------------
const proposalRows = proposals.map((p) => {
  const r = p.review || {};
  return {
    id: p.id,
    title: p.title,
    abstract: p.abstract,
    references: p.references,
    review_average: r.average ?? '',
    review_positives: r.positives ?? '',
    review_negatives: r.negatives ?? '',
    level: p.level || '',
    formats: joinList(p.formats),
    categories: joinList(p.categories),
    tags: joinList(p.tags),
    languages: joinList(p.languages),
    speakers: joinList((p.speakers || []).map((s) => s.id)),
  };
});
writeTable('proposals.csv', proposalRows,
  ['id', 'title', 'abstract', 'references',
   'review_average', 'review_positives', 'review_negatives',
   'level', 'formats', 'categories', 'tags', 'languages', 'speakers', 'foo']);

console.log(`Termin\u00e9 \u2192 dossier "${OUTPUT_DIR}"`);
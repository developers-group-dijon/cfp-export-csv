import fs from 'node:fs';
import converter from "json-2-csv";

if (process.argv.length !== 3) {
  throw new Error("Le script attend un unique paramètre : le fichier JSON à traiter");
}

const jsonFile = process.argv[2];
if (!fs.existsSync(jsonFile)) {
  throw new Error(`Le fichier ${jsonFile} n'existe pas`);
}

const jsonData = fs.readFileSync(jsonFile, { encoding: 'utf8' })
const rawData = JSON.parse(jsonData);

const categories = new Map(rawData.categories.map(({id, name}) => [id, name]))
const formats = new Map(rawData.formats.map(({id, name}) => [id, name]))
const speakers = new Map(rawData.speakers.map((speaker) => [speaker.uid, speaker]))

const formattedData = rawData.talks.map((talk) => {
  return {
    title: talk.title,
    format: formats.get(talk.formats),
    category: categories.get(talk.categories),
    language: talk.language,
    level: talk.level,
    rating: talk.rating,
    loves: talk.loves ? "💚" : null,
    hates: talk.hates ? "❌" : null,
    speakers: talk.speakers.map((speakerId) => {
      const speaker = speakers.get(speakerId)
      const companyStr = speaker.company ? ` (${speaker.company})` : ''
      const localityStr = speaker.address?.locality?.short_name ? ` [${speaker.address?.locality?.short_name}]` : ''
      return `${speaker.displayName}${companyStr}${localityStr}`
    }).join(" ; ")
  }
})

console.log(converter.json2csv(formattedData, {
  expandArrayObjects: true,
  emptyFieldValue: ""
}))

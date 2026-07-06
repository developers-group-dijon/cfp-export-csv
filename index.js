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

const formattedData = rawData.proposals.map((talk) => {
  return {
    title: talk.title,
    format: talk.formats.join(" ; "),
    category: talk.categories.join(" ; "),
    languages: talk.languages.join(" ; "),
    level: talk.level?.toLocaleLowerCase("fr-FR"),
    rating: `${talk.review.average}`.replace(".", ","),
    loves: "💚".repeat(talk.review.positives ?? 0),
    hates: "❌".repeat(talk.review.negatives ?? 0),
    tags: talk.tags.join(" ; "),
    speakers: talk.speakers.map((speaker) => {
      const companyStr = speaker.company ? ` (${speaker.company})` : ''
      const localityStr = speaker.address?.locality?.short_name ? ` [${speaker.address?.locality?.short_name}]` : ''
      return `${speaker.name}${companyStr}${localityStr}`
    }).join(" ; ")
  }
})

console.log(converter.json2csv(formattedData, {
  // Délimiter custom pour que le copier/coller se fasse bien dans gsheet
  delimiter: {field: "§"},
  expandArrayObjects: true,
  emptyFieldValue: ""
}))

import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = process.argv[2];
const previewDir = process.argv[3];
if (!workbookPath || !previewDir) throw new Error("Usage: verify-google-sheet-template.mjs <workbook.xlsx> <preview-dir>");

await fs.mkdir(previewDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheets = [
  ["README", "A1:H20"],
  ["Settings", "A1:C16"],
  ["Sections", "A1:H14"],
  ["Questions", "A1:H16"],
  ["Options", "A1:H14"],
  ["Logic", "A1:J14"],
  ["Fields", "A1:Q12"],
  ["Transport_Map", "A1:E14"],
  ["Dashboard", "A1:H12"],
  ["Responses_Wide", "A1:G4"],
  ["JSON_Long", "A1:L4"],
  ["Maize_Plots", "A1:G4"],
  ["Livestock_Breeds", "A1:G4"],
  ["Climate_Events", "A1:G4"],
  ["Losses", "A1:G4"],
  ["Support_Needs", "A1:J4"],
  ["Codebook", "A1:I12"],
];

const outputs = [];
for (const [sheetName, range] of sheets) {
  const preview = await workbook.render({ sheetName, range, scale: 0.9, format: "png" });
  const target = path.join(previewDir, `${String(outputs.length + 1).padStart(2, "0")}-${sheetName}.png`);
  await fs.writeFile(target, new Uint8Array(await preview.arrayBuffer()));
  outputs.push(target);
}

const keyRanges = {};
for (const [sheetName, range] of [["Dashboard", "A1:B11"], ["Questions", "A1:H10"], ["Transport_Map", "A1:E10"]]) {
  keyRanges[sheetName] = (await workbook.inspect({ kind: "table", range: `${sheetName}!${range}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 10, maxChars: 5000 })).ndjson;
}
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "verification error scan" });
console.log(JSON.stringify({ sheetCount: sheets.length, previews: outputs, keyRanges, formulaErrors: errors.ndjson }, null, 2));

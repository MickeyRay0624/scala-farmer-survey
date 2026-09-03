import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("..", import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, "config", "survey-config.json"), "utf8"));
const outputDir = path.join(root, "outputs", "scala-config-20260903");
const outputPath = path.join(outputDir, "SCALA_Farmer_Survey_TEST_Manager.xlsx");

const colors = {
  forest: "#173F35",
  forest2: "#245A49",
  mint: "#E7F1EC",
  mint2: "#F4F8F6",
  gold: "#E5AC50",
  goldLight: "#FFF3D8",
  ink: "#1F2933",
  muted: "#5F6B66",
  line: "#D5E1DB",
  white: "#FFFFFF",
  redLight: "#FDE8E7",
};

const workbook = Workbook.create();

function addSheet(name) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  return sheet;
}

function applyTitle(sheet, range, title, subtitle = "") {
  sheet.mergeCells(range);
  const [topLeft, bottomRight] = range.split(":");
  const startColumn = topLeft.match(/^[A-Z]+/)[0];
  const endColumn = bottomRight.match(/^[A-Z]+/)[0];
  sheet.getRange(topLeft).values = [[title]];
  sheet.getRange(range).format = {
    fill: colors.forest,
    font: { bold: true, color: colors.white, size: 18 },
    verticalAlignment: "center",
  };
  sheet.getRange(range).format.rowHeight = 34;
  if (subtitle) {
    const row = Number(topLeft.match(/\d+$/)[0]) + 1;
    const subtitleRange = `${startColumn}${row}:${endColumn}${row}`;
    sheet.mergeCells(subtitleRange);
    sheet.getRange(`${startColumn}${row}`).values = [[subtitle]];
    sheet.getRange(subtitleRange).format = {
      fill: colors.mint,
      font: { color: colors.ink, italic: true },
      wrapText: true,
      verticalAlignment: "center",
    };
    sheet.getRange(subtitleRange).format.rowHeight = 40;
  }
}

function writeTable(sheet, startRow, headers, rows, tableName, widths = {}) {
  const startCol = 1;
  const endCol = headers.length;
  const endRow = startRow + rows.length;
  const range = sheet.getRangeByIndexes(startRow - 1, startCol - 1, rows.length + 1, headers.length);
  range.values = [headers, ...rows];
  const header = sheet.getRangeByIndexes(startRow - 1, startCol - 1, 1, headers.length);
  header.format = {
    fill: colors.forest2,
    font: { bold: true, color: colors.white },
    wrapText: true,
    verticalAlignment: "center",
  };
  header.format.rowHeight = 30;
  if (rows.length) {
    const body = sheet.getRangeByIndexes(startRow, startCol - 1, rows.length, headers.length);
    body.format = {
      font: { color: colors.ink },
      verticalAlignment: "top",
      wrapText: true,
      borders: { preset: "insideHorizontal", style: "thin", color: colors.line },
    };
  }
  sheet.tables.add(`A${startRow}:${columnName(endCol)}${endRow}`, true, tableName).style = "TableStyleMedium4";
  Object.entries(widths).forEach(([column, width]) => {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  });
  sheet.freezePanes.freezeRows(startRow);
  return range;
}

function columnName(number) {
  let value = number;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

const readme = addSheet("README");
applyTitle(readme, "A1:H1", "SCALA Farmer Survey · TEST manager", "Private response workbook + no-code questionnaire editor + automated JSON analysis");
readme.getRange("A4:H4").merge();
readme.getRange("A4").values = [["Start here"]];
readme.getRange("A4:H4").format = { fill: colors.gold, font: { bold: true, color: colors.ink, size: 14 } };
readme.getRange("A6:B13").values = [
  ["1", "Keep this workbook private. It will contain farmer responses."],
  ["2", "Open Extensions → Apps Script and add the provided Code.gs file."],
  ["3", "Run bootstrapTestEnvironment() once. It creates a separate TEST Google Form, links responses here, and installs the expansion trigger."],
  ["4", "Deploy the Apps Script as a web app for Anyone. The endpoint exposes configuration only—never responses."],
  ["5", "Paste the web-app URL into Settings → config_url and into the website runtime configuration."],
  ["6", "Edit Questions for wording/order; edit Options for answer labels/order; edit Logic for show/hide rules."],
  ["7", "Use SCALA Tools → Rebuild analysis after bulk imports or structural changes."],
  ["8", "After testing, repeat the setup for a separate production receiver. Do not reuse this TEST sheet for real interviews."],
];
readme.getRange("A6:A13").format = { fill: colors.forest2, font: { bold: true, color: colors.white }, horizontalAlignment: "center", verticalAlignment: "center" };
readme.getRange("B6:B13").format = { fill: colors.mint2, font: { color: colors.ink }, wrapText: true, verticalAlignment: "center", borders: { preset: "insideHorizontal", style: "thin", color: colors.line } };
readme.getRange("A15:B20").values = [
  ["Sheet", "Purpose"],
  ["Questions", "Daily editor: enable, reorder, and rewrite top-level questions."],
  ["Options", "Edit visible answer labels and their order; keep stored values stable after collection starts."],
  ["Logic", "Configure conditional display rules without code."],
  ["Fields / Codebook", "Technical field dictionary and analysis metadata."],
  ["Responses_Wide / JSON_Long / analysis tabs", "Generated outputs. Do not type into them manually."],
];
readme.getRange("A15:B15").format = { fill: colors.forest2, font: { bold: true, color: colors.white } };
readme.getRange("A16:B20").format = { wrapText: true, verticalAlignment: "top", borders: { preset: "insideHorizontal", style: "thin", color: colors.line } };
readme.getRange("A:A").format.columnWidth = 18;
readme.getRange("B:B").format.columnWidth = 78;
readme.getRange("C:H").format.columnWidth = 12;
readme.freezePanes.freezeRows(4);

const settingsSheet = addSheet("Settings");
applyTitle(settingsSheet, "A1:C1", "Settings", "Yellow cells are safe administrator inputs; URLs and IDs are filled automatically by the setup script where possible.");
const settings = config.settings.map((row) => ({ ...row }));
const setting = (key) => settings.find((row) => row.key === key);
setting("environment").value = "test";
setting("form_action").value = "";
setting("submission_enabled").value = "FALSE";
[
  ["form_id", "", "Generated TEST Google Form ID."],
  ["form_edit_url", "", "Private form editor link."],
  ["form_public_url", "", "TEST responder link."],
  ["response_sheet_url", "", "This workbook after Google Sheets import."],
  ["config_url", "", "Deployed Apps Script web-app endpoint used by the survey."],
  ["last_analysis_refresh", "", "Updated by the expansion script."],
].forEach(([key, value, description]) => {
  const existing = setting(key);
  if (existing) Object.assign(existing, { value, description });
  else settings.push({ key, value, description });
});
writeTable(settingsSheet, 4, ["key", "value", "description"], settings.map((row) => [row.key, row.value, row.description]), "SettingsTable", { A: 28, B: 58, C: 72 });
settingsSheet.getRange(`B5:B${settings.length + 4}`).format.fill = colors.goldLight;

const sectionsSheet = addSheet("Sections");
applyTitle(sectionsSheet, "A1:H1", "Sections", "Change section order and headings here. visible_for_modules accepts maize, livestock, or blank.");
writeTable(
  sectionsSheet,
  4,
  ["enabled", "section_id", "order", "menu_title", "section_title", "section_description", "visible_for_modules", "editor_notes"],
  config.sections.map((row) => [row.enabled, row.section_id, row.order, row.menu_title, row.section_title, row.section_description, row.visible_for_modules, row.editor_notes]),
  "SectionsTable",
  { A: 12, B: 24, C: 10, D: 28, E: 38, F: 72, G: 24, H: 38 },
);
sectionsSheet.getRange(`A5:A${config.sections.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };

const questionsSheet = addSheet("Questions");
applyTitle(questionsSheet, "A1:H1", "Questions · main editor", "Most non-technical edits happen here. Keep block_id and segment_id unchanged; change enabled, order, question_text, and help_text.");
writeTable(
  questionsSheet,
  4,
  ["enabled", "block_id", "section_id", "segment_id", "order", "question_text", "help_text", "editor_notes"],
  config.questions.map((row) => [row.enabled, row.block_id, row.section_id, row.segment_id, row.order, row.question_text, row.help_text, row.editor_notes]),
  "QuestionsTable",
  { A: 12, B: 46, C: 24, D: 38, E: 10, F: 72, G: 62, H: 44 },
);
questionsSheet.getRange(`A5:A${config.questions.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };

const optionsSheet = addSheet("Options");
applyTitle(optionsSheet, "A1:H1", "Answer options", "Edit option_label and option_order. Keep question_id and option_value stable after real data collection starts.");
writeTable(
  optionsSheet,
  4,
  ["enabled", "question_id", "option_order", "option_value", "option_label", "exclusive", "opens_detail_id", "editor_notes"],
  config.options.map((row) => [row.enabled, row.question_id, row.option_order, row.option_value, row.option_label, row.exclusive, row.opens_detail_id, row.editor_notes]),
  "OptionsTable",
  { A: 12, B: 48, C: 12, D: 45, E: 55, F: 12, G: 38, H: 54 },
);
optionsSheet.getRange(`A5:A${config.options.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };
optionsSheet.getRange(`F5:F${config.options.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };

const logicSheet = addSheet("Logic");
applyTitle(logicSheet, "A1:J1", "Conditional display logic", "Each row says when a target should be shown or hidden. Use | between multiple expected values.");
writeTable(
  logicSheet,
  4,
  ["enabled", "target_type", "target_id", "source_question_id", "operator", "expected_value", "effect", "join_mode", "clear_when_hidden", "editor_notes"],
  config.logic.map((row) => [row.enabled, row.target_type, row.target_id, row.source_question_id, row.operator, row.expected_value, row.effect, row.join_mode || "or", row.clear_when_hidden, row.editor_notes]),
  "LogicTable",
  { A: 12, B: 16, C: 42, D: 45, E: 18, F: 58, G: 12, H: 12, I: 18, J: 48 },
);
logicSheet.getRange(`A5:A${config.logic.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };
logicSheet.getRange(`B5:B${config.logic.length + 4}`).dataValidation = { rule: { type: "list", values: ["element", "block", "question", "section"] } };
logicSheet.getRange(`E5:E${config.logic.length + 4}`).dataValidation = { rule: { type: "list", values: ["equals", "not_equals", "contains", "any_of", "all_of", "not_contains", "not_empty", "empty", "greater_than", "greater_or_equal"] } };
logicSheet.getRange(`G5:G${config.logic.length + 4}`).dataValidation = { rule: { type: "list", values: ["show", "hide"] } };
logicSheet.getRange(`H5:H${config.logic.length + 4}`).dataValidation = { rule: { type: "list", values: ["or", "and"] } };
logicSheet.getRange(`I5:I${config.logic.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };

const fieldsSheet = addSheet("Fields");
applyTitle(fieldsSheet, "A1:O1", "Fields · technical editor", "Use this sheet for labels inside compound tables or to add a standard custom.* question. Most users can leave it unchanged.");
const fieldHeaders = ["enabled", "question_id", "section_id", "segment_id", "order", "block_id", "input_type", "field_label", "required", "placeholder", "min_value", "max_value", "step_value", "create_if_missing", "analysis_type", "sensitive", "editor_notes"];
writeTable(
  fieldsSheet,
  4,
  fieldHeaders,
  config.fields.map((row) => fieldHeaders.map((key) => row[key] ?? "")),
  "FieldsTable",
  { A: 12, B: 52, C: 24, D: 38, E: 10, F: 50, G: 16, H: 55, I: 12, J: 40, K: 12, L: 12, M: 12, N: 18, O: 18, P: 12, Q: 52 },
);
fieldsSheet.getRange(`A5:A${config.fields.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };
fieldsSheet.getRange(`I5:I${config.fields.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };
fieldsSheet.getRange(`N5:N${config.fields.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };
fieldsSheet.getRange(`P5:P${config.fields.length + 4}`).dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };

const transportSheet = addSheet("Transport_Map");
applyTitle(transportSheet, "A1:E1", "Google Form transport map", "The setup script fills entry_id values for the independent TEST form. Do not copy production IDs into this sheet.");
writeTable(
  transportSheet,
  4,
  ["payload_key", "entry_id", "field_type", "question_title", "editor_notes"],
  [...config.transport_map, { payload_key: "json_custom", field_type: "paragraph", question_title: "JSON · custom questions", editor_notes: "Stores newly added custom.* questions." }]
    .map((row) => [row.payload_key, "", row.field_type, row.question_title || "", "Filled by bootstrapTestEnvironment()."]),
  "TransportMapTable",
  { A: 44, B: 24, C: 18, D: 60, E: 54 },
);
transportSheet.getRange(`B5:B${config.transport_map.length + 5}`).format.fill = colors.goldLight;

const dashboard = addSheet("Dashboard");
applyTitle(dashboard, "A1:H1", "TEST response dashboard", "Refresh via SCALA Tools → Rebuild analysis. TEST data must not be mixed with production interviews.");
dashboard.getRange("A4:B11").values = [
  ["Metric", "Value"],
  ["Expanded responses", null],
  ["JSON answer values", null],
  ["Maize plot records", null],
  ["Livestock breed records", null],
  ["Climate event records", null],
  ["Loss records", null],
  ["Support and need records", null],
];
dashboard.getRange("B5").formulas = [["=MAX(0,COUNTA('Responses_Wide'!A2:A10000))"]];
dashboard.getRange("B6").formulas = [["=MAX(0,COUNTA('JSON_Long'!A2:A100000))"]];
dashboard.getRange("B7").formulas = [["=MAX(0,COUNTA('Maize_Plots'!A2:A10000))"]];
dashboard.getRange("B8").formulas = [["=MAX(0,COUNTA('Livestock_Breeds'!A2:A10000))"]];
dashboard.getRange("B9").formulas = [["=MAX(0,COUNTA('Climate_Events'!A2:A10000))"]];
dashboard.getRange("B10").formulas = [["=MAX(0,COUNTA('Losses'!A2:A10000))"]];
dashboard.getRange("B11").formulas = [["=MAX(0,COUNTA('Support_Needs'!A2:A10000))"]];
dashboard.getRange("A4:B4").format = { fill: colors.forest2, font: { bold: true, color: colors.white } };
dashboard.getRange("A5:A11").format = { fill: colors.mint, font: { bold: true, color: colors.ink } };
dashboard.getRange("B5:B11").format = { fill: colors.goldLight, font: { bold: true, color: colors.ink, size: 14 }, numberFormat: "#,##0", horizontalAlignment: "right" };
dashboard.getRange("A:A").format.columnWidth = 32;
dashboard.getRange("B:B").format.columnWidth = 18;

const outputSchemas = {
  Responses_Wide: ["response_id", "timestamp", "source_sheet", "source_row", "schema_versions", "json_sections", "parse_status"],
  JSON_Long: ["response_id", "timestamp", "source_sheet", "source_row", "source_column", "source_question", "schema", "section", "answer_path", "value", "value_type", "parse_status"],
  Maize_Plots: ["response_id", "timestamp", "plot_id", "selected", "plot_label", "topography", "area_rai"],
  Livestock_Breeds: ["response_id", "timestamp", "rank", "description", "source", "share_percent", "strengths"],
  Climate_Events: ["response_id", "timestamp", "source", "event_id", "selected_or_code", "severity", "details"],
  Losses: ["response_id", "timestamp", "rank", "affected_area", "hazard_year", "damage", "value_baht"],
  Support_Needs: ["response_id", "timestamp", "record_type", "rank_or_item", "area", "details", "annual_cost_baht", "constraint", "need", "priority"],
};

for (const [sheetName, headers] of Object.entries(outputSchemas)) {
  const sheet = addSheet(sheetName);
  sheet.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format = { fill: colors.forest2, font: { bold: true, color: colors.white }, wrapText: true };
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format.rowHeight = 30;
  sheet.freezePanes.freezeRows(1);
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format.columnWidth = 22;
}

const codebook = addSheet("Codebook");
applyTitle(codebook, "A1:I1", "Codebook", "Field definitions copied from the active configuration for analysts and data-quality review.");
writeTable(
  codebook,
  4,
  ["question_id", "section_id", "input_type", "field_label", "analysis_type", "required", "sensitive", "enabled", "notes"],
  config.fields.map((row) => [row.question_id, row.section_id, row.input_type, row.field_label, row.analysis_type, row.required, row.sensitive, row.enabled, row.editor_notes]),
  "CodebookTable",
  { A: 52, B: 24, C: 16, D: 58, E: 18, F: 12, G: 12, H: 12, I: 55 },
);

await fs.mkdir(outputDir, { recursive: true });
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);

const preview = await workbook.render({ sheetName: "README", range: "A1:B20", scale: 1.4, format: "png" });
await fs.writeFile(path.join(outputDir, "README-preview.png"), new Uint8Array(await preview.arrayBuffer()));
const editorPreview = await workbook.render({ sheetName: "Questions", range: "A1:H16", scale: 1.1, format: "png" });
await fs.writeFile(path.join(outputDir, "Questions-preview.png"), new Uint8Array(await editorPreview.arrayBuffer()));

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 9000,
  tableMaxRows: 5,
  tableMaxCols: 8,
  tableMaxCellChars: 90,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});

console.log(JSON.stringify({ outputPath, preview: path.join(outputDir, "README-preview.png"), summary: summary.ndjson, errors: errors.ndjson }, null, 2));

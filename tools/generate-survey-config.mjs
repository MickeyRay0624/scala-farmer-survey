import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const catalogPath = process.argv[2] || "/tmp/scala-survey-catalog.json";
const outputPath = path.join(root, "config", "survey-config.json");

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));

const productionTransport = {
  participant_id: "730105851",
  interview_date: "586214593",
  interview_location: "1064558567",
  consent: "1548488798",
  age: "614427163",
  gender: "1518832350",
  occupation: "1181406374",
  farming_years: "292390039",
  education: "1620154603",
  ethnicity: "1033950094",
  household_total: "5237903",
  household_farm_workers: "1684320186",
  land_tenure: "1550721741",
  financial_status: "896028899",
  agricultural_income_share: "732609465",
  financial_stability: "1100989624",
  province: "351154306",
  district: "1461762649",
  subdistrict: "156739556",
  village: "1537917553",
  json_general_and_community_context: "933991319",
  json_community_membership: "578153089",
  community_average_rating: "1775361658",
  json_hopes_and_concerns: "2068025504",
  concern_drought: "10100710",
  concern_flood_landslide: "1217225293",
  concern_heat: "716114873",
  concern_disease_pests: "997853596",
  concern_price_volatility: "68542505",
  concern_input_cost: "1141402020",
  concern_household_debt: "453910813",
  concern_labor_shortage: "1393931812",
  concern_soil_degradation: "61634773",
  concern_land_rights: "1603426565",
  json_corn_plot: "1949558594",
  json_corn_soil_land: "1428930569",
  json_corn_water: "996045301",
  json_corn_soil_problems: "751586416",
  json_corn_weeds_pests: "1227697557",
  json_corn_calendar_weather_systems: "1842809632",
  json_corn_varieties: "1490786184",
  json_corn_harvest_market: "352198314",
  json_livestock_farm: "329405922",
  json_livestock_housing_land: "623361055",
  json_livestock_water_feed: "889952861",
  json_livestock_health: "1387521111",
  json_livestock_climate: "549345395",
  json_livestock_breeds_market: "692996229",
  json_livestock_waste: "1448704257",
  json_climate_history: "2053115840",
  json_climate_losses: "1979045461",
  json_adaptation_measures: "899733878",
  json_support: "534112121",
  additional_feedback: "2139126812",
  follow_up: "1260236400",
};

const bool = (value) => Boolean(value);
const cleanTitle = (value) => String(value || "").replace(/\s+Required$/, "").trim();
const technicalPattern = /(^|\.)(selected|label|management_other)$/;
const sensitivePattern = /(gender|ethnicity|financial|income|location|province|district|subdistrict|village|latitude|longitude|price|cost|revenue|loss|debt)/i;

const sections = catalog.sections.map((section) => ({
  enabled: true,
  section_id: section.section_id,
  order: Number(section.order),
  menu_title: section.menu_title,
  section_title: section.section_title,
  section_description: section.section_description,
  visible_for_modules: section.visible_for_modules,
  editor_notes: "",
}));

const blockOccurrences = new Map();
const questions = catalog.blocks.map((block) => {
  const occurrence = (blockOccurrences.get(block.block_id) || 0) + 1;
  blockOccurrences.set(block.block_id, occurrence);
  const resolvedId = occurrence === 1 ? block.block_id : `${block.block_id}#${occurrence}`;
  return {
    enabled: true,
    block_id: resolvedId,
    section_id: block.section_id,
    segment_id: block.segment_id,
    order: Number(block.order),
    question_text: cleanTitle(block.title),
    help_text: block.help,
    editor_notes: block.block_id.startsWith("content:") ? "Layout/instruction block; edit cautiously." : "",
  };
});

const blockById = new Map(catalog.blocks.map((block) => [block.block_id, block]));
const fields = catalog.groups.map((group) => {
  const hasSelectableOptions = ["radio", "checkbox", "select"].includes(group.input_type) && group.options.some((item) => item.value);
  const parentBlock = blockById.get(group.block_id) || {};
  return {
    enabled: true,
    question_id: group.question_id,
    section_id: group.section_id,
    segment_id: parentBlock.segment_id || "start",
    order: Number(parentBlock.order || 9999),
    block_id: group.block_id,
    input_type: group.input_type,
    field_label: hasSelectableOptions && group.options.length > 1 ? "" : cleanTitle(group.question_text),
    required: bool(group.required),
    placeholder: group.placeholder || "",
    min_value: group.min || "",
    max_value: group.max || "",
    step_value: group.step || "",
    create_if_missing: false,
    analysis_type: group.input_type === "number" ? "number" : group.input_type === "date" ? "date" : hasSelectableOptions ? "category" : "text",
    sensitive: sensitivePattern.test(group.question_id),
    editor_notes: technicalPattern.test(group.question_id) ? "Technical helper field; normally do not edit the ID." : "",
  };
});

const options = [];
for (const group of catalog.groups) {
  if (!["radio", "checkbox", "select"].includes(group.input_type)) continue;
  const seen = new Set();
  for (const item of group.options) {
    if (!item.value || seen.has(item.value)) continue;
    seen.add(item.value);
    options.push({
      enabled: true,
      question_id: group.question_id,
      option_order: seen.size,
      option_value: item.value,
      option_label: item.label || item.value,
      exclusive: bool(item.exclusive),
      opens_detail_id: item.controls || "",
      editor_notes: "Change the label freely; keep option_value stable after data collection begins.",
    });
  }
}

const logicMap = new Map();
for (const group of catalog.groups) {
  if (!group.conditional_id || !group.controllers?.length) continue;
  const grouped = new Map();
  for (const controller of group.controllers) {
    const key = `${controller.name}::${controller.operator || "contains"}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(controller.value);
  }
  for (const [key, values] of grouped) {
    const [sourceQuestionId, baseOperator] = key.split("::");
    const row = {
      enabled: true,
      target_type: "element",
      target_id: group.conditional_id,
      source_question_id: sourceQuestionId,
      operator: values.length > 1 ? "any_of" : baseOperator,
      expected_value: values.join("|"),
      effect: "show",
      clear_when_hidden: false,
      editor_notes: "",
    };
    logicMap.set(`${row.target_type}|${row.target_id}|${row.source_question_id}`, row);
  }
}

const specialLogic = [
  ["l7-contract-support", "l.l6_arrangements", "contains", "Contract farming"],
  ["l24-feed-brands", "l.l23_feed_types", "contains", "Commercial pelleted / ready-made feed"],
  ["l25-feed-ingredients", "l.l23_feed_types", "contains", "Self-mixed feed"],
  ["l25-own-corn", "d.modules", "all_of", "maize|livestock"],
];
for (const [targetId, sourceQuestionId, operator, expectedValue] of specialLogic) {
  const row = {
    enabled: true,
    target_type: "element",
    target_id: targetId,
    source_question_id: sourceQuestionId,
    operator,
    expected_value: expectedValue,
    effect: "show",
    clear_when_hidden: false,
    editor_notes: "Existing survey rule, now editable from the sheet.",
  };
  logicMap.set(`${row.target_type}|${row.target_id}|${row.source_question_id}`, row);
}

const settings = [
  { key: "config_version", value: "2026-09-03-v2", description: "Increase after an approved structural change." },
  { key: "environment", value: "production", description: "production or test" },
  { key: "schema_version", value: "scala-farmer-survey-2026-09-03-v2", description: "Stored with every JSON response." },
  { key: "form_action", value: "https://docs.google.com/forms/d/e/1FAIpQLSchtHHQcFWIIhSaLELdh1xBC8LXdhgGVe387UPA7qAOmUZgNw/formResponse", description: "Google Form submission endpoint." },
  { key: "form_public_url", value: "", description: "Responder link for the selected environment." },
  { key: "config_cache_minutes", value: "5", description: "How long browsers may reuse a remote configuration." },
  { key: "submission_enabled", value: "TRUE", description: "Set FALSE to pause submissions without changing code." },
];

const transportMap = Object.entries(productionTransport).map(([payloadKey, entryId]) => ({
  payload_key: payloadKey,
  entry_id: entryId,
  field_type: payloadKey === "interview_date" ? "date" : payloadKey.startsWith("json_") ? "paragraph" : "text",
  question_title: "",
  editor_notes: "Generated from the production receiver. Do not change unless the Google Form changes.",
}));

const output = {
  meta: {
    generated_at: new Date().toISOString(),
    source: "SCALA Farmer Survey rendered DOM",
    schema_version: "scala-farmer-survey-2026-09-03-v2",
  },
  settings,
  sections,
  questions,
  fields,
  options,
  logic: [...logicMap.values()],
  transport_map: transportMap,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  outputPath,
  sections: sections.length,
  questions: questions.length,
  fields: fields.length,
  options: options.length,
  logic: output.logic.length,
  transport: transportMap.length,
}, null, 2));

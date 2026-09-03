import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = await fs.readFile(path.join(root, "google-apps-script", "Code.gs"), "utf8");
const context = vm.createContext({ console });
vm.runInContext(`${source}\nthis.__scalaExports = { parseResponse_ };`, context);
const { parseResponse_ } = context.__scalaExports;

const compact = (section, answers) => JSON.stringify({ schema: "qa-v2", section, answers });
const headers = [
  "Timestamp",
  "[participant_id] Participant ID",
  "[json_corn_plot] JSON · corn plot",
  "[json_livestock_breeds_market] JSON · livestock breeds market",
  "[json_climate_losses] JSON · climate losses",
  "[json_support] JSON · support",
];
const values = [
  "2026-09-03 10:00:00",
  "QA-001",
  compact("corn_plot", {
    "m.plot.rainfed.selected": "Yes",
    "m.plot.rainfed.topography": ["Upland", "Sloping"],
    "m.plot.rainfed.area_rai": "12.5",
  }),
  compact("livestock_breeds_market", {
    "l.l34_breed.1.description": "Native chicken",
    "l.l34_breed.1.source": "Own farm",
    "l.l34_breed.1.share_percent": "70",
  }),
  compact("climate_losses", {
    "a.a3_loss.1.affected_area": "Corn field",
    "a.a3_loss.1.hazard_year": "2025 drought",
    "a.a3_loss.1.damage": "Low yield",
    "a.a3_loss.1.value_baht": "10000",
  }),
  compact("support", {
    "n.n3_constraint.1.constraint": "Water shortage",
    "n.n3_constraint.1.need": "Farm pond",
    "n.n4_support_priority.water": "5",
  }),
];

const parsed = parseResponse_("Form Responses 1", 2, headers, values);
assert.equal(parsed.wide.response_id, "QA-001");
assert.equal(parsed.wide["m.plot.rainfed.area_rai"], "12.5");
assert.equal(parsed.maizePlots.length, 1);
assert.equal(parsed.maizePlots[0][5], "Upland | Sloping");
assert.equal(parsed.livestockBreeds.length, 1);
assert.equal(parsed.livestockBreeds[0][3], "Native chicken");
assert.equal(parsed.losses.length, 1);
assert.equal(parsed.losses[0][6], "10000");
assert.equal(parsed.supportNeeds.length, 2);
assert.ok(parsed.longRows.length >= 10);
assert.equal(parsed.wide.parse_status, "OK");

const broken = parseResponse_("Form Responses 1", 3, ["Timestamp", "[participant_id] Participant ID", "[json_support] JSON"], ["now", "QA-002", "{broken"]);
assert.match(broken.wide.parse_status, /^ERROR:/);
assert.equal(broken.longRows[0][11], "ERROR");

console.log(JSON.stringify({
  responseId: parsed.wide.response_id,
  longRows: parsed.longRows.length,
  maizePlots: parsed.maizePlots.length,
  livestockBreeds: parsed.livestockBreeds.length,
  losses: parsed.losses.length,
  supportRows: parsed.supportNeeds.length,
  malformedJsonDetected: true,
}, null, 2));

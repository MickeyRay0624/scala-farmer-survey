# SCALA Farmer Survey: No-Code Administration Guide

Updated: 2026-09-03

Configuration version: `2026-09-03-v2`

## 1. Start here: the current TEST environment is already ready

You do **not** need to create the TEST environment again. The current working resources are:

- TEST survey: <https://mickeyray0624.github.io/scala-farmer-survey/?environment=test>
- Private configuration and response workbook: <https://docs.google.com/spreadsheets/d/1DZyhnc7x4S8XZfyXCBkDs0NTx5s76eS7UfxMNm2PZvY/edit>
- TEST Google Form responder link: <https://docs.google.com/forms/d/e/1FAIpQLSejxAeRT7OqF3hqSVHR1o7aAck6QGnS07fg5QRcMUi5aORJNg/viewform>
- Private TEST Google Form editor: <https://docs.google.com/forms/d/1CBnIM4l45UzDpjaARjQl4X4JLcy6yNl5wvhUVsaGZHM/edit>
- Private Apps Script project: <https://script.google.com/home/projects/1dLp8-OYK2U86gCsw52vJc8FWp1WaOW-UFN_wVAQ2OadGUlonP_6W3klj/edit>

Open the private Google Sheet and start on the `START_HERE` tab. The five editor tabs are placed immediately after it:

1. `Questions`
2. `Fields`
3. `Options`
4. `Sections`
5. `Logic`

Green tabs and green cells are intended for questionnaire editors. Technical ID columns are hidden in the simple editor view. Select **SCALA Tools → Show technical columns** only when an advanced task requires them; select **SCALA Tools → Use simple editor view** to hide them again. The `Logic` tab is amber because an incorrect rule can change routing for many questions.

## 2. What each editor tab controls

### 2.1 Questions

Use `Questions` for top-level question blocks, headings, help text, visibility, and order within a subsection.

| Column | Purpose | Safe for routine editing? |
|---|---|---|
| `enabled` | `TRUE` shows the block; `FALSE` hides it | Yes |
| `block_id` | Stable website block ID | No |
| `section_id` | Parent section | Usually no |
| `segment_id` | Parent subsection/layout segment | Usually no |
| `order` | Display order inside the same `segment_id` | Yes |
| `question_text` | Top-level question or block heading | Yes |
| `help_text` | Explanatory text below the heading | Yes |
| `editor_notes` | Internal editor note | Yes |

Some `question_text` cells are intentionally blank because the visible label belongs to an individual input field. Edit those labels in `Fields` instead.

### 2.2 Fields

Use `Fields` for individual question labels, required status, placeholders, numeric limits, and standard custom questions.

The most useful columns are:

- `enabled`: whether the field is active;
- `order`: order inside its existing subsection;
- `field_label`: the visible question or row label;
- `required`: whether the answer is required;
- `placeholder`: example or prompt shown inside the input;
- `min_value`, `max_value`, `step_value`: numeric validation limits;
- `editor_notes`: internal note for editors.

Do not change an existing `question_id`. It is the stable key shared by the website, stored JSON, and analysis tables.

### 2.3 Options

Use `Options` for radio-button, checkbox, and dropdown choices.

- Change visible wording in `option_label`.
- Change display order in `option_order`.
- Set `enabled` to `FALSE` to hide an option temporarily.
- Keep `question_id` and `option_value` unchanged after real data collection begins.
- `exclusive=TRUE` makes an option such as `None` or `Unknown` mutually exclusive with the other options in the same question.
- `opens_detail_id` opens an explanation field, usually after `Other` is selected. Change it only with technical review.

### 2.4 Sections

Use `Sections` for major page headings and section order.

- `order`: order in the survey navigation;
- `menu_title`: short navigation label;
- `section_title`: full heading on the page;
- `section_description`: explanatory text below the heading;
- `visible_for_modules`: keep `maize`, `livestock`, or blank unless routing is intentionally being redesigned.

### 2.5 Logic

Use `Logic` only when a show/hide rule must change. Each row means:

> When `source_question_id` meets `operator` + `expected_value`, apply `effect` to `target_id`.

Common operators:

| Operator | Meaning | Example `expected_value` |
|---|---|---|
| `equals` | A single answer equals the value | `Yes` |
| `contains` | A multi-select answer contains the value | `Other` |
| `any_of` | Contains any listed value | `Regularly\|Occasionally` |
| `all_of` | Contains every listed value | `maize\|livestock` |
| `not_contains` | Does not contain the value | `None` |
| `not_empty` | Has an answer | Leave blank |
| `empty` | Has no answer | Leave blank |
| `greater_than` | Numeric answer is greater than the value | `10` |
| `greater_or_equal` | Numeric answer is at least the value | `10` |

Other controls:

- `target_type`: `element`, `block`, `question`, or `section`;
- `effect`: `show` or `hide`;
- `join_mode`: combine multiple rules for the same target with `or` or `and`;
- `clear_when_hidden=FALSE`: keep the draft answer on the device but exclude it from submission;
- `clear_when_hidden=TRUE`: delete the answer immediately when hidden. Use only after explicit research-team approval.

### 2.6 Finding a question quickly

1. Open the relevant editor from `START_HERE`.
2. Press `Ctrl+F` on Windows or `Command+F` on Mac.
3. Search for a question number such as `D1`, a distinctive word from the question, or an option label.
4. Edit the matching green cell only.

Examples:

- To rename `D1. Age group`, find `D1` in `Questions` and edit `question_text`.
- To rename an individual table row or input label, find its current wording in `Fields` and edit `field_label`.
- To change `18–29` as an answer choice, find it in `Options` and edit `option_label`.
- To move an item within its current subsection, change its green `order` value. An `order` change alone does not move a question to another section.

If several options have identical visible wording, temporarily select **SCALA Tools → Show technical columns** and use `question_id` to identify the correct group. Return to **Use simple editor view** afterward.

## 3. The normal editing workflow

1. Keep the Sheet in its default simple editor view so technical columns remain hidden.
2. Make a copy of the current wording or record the cells you will change.
3. Edit only the relevant green cells in `Questions`, `Fields`, `Options`, or `Sections`. Use `Logic` cautiously.
4. Wait up to five minutes for the browser configuration cache to expire.
5. Open the TEST survey and refresh the page. Use a hard refresh if the old wording remains visible.
6. Complete a labelled test response such as `QA-WORDING-01`.
7. Check `Dashboard`, `Responses_Wide`, and any relevant topic table.
8. Confirm `parse_status` is `OK` before approving the change for production.

Questionnaire text and order changes do not require a GitHub code change. The public Apps Script endpoint reads only the approved configuration tables; it does not expose responses or analysis data.

## 4. Adding a standard question without code

The no-code system supports text, long text, number, date, radio, checkbox, and dropdown questions.

1. Add a row in `Fields`.
   - First select **SCALA Tools → Show technical columns** so the required ID and type columns are visible.
2. Create a unique `question_id` beginning with `custom.`, for example `custom.water_training_interest`.
3. Enter the existing `section_id`, `segment_id`, and desired `order`.
4. Set `input_type` to `text`, `textarea`, `number`, `date`, `radio`, `checkbox`, or `select`.
5. Set `create_if_missing` to `TRUE`.
6. For a choice question, add its options to `Options` using the same `question_id`.
7. Add a row to `Logic` only if the new question must be conditional.

Answers from `custom.*` questions are stored in the Form field `json_custom` and expanded into `Responses_Wide`, `JSON_Long`, and `Codebook`.

New compound components—such as another repeating plot table, image upload, signature capture, or map drawing—still require development work.

## 5. Analysis tabs

| Tab | Structure | Typical use |
|---|---|---|
| `Form_Responses` | Original Google Forms response rows | Audit, recovery, and submission checks |
| `Responses_Wide` | One interview per row, one field per column | Filtering, summary statistics, CSV/SPSS/R export |
| `JSON_Long` | One answer value per row | Multi-select frequencies, quality checks, pivot tables |
| `Maize_Plots` | One maize plot per row | Area, topography, and plot-type analysis |
| `Livestock_Breeds` | One breed record per row | Breed source and share analysis |
| `Climate_Events` | One event or year-month record per row | Event frequency, severity, and trends |
| `Losses` | One loss record per row | Hazard year, effects, and monetary loss |
| `Support_Needs` | One measure, support item, or constraint per row | Support priorities and needs |
| `Codebook` | One stable field per row | Variable dictionary for analysts |
| `Dashboard` | Summary counts | Fast verification of response expansion |

New submissions expand automatically. After a bulk import or a structural repair, reload the Google Sheet and select **SCALA Tools → Rebuild all analysis**.

If Google Form receiver fields are added, deleted, or rebuilt, pause collection and select **SCALA Tools → 3 · Verify Google Form field mapping**. A failed mapping leaves submission paused to prevent timestamp-only rows.

## 6. One-time setup for a completely new environment

This section is for a technical owner creating another isolated TEST or production copy. It is **not** required for the current TEST system.

### Step 1 — Create a private manager Sheet

1. Upload `outputs/scala-config-20260903/SCALA_Farmer_Survey_TEST_Manager.xlsx` to Google Drive.
2. Open it with Google Sheets and save it as a native Google Sheet.
3. Keep the file private. Never publish a response workbook to the web.

### Step 2 — Add the Apps Script

1. In the Google Sheet, open **Extensions → Apps Script**.
2. Replace the default code with `google-apps-script/Code.gs`.
3. Copy the settings from `google-apps-script/appsscript.json` into the project manifest.
4. Save the project and reload the Google Sheet.

If the script is created as a standalone Apps Script project instead of a Sheet-bound project:

1. Open **Project Settings → Script Properties**.
2. Add the property `SCALA_SPREADSHEET_ID`.
3. Set its value to the text between `/d/` and `/edit` in the Google Sheet URL.
4. Run `installAdminMenuTrigger()` once, then reload the Google Sheet.

### Step 3 — Create and publish the separate Google Form

1. In the Google Sheet, choose **SCALA Tools → 1 · Create isolated TEST form**.
2. Approve the Google permissions when prompted.
3. The script creates a separate `[TEST]` Form, links it to the current Sheet, installs the response trigger, and keeps submission disabled.
4. Open the generated Form from `Settings → form_edit_url` and verify that all receiver fields exist.
5. Choose **SCALA Tools → 2 · Publish TEST form**.
6. Publishing verifies all Google Forms `entry.*` submission IDs before enabling responses.

### Step 4 — Deploy the configuration endpoint

1. Open the Apps Script project.
2. Select **Deploy → New deployment → Web app**.
3. Set **Execute as** to yourself.
4. Set **Who has access** to **Anyone**.
5. Deploy and copy the URL ending in `/exec`.
6. Paste that URL into `Settings → config_url`.
7. Add the same URL to the appropriate environment in `config/runtime-config.json` and publish the website.

The web app returns only `Settings`, `Sections`, `Questions`, `Fields`, `Options`, `Logic`, and `Transport_Map`. It never returns Form responses or analysis tabs.

### Step 5 — Verify the environment

1. Confirm the survey status says `TEST · Online · ready to submit`.
2. Submit one synthetic response with a clearly labelled `QA-` participant ID.
3. Confirm a new row appears in `Form_Responses`.
4. Confirm `Responses_Wide.parse_status` is `OK`.
5. Confirm the expected counts appear in `Dashboard` and the topic tables.
6. Test maize-only, livestock-only, mixed, neither/not sure, `Other`, repeating records, long text, and weak-network recovery before production use.

## 7. Safety boundaries

- Public: the GitHub Pages survey and the reviewed configuration endpoint.
- Private: the response workbook, analysis tabs, Apps Script editor, and Google Form editor.
- Use a project code for `Participant ID`; do not enter a name, phone number, national ID, or email address.
- Keep TEST and production Form IDs, Sheet IDs, and configuration URLs separate.
- Never commit response exports, downloaded respondent JSON, or the private response workbook to GitHub.

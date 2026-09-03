# SCALA Farmer Survey

Responsive web questionnaire for the Thailand SCALA corn and livestock supply-chain field consultation.

**Production survey:** <https://mickeyray0624.github.io/scala-farmer-survey/>

**Working TEST survey:** <https://mickeyray0624.github.io/scala-farmer-survey/?environment=test>

**Private TEST manager Sheet:** <https://docs.google.com/spreadsheets/d/1DZyhnc7x4S8XZfyXCBkDs0NTx5s76eS7UfxMNm2PZvY/edit>

The site is a static GitHub Pages application. Responses do **not** enter GitHub: the browser submits them to a selected Google Form response store. The detailed web questionnaire is serialized into labelled JSON blocks inside broad paragraph fields, while key metadata and rating fields are mapped individually. A Google Sheet configuration endpoint can now control wording, order, options, required status, and conditional display without editing the site code.

## Included

- The detailed English questionnaire, adapted from the 1 September DOCX
- Responsive layouts for phones, tablets, and computers
- Maize/livestock routing and conditional follow-up questions
- Local autosave and answer-copy download
- Optional device coordinates with an explicit permission request
- Offline page access after the first successful visit; submission still requires a connection
- The original questionnaire at `source/EN_Semi_structured_questionnaire_1Sep.docx`
- A review record of all inferred rules in `SURVEY_LOGIC.md`
- An English no-code Google Sheet maintenance guide in `CONFIGURATION_GUIDE.md`
- A private TEST workbook template plus Apps Script for form creation and JSON analysis

## Data flow

```text
Farmer or enumerator browser
  ├─ draft → this device's localStorage
  ├─ optional copy → JSON download on this device
  └─ submit → selected Google Form → private project response spreadsheet

GitHub Pages
  └─ stores only HTML, CSS, JavaScript, images, and the source questionnaire
```

No analytics, cookies, ad trackers, names, email addresses, or phone numbers are added by this site. The participant ID should be a project code rather than a name. The source email-chain PDF is deliberately excluded because it contains internal correspondence and contact information.

## Response structure

Directly mapped Google Form fields include interview metadata, selected demographic/community fields, ten concern ratings, and follow-up permission. Detailed answers are grouped by section and submitted as compact JSON objects with this schema:

```json
{
  "schema": "scala-farmer-survey-2026-09-03-v2",
  "section": "corn_water",
  "answers": {
    "m.m9_water_sources": ["Rainwater storage"],
    "m.m11_water_satisfaction": "4"
  }
}
```

The supplied Apps Script expands the JSON automatically into `Responses_Wide`, `JSON_Long`, `Maize_Plots`, `Livestock_Breeds`, `Climate_Events`, `Losses`, and `Support_Needs`. It also generates a codebook and serves only the whitelisted questionnaire configuration to the public site.

## No-code questionnaire editing

The current TEST environment is already installed. Open the private manager Sheet and begin on `START_HERE`; do not repeat the one-time setup. The daily editor tabs are placed first and color coded:

- `Questions`: top-level block headings, help text, visibility, and order
- `Fields`: individual question labels, required status, placeholders, and numeric limits
- `Options`: visible option labels and order
- `Sections`: section titles and order
- `Logic`: conditional show/hide rules; edit with additional care

Green cells are intended for routine edits. Technical ID columns are hidden by default; use `SCALA Tools → Show technical columns` only for advanced work, then return to `Use simple editor view`. Changes appear on the TEST site after the remote configuration is refreshed; allow up to five minutes, refresh the page, and submit a labelled QA response.

See `CONFIGURATION_GUIDE.md` for exact column instructions, testing steps, analysis tabs, and safety limits.

## Current TEST environment

The current TEST Form, response Sheet, configuration endpoint, response-expansion trigger, and field mapping are already operational. Day-to-day questionnaire editors need only the private Google Sheet and the TEST survey link.

The Google Sheet exposes a `SCALA Tools` menu for administrator actions:

- `Rebuild all analysis` after bulk imports or structural repair;
- `Show TEST links` to retrieve the current Form and configuration links;
- `3 · Verify Google Form field mapping` only after receiver fields are added, removed, or rebuilt in Google Forms.

## Creating a completely new environment

- Workbook: `outputs/scala-config-20260903/SCALA_Farmer_Survey_TEST_Manager.xlsx`
- Apps Script: `google-apps-script/Code.gs`
- Manifest: `google-apps-script/appsscript.json`

This setup is needed only when a technical owner creates another isolated TEST or production environment. Import the manager workbook as a private native Google Sheet, add the Apps Script, run `bootstrapTestEnvironment()`, review and publish the generated Form, deploy the configuration web app, connect its `/exec` URL to the website, and submit a labelled QA response. The detailed click-by-click procedure is in `CONFIGURATION_GUIDE.md`.

The setup function initially creates an unpublished `[TEST]` Google Form and links it to the private workbook. Publishing replaces provisional Forms item IDs with verified `entry.*` IDs required by the public submission endpoint. The configuration endpoint returns configuration only; it never returns Form responses or analysis data.

## Local preview

Serve the directory over HTTP; opening `index.html` directly is not recommended because service workers require HTTP(S).

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/>.

## Publishing

GitHub Pages is configured to deploy from the repository’s `main` branch root. Pushing to `main` updates the public site. Allow a minute or two for the Pages build and CDN refresh.

## Maintenance notes

- Keep the repository public only if the questionnaire itself may be public.
- Never commit response exports or the Google response spreadsheet.
- Review `SURVEY_LOGIC.md` before changing routing or option wording.
- Change `CACHE_NAME` in `service-worker.js` whenever cached assets change materially.
- Keep TEST and production Forms/Sheets fully separate.
- Run 10–20 labelled test cases after changing the Google Form mapping, configuration structure, or Apps Script.

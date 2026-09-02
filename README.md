# SCALA Farmer Survey

Responsive web questionnaire for the Thailand SCALA corn and livestock supply-chain field consultation.

**Live survey:** <https://mickeyray0624.github.io/scala-farmer-survey/>

The site is a static GitHub Pages application. Responses do **not** enter GitHub: the browser submits them to the project’s existing Google Form response store. The detailed web questionnaire is serialized into labelled JSON blocks inside the broad paragraph fields of that form, while key metadata and rating fields are mapped individually for easier analysis.

## Included

- The detailed English questionnaire, adapted from the 1 September DOCX
- Responsive layouts for phones, tablets, and computers
- Maize/livestock routing and conditional follow-up questions
- Local autosave and answer-copy download
- Optional device coordinates with an explicit permission request
- Offline page access after the first successful visit; submission still requires a connection
- The original questionnaire at `source/EN_Semi_structured_questionnaire_1Sep.docx`
- A review record of all inferred rules in `SURVEY_LOGIC.md`

## Data flow

```text
Farmer or enumerator browser
  ├─ draft → this device's localStorage
  ├─ optional copy → JSON download on this device
  └─ submit → existing Google Form → project-owned response spreadsheet

GitHub Pages
  └─ stores only HTML, CSS, JavaScript, images, and the source questionnaire
```

No analytics, cookies, ad trackers, names, email addresses, or phone numbers are added by this site. The participant ID should be a project code rather than a name. The source email-chain PDF is deliberately excluded because it contains internal correspondence and contact information.

## Response structure

Directly mapped Google Form fields include interview metadata, selected demographic/community fields, ten concern ratings, and follow-up permission. Detailed answers are grouped by section and submitted as compact JSON objects with this schema:

```json
{
  "schema": "scala-farmer-survey-2026-09-02-v1",
  "section": "corn_water",
  "answers": {
    "m.m9_water_sources": ["Rainwater storage"],
    "m.m11_water_satisfaction": "4"
  }
}
```

This preserves every detailed field without requiring changes to the existing Google Form. Analysts should parse the JSON paragraph cells before quantitative analysis. If the Google Form is later redesigned with one native field per question, update `buildGooglePayload()` in `app.js` and bump `SCHEMA_VERSION`.

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
- Test one clearly labelled synthetic response after changing the Google Forms mapping.


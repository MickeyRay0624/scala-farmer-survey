# SCALA Farmer Survey: Option and Routing Logic

Updated: 2026-09-03

Survey version: `scala-farmer-survey-2026-09-03-v2`

## 1. Source roles and implementation boundary

The survey content is based on `EN_Semi_structured_questionnaire_1Sep.docx`. The email-chain PDF was used only as background for the project context, existing Google Form, and expected workflow. Email text, budgets, addresses, and other internal material were not treated as website instructions and were not uploaded to the public GitHub repository.

The website and administration materials are in English to remain consistent with the English source questionnaire. No unreviewed Thai or Chinese translation has been introduced.

## 2. Data-collection design

The system uses a GitHub Pages front end, a Google Sheet configuration source, a Google Form receiver, and automated Google Sheet analysis:

1. GitHub Pages stores the questionnaire code, images, and source DOCX, but no submitted answers.
2. A draft is stored in the current device's browser `localStorage` and is not uploaded automatically.
3. On submission, answers go directly to the Google Form selected for the current environment. TEST and production use different Forms and Sheets.
4. The receiver Form has broad transport fields while the source DOCX is a detailed 32-page questionnaire. Therefore:
   - interview metadata, selected demographic fields, ten concern ratings, and follow-up permission use individual native Form mappings;
   - other detailed answers are grouped by topic in compact, versioned JSON and sent to paragraph fields;
   - every completed answer that is visible at submission time is retained, not only the summary shown on the page.
5. `Sections`, `Questions`, `Fields`, `Options`, and `Logic` in the Google Sheet control wording, order, options, required status, and conditional display without a website code change. If remote configuration cannot load, the website uses its reviewed bundled configuration.
6. Apps Script expands submitted JSON automatically into wide, long, and topic-specific tables plus a codebook.
7. A user may continue editing a locally saved draft while offline, but submission requires the network connection to be restored.

No new database is required, and personal responses are not stored in the public repository. The response workbook remains private. The public Apps Script web app exposes questionnaire configuration only and does not read response or analysis tabs.

## 3. Required and optional answers

The source questionnaire states that participation is voluntary and respondents may skip any question. To balance that principle with a usable response record, only the following items are currently required:

- Participant ID, which must be a project code rather than a name;
- Interview date;
- Interview location;
- Informed consent;
- Production-module selection: maize, livestock, or neither/not sure;
- Z2 permission for future project contact.

All other questions may be left blank. Numeric checks are mainly intended to detect obvious data-entry errors; they do not force respondents to provide unknown information.

## 4. Top-level module routing

### 4.1 Suggested modules from D3

| D3 main occupation | Suggested module display |
|---|---|
| Maize or crop farmer | Maize module |
| Livestock farmer | Livestock module |
| Mixed crop and livestock farmer | Maize and livestock modules |
| Other or unanswered | No automatic choice; the enumerator selects the appropriate module |

The automatic result is a suggestion. The enumerator may add or remove modules for mixed livelihoods or more complex farm arrangements.

### 4.2 Module exclusivity

- Maize and livestock may be selected together.
- `Neither / not sure` is mutually exclusive with maize and livestock.
- The user cannot leave General information until one module choice is made.
- Inputs inside a skipped module are not submitted. If a completed module is later deselected, its answers remain only in the device draft and reappear if the module is enabled again.

## 5. General option behavior

- For choice questions containing `Other`, the explanation field appears only after `Other` is selected.
- Exclusive choices such as `None`, `Not a member`, `Rainfed only`, `Sell immediately`, and `Unknown` clear other choices in the same group. Selecting a normal option clears an exclusive option.
- Repeating records—plots, varieties, losses, support measures, and similar groups—submit only the records that are enabled.
- For issue or event lists, selecting an item opens its severity, measure, or explanation field. Deselecting it excludes the nested fields from submission.
- Rating scales use a consistent 1–5 direction and show both endpoint meanings to reduce reversed entries.

## 6. Maize-module conditional logic

| Trigger question | Condition | Content displayed |
|---|---|---|
| M3 farm arrangement | Cooperative, Contract, or Large plot | Relevant name and cooperation details |
| M7 land suitability | Not suitable | M7.1 suggested alternative crop |
| M15 weeds or pests | Other | Name of the other issue |
| M20 weather-information use | Regularly or Occasionally | M20.1 uses and sources; M20.2 confidence rating |
| M21 production system | Intercropping, Alley cropping, Agroforestry, or Other | System composition or explanation |
| M22 planting-time adjustment | Yes | Revised timing and reason |
| M22 planting-time adjustment | No | Reason no adjustment has been made |
| M25 variety change | Yes | Reason for the change |
| M27 harvesting method | Other | Method description |
| M28 post-harvest method | Other | Method description |
| M29 storage loss | Yes | Cause of loss |
| M30 buyer | Other | Buyer description |

Numeric checks:

- Areas from multiple maize plots are totalled as a data-entry prompt only.
- Submission is blocked if maize-variety area shares total more than 100%.
- Moisture must be between 0% and 100%; area, cost, distance, and similar values cannot be negative.

## 7. Livestock-module conditional logic

| Trigger question | Condition | Content displayed |
|---|---|---|
| L5 interruption of livestock production | Yes | Timing and reason |
| L6 farm arrangement | Cooperative, Contract, Large plot, or Community enterprise | Relevant name and cooperation details |
| L6 contract farming | Selected | L7 inputs or support from the contracting party |
| L13.3 odor or wastewater complaint | Yes | Complaint and response details |
| L23 feed type | Commercial pelleted / ready-made feed | L24 purchased-feed brand/type records |
| L23 feed type | Self-mixed feed | L25 self-mixed ingredient records |
| L25.1 own maize used as feed | Both maize and livestock modules selected | Whether it is used and the share used; percentage appears only for `Used as feed` |
| Environmental, housing, disease, or climate issue | Item selected | Severity, management measure, or impact details |
| L27 biosecurity | Regularly or Occasionally | L27.1 specific measures |
| L32 weather-information use | Regularly or Occasionally | L32.1 uses and sources; L32.2 confidence rating |
| L35 breed change | Yes | Reason for the change |

Numeric checks:

- Own-produced and purchased feed shares display a running total with an ideal value of 100%. Because respondents may know only one share, this produces a warning but does not block submission.
- Submission is blocked if livestock-breed shares total more than 100%.
- Mortality must be between 0% and 100%; counts, costs, distances, and similar values cannot be negative.

## 8. Climate-history and date logic

- A1 and A2 retain Buddhist Era years 2564–2568 and also display Gregorian years 2021–2025.
- Each A1 year-month cell accepts one rainfall category: extreme drought, drought, normal, heavy rain, or abnormally heavy rain.
- The paper A2 grid can contain several handwritten hazards in one cell. For workable mobile entry and simpler analysis, the website accepts one primary hazard per cell. Additional simultaneous hazards should be recorded in A3.
- A3 supports up to five loss records, ranked by severity, with event, timing, affected activity, quantity or monetary value, and support details.
- Interview date cannot be later than the current date. The default date uses the device's local time zone.

## 9. Provisional interpretations of source ambiguities

The following rules were not stated unambiguously in the source file. They are provisional implementation decisions that should receive focused project-team review:

1. **D3 occupation choices:** overlapping source categories were consolidated into maize/crop, livestock, mixed, and other, with a separate module selector.
2. **D6 education:** inconsistently formatted source choices were consolidated into no formal education, primary, secondary, vocational, and university or above.
3. **Residual Thai and translation artifacts:** wording was normalized conservatively into English from context instead of displaying unexplained residual Thai text.
4. **M21 duplicated rows:** overlapping agroforestry/intercropping rows were organized as Intercropping, Alley cropping, and Agroforestry.
5. **M22 damaged option layout:** the displaced Yes/No and follow-up layout was interpreted as Yes → adjusted timing and reason; No → reason not adjusted.
6. **M30 `Producers`:** in the context of where products are delivered, it was interpreted as buyers or sales channels rather than producer identity.
7. **Livestock numbering gaps:** the source jumps from L15 to L22 and repeats L25/L26. Recognizable printed numbers are retained for comparison, while unique data keys prevent overwritten answers.
8. **L15 water-rating item:** a nearby missing number was provisionally assigned to L15.
9. **L28 withdrawal-period practice:** because the source lacks complete choices, the website uses Always follow, Sometimes follow, Do not follow, and Do not know.
10. **L31 activity calendar:** the source provides nine blank activity rows. The website preloads breeding, birth, vaccination, cleaning, cooling, feeding, milk/egg collection, sales/transport, and manure management. Non-applicable months may remain blank.
11. **L45.1 bargaining power:** three repeated `Negotiable` labels were interpreted as Fully, Somewhat, and Not negotiable.
12. **L46 farm sketch:** the static website has no approved image-upload backend. The sketch is represented provisionally by structured text for housing/grazing area, water, waste area, and additional notes. If the sketch is essential, an approved controlled image-storage service is required.
13. **N2 support:** the source heading combines support already received and support of greatest interest. The website uses one ranked record table and asks the enumerator to identify each item as received or desired. This can be split later.
14. **Dindi:** the Dindi image and LINE QR link from the source DOCX are retained as optional supplementary information and are not included in survey submission data.

## 10. Privacy and field-use recommendations

- The page does not request a name, phone number, or email address. Participant ID should map to a separately controlled project register.
- Coordinates are optional and are read only after the enumerator presses the button and approves the browser permission. Their use must fall within the interview consent.
- After completing an interview on a shared device, select `Start a new response` to clear the local draft. Before handing over a partly completed device, download any required copy and clear the draft.
- Downloaded respondent JSON is survey data and must follow project access and data-management controls. It must not be committed to GitHub.
- Anyone who knows the public URL can open the questionnaire. Before production release, the project team must approve questionnaire visibility, Google Form receiving status, and response-workbook permissions.

## 11. Questions for project-team confirmation

1. Is an independently reviewed Thai or bilingual interface required?
2. Do the three M21 production-system categories match the research team's definitions?
3. Must A2 support several hazards in the same month instead of one primary hazard?
4. Are the four L28 withdrawal-period choices suitable for every livestock type?
5. Should the nine predefined L31 activities return to free-text entry?
6. Must L46 support a sketch or photo upload, and if so, which controlled storage backend is approved?
7. Should N2 be split into `support received` and `support desired`?
8. Do the generated wide, long, and topic tables meet the analysis workflow, or is a database/statistical-system connection required?
9. Is an access code, CAPTCHA, submission receipt ID, or duplicate-prevention mechanism required?

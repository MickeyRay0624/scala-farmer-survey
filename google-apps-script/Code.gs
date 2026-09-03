/**
 * SCALA Farmer Survey
 * Google Apps Script for an isolated TEST form, no-code configuration, and
 * automatic expansion of compact JSON responses. It supports both a script
 * bound to the manager Sheet and a standalone script configured with the
 * SCALA_SPREADSHEET_ID script property.
 *
 * The public doGet endpoint returns ONLY whitelisted configuration sheets.
 * Farmer responses and analysis sheets are never returned by doGet.
 */

const SCALA_CONFIG = Object.freeze({
  headerRow: 4,
  title: '[TEST] SCALA Farmer Survey data receiver',
  spreadsheetIdProperty: 'SCALA_SPREADSHEET_ID',
  configSheets: ['Settings', 'Sections', 'Questions', 'Fields', 'Options', 'Logic', 'Transport_Map'],
  outputSheets: ['Responses_Wide', 'JSON_Long', 'Maize_Plots', 'Livestock_Breeds', 'Climate_Events', 'Losses', 'Support_Needs'],
  protectedSheetNames: [
    'README', 'Settings', 'Sections', 'Questions', 'Fields', 'Options', 'Logic', 'Transport_Map',
    'Dashboard', 'Responses_Wide', 'JSON_Long', 'Maize_Plots', 'Livestock_Breeds',
    'Climate_Events', 'Losses', 'Support_Needs', 'Codebook',
  ],
});

const OUTPUT_HEADERS = Object.freeze({
  Responses_Wide: ['response_id', 'timestamp', 'source_sheet', 'source_row', 'schema_versions', 'json_sections', 'parse_status'],
  JSON_Long: ['response_id', 'timestamp', 'source_sheet', 'source_row', 'source_column', 'source_question', 'schema', 'section', 'answer_path', 'value', 'value_type', 'parse_status'],
  Maize_Plots: ['response_id', 'timestamp', 'plot_id', 'selected', 'plot_label', 'topography', 'area_rai'],
  Livestock_Breeds: ['response_id', 'timestamp', 'rank', 'description', 'source', 'share_percent', 'strengths'],
  Climate_Events: ['response_id', 'timestamp', 'source', 'event_id', 'selected_or_code', 'severity', 'details'],
  Losses: ['response_id', 'timestamp', 'rank', 'affected_area', 'hazard_year', 'damage', 'value_baht'],
  Support_Needs: ['response_id', 'timestamp', 'record_type', 'rank_or_item', 'area', 'details', 'annual_cost_baht', 'constraint', 'need', 'priority'],
});

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('SCALA Tools')
      .addItem('1 · Create isolated TEST form', 'bootstrapTestEnvironment')
      .addItem('2 · Publish TEST form', 'publishTestForm')
      .addSeparator()
      .addItem('Rebuild all analysis', 'rebuildAnalysis')
      .addItem('Refresh codebook', 'refreshCodebook')
      .addItem('Show TEST links', 'showTestLinks')
      .addToUi();
  } catch (error) {
    console.log(`SCALA Tools menu is available only to a bound spreadsheet script: ${error.message}`);
  }
}

function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const spreadsheetId = String(
    PropertiesService.getScriptProperties().getProperty(SCALA_CONFIG.spreadsheetIdProperty) || '',
  ).trim();
  if (!spreadsheetId) {
    throw new Error(
      `This standalone script needs the ${SCALA_CONFIG.spreadsheetIdProperty} script property. `
      + 'Set it to the TEST manager Google Sheet ID in Project Settings.',
    );
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function notify_(title, message) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (error) {
    try {
      getSpreadsheet_().toast(message, title, 8);
    } catch (toastError) {
      console.log(`${title}: ${message}`);
    }
  }
}

/**
 * Creates one unpublished TEST form, links it to the active spreadsheet, and
 * installs a spreadsheet form-submit trigger. It will not overwrite an
 * existing test form recorded in Settings.
 */
function bootstrapTestEnvironment() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSpreadsheet_();
    ensureWorkbookStructure_();
    const currentFormId = String(getSetting_('form_id') || '').trim();
    if (currentFormId) {
      throw new Error('Settings already contains a form_id. Open that TEST form or clear the value only after confirming the old form is no longer needed.');
    }

    const form = FormApp.create(SCALA_CONFIG.title, false);
    form
      .setDescription('TEST ONLY — responses are for system verification and must not be treated as real interviews.')
      .setConfirmationMessage('TEST response received. Please tell the project administrator which test case you used.')
      .setCollectEmail(false)
      .setLimitOneResponsePerUser(false)
      .setProgressBar(false)
      .setPublishingSummary(false)
      .setShowLinkToRespondAgain(true)
      .setShuffleQuestions(false)
      .setAcceptingResponses(false);
    if (form.supportsAdvancedResponderPermissions()) form.setPublished(false);

    const transportRows = readTable_('Transport_Map');
    if (!transportRows.length) throw new Error('Transport_Map is empty. Import the supplied manager workbook before running setup.');
    const created = [];
    transportRows.forEach((row) => {
      const payloadKey = String(row.payload_key || '').trim();
      if (!payloadKey) return;
      const fieldType = String(row.field_type || 'text').toLowerCase();
      const questionTitle = String(row.question_title || '').trim() || friendlyTitle_(payloadKey);
      let item;
      if (fieldType === 'paragraph') item = form.addParagraphTextItem();
      else if (fieldType === 'date') item = form.addDateItem().setIncludesYear(true);
      else item = form.addTextItem();
      item.setTitle(`[${payloadKey}] ${questionTitle}`).setRequired(false);
      created.push({ payload_key: payloadKey, entry_id: String(item.getId()), field_type: fieldType, question_title: questionTitle, editor_notes: 'Generated for the isolated TEST receiver.' });
    });

    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    installSubmitTrigger_(ss);

    const publicUrl = form.getPublishedUrl();
    const formAction = publicUrl.replace(/viewform(?:\?.*)?$/, 'formResponse');
    updateSetting_('environment', 'test');
    updateSetting_('form_id', form.getId());
    updateSetting_('form_edit_url', form.getEditUrl());
    updateSetting_('form_public_url', publicUrl);
    updateSetting_('form_action', formAction);
    updateSetting_('response_sheet_url', ss.getUrl());
    updateSetting_('submission_enabled', 'FALSE');
    writeTable_('Transport_Map', created);
    SpreadsheetApp.flush();

    notify_(
      'TEST environment created',
      'The TEST form is linked but intentionally unpublished. Review the form, then use SCALA Tools → 2 · Publish TEST form.',
    );
    return { formId: form.getId(), editUrl: form.getEditUrl(), publicUrl, spreadsheetUrl: ss.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

/** Publishes the already-created TEST form and enables website submissions. */
function publishTestForm() {
  const formId = String(getSetting_('form_id') || '').trim();
  if (!formId) throw new Error('No TEST form exists yet. Run bootstrapTestEnvironment() first.');
  const form = FormApp.openById(formId);
  if (form.supportsAdvancedResponderPermissions()) form.setPublished(true);
  form.setAcceptingResponses(true);
  updateSetting_('submission_enabled', 'TRUE');
  updateSetting_('form_public_url', form.getPublishedUrl());
  updateSetting_('form_action', form.getPublishedUrl().replace(/viewform(?:\?.*)?$/, 'formResponse'));
  notify_('TEST form published', form.getPublishedUrl());
}

function showTestLinks() {
  const lines = [
    `Form editor: ${getSetting_('form_edit_url') || 'not created'}`,
    `Responder link: ${getSetting_('form_public_url') || 'not created'}`,
    `Response sheet: ${getSetting_('response_sheet_url') || getSpreadsheet_().getUrl()}`,
    `Configuration endpoint: ${getSetting_('config_url') || 'deploy this script as a web app'}`,
  ];
  notify_('SCALA TEST links', lines.join('\n\n'));
}

function installSubmitTrigger_(spreadsheet) {
  const exists = ScriptApp.getProjectTriggers().some((trigger) =>
    trigger.getHandlerFunction() === 'handleFormSubmit' && trigger.getTriggerSourceId() === spreadsheet.getId());
  if (!exists) {
    ScriptApp.newTrigger('handleFormSubmit')
      .forSpreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
  }
}

/** Installable spreadsheet form-submit trigger. */
function handleFormSubmit(event) {
  if (!event || !event.range) throw new Error('This function must be run by a spreadsheet form-submit trigger.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = event.range.getSheet();
    const rowNumber = event.range.getRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const rawValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    const parsed = parseResponse_(sheet.getName(), rowNumber, headers, rawValues);
    appendParsedResponse_(parsed);
    updateSetting_('last_analysis_refresh', new Date());
  } finally {
    lock.releaseLock();
  }
}

/** Rebuilds every analysis tab from all linked form-response rows. */
function rebuildAnalysis() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensureWorkbookStructure_();
    const parsedResponses = [];
    findRawResponseSheets_().forEach((sheet) => {
      if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 2) return;
      const values = sheet.getDataRange().getValues();
      const headers = values[0].map(String);
      for (let index = 1; index < values.length; index += 1) {
        if (values[index].every((value) => value === '' || value === null)) continue;
        parsedResponses.push(parseResponse_(sheet.getName(), index + 1, headers, values[index]));
      }
    });

    const wideHeaders = buildWideHeaders_(parsedResponses);
    const wideRows = parsedResponses.map((response) => wideHeaders.map((header) => response.wide[header] ?? ''));
    resetOutputSheet_('Responses_Wide', wideHeaders, wideRows);
    resetOutputSheet_('JSON_Long', OUTPUT_HEADERS.JSON_Long, parsedResponses.flatMap((response) => response.longRows));
    resetOutputSheet_('Maize_Plots', OUTPUT_HEADERS.Maize_Plots, parsedResponses.flatMap((response) => response.maizePlots));
    resetOutputSheet_('Livestock_Breeds', OUTPUT_HEADERS.Livestock_Breeds, parsedResponses.flatMap((response) => response.livestockBreeds));
    resetOutputSheet_('Climate_Events', OUTPUT_HEADERS.Climate_Events, parsedResponses.flatMap((response) => response.climateEvents));
    resetOutputSheet_('Losses', OUTPUT_HEADERS.Losses, parsedResponses.flatMap((response) => response.losses));
    resetOutputSheet_('Support_Needs', OUTPUT_HEADERS.Support_Needs, parsedResponses.flatMap((response) => response.supportNeeds));
    refreshCodebook();
    updateSetting_('last_analysis_refresh', new Date());
    notify_('SCALA analysis', `Expanded ${parsedResponses.length} TEST response(s).`);
  } finally {
    lock.releaseLock();
  }
}

function appendParsedResponse_(parsed) {
  const wideSheet = ensureOutputSheet_('Responses_Wide', OUTPUT_HEADERS.Responses_Wide);
  let wideHeaders = wideSheet.getRange(1, 1, 1, wideSheet.getLastColumn()).getDisplayValues()[0].filter(Boolean);
  Object.keys(parsed.wide).forEach((key) => {
    if (!wideHeaders.includes(key)) wideHeaders.push(key);
  });
  wideSheet.getRange(1, 1, 1, wideHeaders.length).setValues([wideHeaders]);
  wideSheet.appendRow(wideHeaders.map((header) => parsed.wide[header] ?? ''));
  appendRows_('JSON_Long', OUTPUT_HEADERS.JSON_Long, parsed.longRows);
  appendRows_('Maize_Plots', OUTPUT_HEADERS.Maize_Plots, parsed.maizePlots);
  appendRows_('Livestock_Breeds', OUTPUT_HEADERS.Livestock_Breeds, parsed.livestockBreeds);
  appendRows_('Climate_Events', OUTPUT_HEADERS.Climate_Events, parsed.climateEvents);
  appendRows_('Losses', OUTPUT_HEADERS.Losses, parsed.losses);
  appendRows_('Support_Needs', OUTPUT_HEADERS.Support_Needs, parsed.supportNeeds);
}

function parseResponse_(sheetName, rowNumber, headers, values) {
  const timestamp = values[0] instanceof Date ? values[0] : String(values[0] || '');
  const raw = {};
  const answerMap = {};
  const longRows = [];
  const schemas = new Set();
  const sections = new Set();
  const errors = [];

  headers.forEach((header, index) => {
    const value = values[index];
    if (value === '' || value === null || value === undefined) return;
    const key = keyFromHeader_(header) || `raw_column_${index + 1}`;
    if (!String(key).startsWith('json_')) {
      raw[key] = normalizeCellValue_(value);
      return;
    }
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      const schema = String(parsed.schema || 'unknown');
      const section = String(parsed.section || key.replace(/^json_/, ''));
      schemas.add(schema);
      sections.add(section);
      const answers = parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {};
      Object.entries(answers).forEach(([answerPath, answerValue]) => {
        answerMap[answerPath] = normalizeCellValue_(answerValue);
        flattenValue_(answerValue, answerPath).forEach((leaf) => {
          longRows.push([
            '', timestamp, sheetName, rowNumber, index + 1, header, schema, section,
            leaf.path, leaf.value, leaf.type, 'OK',
          ]);
        });
      });
    } catch (error) {
      const message = `${key}: ${error.message}`;
      errors.push(message);
      longRows.push(['', timestamp, sheetName, rowNumber, index + 1, header, '', key, '__parse_error__', message, 'error', 'ERROR']);
    }
  });

  const responseId = String(raw.participant_id || answerMap['meta.participant_id'] || `${sheetName}-${rowNumber}`);
  longRows.forEach((row) => { row[0] = responseId; });
  const wide = {
    response_id: responseId,
    timestamp,
    source_sheet: sheetName,
    source_row: rowNumber,
    schema_versions: [...schemas].join(' | '),
    json_sections: [...sections].join(' | '),
    parse_status: errors.length ? `ERROR: ${errors.join(' ; ')}` : 'OK',
    ...raw,
    ...answerMap,
  };

  const base = [responseId, timestamp];
  return {
    wide,
    longRows,
    maizePlots: buildMaizePlots_(answerMap, base),
    livestockBreeds: buildLivestockBreeds_(answerMap, base),
    climateEvents: buildClimateEvents_(answerMap, base),
    losses: buildLosses_(answerMap, base),
    supportNeeds: buildSupportNeeds_(answerMap, base),
  };
}

function normalizeCellValue_(value) {
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' ? JSON.stringify(item) : item).join(' | ');
  if (value && typeof value === 'object' && !(value instanceof Date)) return JSON.stringify(value);
  return value;
}

function flattenValue_(value, path) {
  if (Array.isArray(value)) {
    if (!value.length) return [{ path, value: '', type: 'array' }];
    return value.flatMap((item, index) => flattenValue_(item, `${path}[${index + 1}]`));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value).flatMap(([key, child]) => flattenValue_(child, `${path}.${key}`));
  }
  return [{ path, value: value === null || value === undefined ? '' : value, type: value === null ? 'null' : typeof value }];
}

function buildMaizePlots_(answers, base) {
  const records = {};
  Object.entries(answers).forEach(([key, value]) => {
    const match = key.match(/^m\.plot\.([^.]+)\.(.+)$/);
    if (!match) return;
    records[match[1]] = records[match[1]] || {};
    records[match[1]][match[2]] = value;
  });
  return Object.keys(records).sort().map((id) => {
    const row = records[id];
    return [...base, id, row.selected || '', row.label || id.replace(/_/g, ' '), row.topography || '', row.area_rai || ''];
  });
}

function buildLivestockBreeds_(answers, base) {
  const records = {};
  Object.entries(answers).forEach(([key, value]) => {
    const match = key.match(/^l\.l34_breed\.(\d+)\.(.+)$/);
    if (!match) return;
    records[match[1]] = records[match[1]] || {};
    records[match[1]][match[2]] = value;
  });
  return Object.keys(records).sort((a, b) => Number(a) - Number(b)).map((rank) => {
    const row = records[rank];
    return [...base, rank, row.description || '', row.source || '', row.share_percent || '', row.strengths || ''];
  });
}

function buildClimateEvents_(answers, base) {
  const records = {};
  const history = [];
  Object.entries(answers).forEach(([key, value]) => {
    let match = key.match(/^l\.l33_event\.([^.]+)\.(.+)$/);
    if (match) {
      records[match[1]] = records[match[1]] || {};
      records[match[1]][match[2]] = value;
      return;
    }
    match = key.match(/^a\.a2_hazard\.(\d+)\.([a-z]+)$/);
    if (match && value !== '') history.push([...base, 'five_year_history', `${match[1]}-${match[2]}`, value, '', '']);
  });
  const livestock = Object.keys(records).sort().map((eventId) => {
    const row = records[eventId];
    return [...base, 'livestock_past_year', eventId, row.selected || '', row.severity || '', row.details || ''];
  });
  return livestock.concat(history);
}

function buildLosses_(answers, base) {
  const records = {};
  Object.entries(answers).forEach(([key, value]) => {
    const match = key.match(/^a\.a3_loss\.(\d+)\.(.+)$/);
    if (!match) return;
    records[match[1]] = records[match[1]] || {};
    records[match[1]][match[2]] = value;
  });
  return Object.keys(records).sort((a, b) => Number(a) - Number(b)).map((rank) => {
    const row = records[rank];
    return [...base, rank, row.affected_area || '', row.hazard_year || '', row.damage || '', row.value_baht || ''];
  });
}

function buildSupportNeeds_(answers, base) {
  const records = {};
  Object.entries(answers).forEach(([key, value]) => {
    let match = key.match(/^n\.(n[123]_[^.]+)\.(\d+)\.(.+)$/);
    if (match) {
      const id = `${match[1]}|${match[2]}`;
      records[id] = records[id] || { record_type: match[1], rank: match[2] };
      records[id][match[3]] = value;
      return;
    }
    match = key.match(/^n\.n4_support_priority\.(.+)$/);
    if (match) records[`n4_support_priority|${match[1]}`] = { record_type: 'n4_support_priority', rank: match[1], priority: value };
  });
  return Object.keys(records).sort().map((id) => {
    const row = records[id];
    return [...base, row.record_type, row.rank, row.area || '', row.details || '', row.annual_cost_baht || '', row.constraint || '', row.need || '', row.priority || ''];
  });
}

function buildWideHeaders_(responses) {
  const core = OUTPUT_HEADERS.Responses_Wide.slice();
  const preferred = readTable_('Fields').map((row) => String(row.question_id || '')).filter(Boolean);
  const rawKeys = readTable_('Transport_Map').map((row) => String(row.payload_key || '')).filter((key) => key && !key.startsWith('json_'));
  const found = new Set(responses.flatMap((response) => Object.keys(response.wide)));
  return [...new Set(core.concat(rawKeys, preferred, [...found].sort()))];
}

function appendRows_(sheetName, headers, rows) {
  if (!rows.length) return;
  const sheet = ensureOutputSheet_(sheetName, headers);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

function resetOutputSheet_(sheetName, headers, rows) {
  const sheet = ensureOutputSheet_(sheetName, headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  styleOutputSheet_(sheet, headers.length);
}

function ensureWorkbookStructure_() {
  Object.entries(OUTPUT_HEADERS).forEach(([name, headers]) => ensureOutputSheet_(name, headers));
  const ss = getSpreadsheet_();
  if (!ss.getSheetByName('Codebook')) ss.insertSheet('Codebook');
}

function ensureOutputSheet_(name, headers) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastColumn() < headers.length || sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).isBlank()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  styleOutputSheet_(sheet, Math.max(headers.length, sheet.getLastColumn()));
  return sheet;
}

function styleOutputSheet_(sheet, columnCount) {
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(true);
  sheet.getRange(1, 1, 1, columnCount)
    .setBackground('#245A49')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setWrap(true);
}

function findRawResponseSheets_() {
  const excluded = new Set(SCALA_CONFIG.protectedSheetNames);
  return getSpreadsheet_().getSheets().filter((sheet) => {
    if (excluded.has(sheet.getName()) || sheet.getLastColumn() < 2) return false;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    return headers.some((header) => String(header).startsWith('[participant_id]'));
  });
}

function keyFromHeader_(header) {
  const match = String(header || '').match(/^\[([^\]]+)\]/);
  return match ? match[1] : '';
}

function friendlyTitle_(key) {
  const names = {
    participant_id: 'Participant ID', interview_date: 'Interview date', interview_location: 'Interview location', consent: 'Consent',
    age: 'Age group', gender: 'Gender', occupation: 'Main occupation', farming_years: 'Years in agriculture', education: 'Education',
    ethnicity: 'Race / ethnic group', household_total: 'Household members', household_farm_workers: 'Household farm workers',
    land_tenure: 'Land tenure', financial_status: 'Farm financial status', agricultural_income_share: 'Agricultural income share',
    financial_stability: 'Financial stability', province: 'Province', district: 'District', subdistrict: 'Subdistrict', village: 'Village',
    community_average_rating: 'Community statement average', additional_feedback: 'Additional feedback', follow_up: 'Future follow-up permission',
  };
  if (names[key]) return names[key];
  if (key.startsWith('concern_')) return `Concern rating · ${key.replace('concern_', '').replace(/_/g, ' ')}`;
  if (key.startsWith('json_')) return `JSON · ${key.replace('json_', '').replace(/_/g, ' ')}`;
  return key.replace(/_/g, ' ');
}

function readTable_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < SCALA_CONFIG.headerRow) return [];
  const values = sheet.getRange(SCALA_CONFIG.headerRow, 1, sheet.getLastRow() - SCALA_CONFIG.headerRow + 1, sheet.getLastColumn()).getValues();
  const headers = values.shift().map((value) => String(value || '').trim());
  return values
    .filter((row) => row.some((value) => value !== '' && value !== null))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]]).filter(([header]) => header)));
}

function writeTable_(sheetName, rows) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);
  const headers = sheet.getRange(SCALA_CONFIG.headerRow, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].filter(Boolean);
  const startRow = SCALA_CONFIG.headerRow + 1;
  if (sheet.getLastRow() >= startRow) sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).clearContent();
  if (rows.length) sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows.map((row) => headers.map((header) => row[header] ?? '')));
}

function getSetting_(key) {
  const row = readTable_('Settings').find((item) => String(item.key) === key);
  return row ? row.value : '';
}

function updateSetting_(key, value) {
  const sheet = getSpreadsheet_().getSheetByName('Settings');
  if (!sheet) throw new Error('Missing Settings sheet.');
  const rows = readTable_('Settings');
  const index = rows.findIndex((row) => String(row.key) === key);
  if (index >= 0) sheet.getRange(SCALA_CONFIG.headerRow + 1 + index, 2).setValue(value);
  else sheet.appendRow([key, value, 'Added by SCALA Apps Script.']);
}

function refreshCodebook() {
  const source = readTable_('Fields');
  const headers = ['question_id', 'section_id', 'input_type', 'field_label', 'analysis_type', 'required', 'sensitive', 'enabled', 'notes'];
  const rows = source.map((row) => [row.question_id, row.section_id, row.input_type, row.field_label, row.analysis_type, row.required, row.sensitive, row.enabled, row.editor_notes]);
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('Codebook') || ss.insertSheet('Codebook');
  const headerRow = 4;
  if (sheet.getLastRow() >= headerRow) sheet.getRange(headerRow, 1, Math.max(1, sheet.getLastRow() - headerRow + 1), Math.max(headers.length, sheet.getLastColumn())).clearContent();
  sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(headerRow + 1, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(headerRow);
  sheet.setHiddenGridlines(true);
  sheet.getRange(headerRow, 1, 1, headers.length).setBackground('#245A49').setFontColor('#FFFFFF').setFontWeight('bold');
}

/**
 * Public configuration endpoint. It deliberately reads only the seven
 * whitelisted configuration sheets above.
 */
function doGet(event) {
  const settingsWhitelist = new Set(['config_version', 'environment', 'schema_version', 'form_action', 'form_public_url', 'config_cache_minutes', 'submission_enabled']);
  const settings = readTable_('Settings').filter((row) => settingsWhitelist.has(String(row.key)));
  const payload = {
    meta: { generated_at: new Date().toISOString(), source: 'SCALA Google Sheet configuration' },
    settings,
    sections: readTable_('Sections'),
    questions: readTable_('Questions'),
    fields: readTable_('Fields'),
    options: readTable_('Options'),
    logic: readTable_('Logic'),
    transport_map: readTable_('Transport_Map'),
  };
  const json = JSON.stringify(payload);
  const callback = event && event.parameter ? String(event.parameter.callback || '') : '';
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(`${callback}(${json});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

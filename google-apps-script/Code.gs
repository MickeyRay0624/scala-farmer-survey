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
    'README', 'START_HERE', 'Settings', 'Sections', 'Questions', 'Fields', 'Options', 'Logic', 'Transport_Map',
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
      .addItem('3 · Verify Google Form field mapping', 'refreshTransportMap')
      .addSeparator()
      .addItem('Use simple editor view', 'prepareEditorWorkspace')
      .addItem('Show technical columns', 'showTechnicalColumns')
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
      created.push({
        payload_key: payloadKey,
        entry_id: String(item.getId()),
        field_type: fieldType,
        question_title: questionTitle,
        editor_notes: 'Provisional Forms item ID; the publish step replaces this with the verified submission entry ID.',
      });
    });

    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    installSubmitTrigger_(ss);
    installOpenTrigger_(ss);

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
    prepareEditorWorkspace_();
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
  form.setAcceptingResponses(false);
  updateSetting_('submission_enabled', 'FALSE');
  const mappedRows = refreshTransportMap_(form);
  updateSetting_('form_public_url', form.getPublishedUrl());
  updateSetting_('form_action', form.getPublishedUrl().replace(/viewform(?:\?.*)?$/, 'formResponse'));
  form.setAcceptingResponses(true);
  updateSetting_('submission_enabled', 'TRUE');
  notify_('TEST form published', `${form.getPublishedUrl()}\n\nVerified ${mappedRows.length} Google Forms submission field mappings.`);
}

/**
 * Rebuilds Transport_Map from Google Forms prefilled URLs. A Form item's
 * getId() value is not the entry ID accepted by the public formResponse URL.
 */
function refreshTransportMap() {
  const formId = String(getSetting_('form_id') || '').trim();
  if (!formId) throw new Error('No TEST form exists yet. Run bootstrapTestEnvironment() first.');
  const form = FormApp.openById(formId);
  const resumeAccepting = form.isAcceptingResponses();
  form.setAcceptingResponses(false);
  updateSetting_('submission_enabled', 'FALSE');
  try {
    const mappedRows = refreshTransportMap_(form);
    if (resumeAccepting) {
      form.setAcceptingResponses(true);
      updateSetting_('submission_enabled', 'TRUE');
    }
    notify_('Google Form mapping verified', `Verified ${mappedRows.length} submission field mappings.`);
    return mappedRows;
  } catch (error) {
    notify_('Google Form mapping failed', `Submissions remain paused. ${error.message}`);
    throw error;
  }
}

function refreshTransportMap_(form) {
  const rows = readTable_('Transport_Map');
  if (!rows.length) throw new Error('Transport_Map is empty.');
  const itemsByKey = new Map();
  form.getItems().forEach((item) => {
    const key = keyFromHeader_(item.getTitle());
    if (!key) return;
    if (itemsByKey.has(key)) throw new Error(`Duplicate Google Form payload key: ${key}`);
    itemsByKey.set(key, item);
  });
  const missing = rows.map((row) => String(row.payload_key || '').trim()).filter((key) => key && !itemsByKey.has(key));
  if (missing.length) throw new Error(`Google Form is missing mapped fields: ${missing.join(', ')}`);
  const refreshed = rows.map((row) => {
    const key = String(row.payload_key || '').trim();
    return {
      ...row,
      entry_id: entryIdForItem_(form, itemsByKey.get(key)),
      editor_notes: 'Verified Google Forms submission entry ID.',
    };
  });
  writeTable_('Transport_Map', refreshed);
  SpreadsheetApp.flush();
  return refreshed;
}

function entryIdForItem_(form, item) {
  const response = form.createResponse();
  const marker = `SCALA_MAPPING_${item.getId()}`;
  let itemResponse;
  if (item.getType() === FormApp.ItemType.TEXT) {
    itemResponse = item.asTextItem().createResponse(marker);
  } else if (item.getType() === FormApp.ItemType.PARAGRAPH_TEXT) {
    itemResponse = item.asParagraphTextItem().createResponse(marker);
  } else if (item.getType() === FormApp.ItemType.DATE) {
    itemResponse = item.asDateItem().createResponse(new Date(2001, 1, 3));
  } else {
    throw new Error(`Unsupported Google Form item type for ${item.getTitle()}: ${item.getType()}`);
  }
  const prefilledUrl = decodeURIComponent(response.withItemResponse(itemResponse).toPrefilledUrl());
  const match = prefilledUrl.match(/[?&]entry\.(\d+)(?:_[^=&#]+)?=/);
  if (!match) throw new Error(`Could not determine the Google Forms entry ID for ${item.getTitle()}.`);
  return match[1];
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

/** Makes the no-code editor easy to find and use in both bound and standalone projects. */
function prepareEditorWorkspace() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSpreadsheet_();
    installOpenTrigger_(ss);
    prepareEditorWorkspace_();
    notify_('Editor workspace ready', 'Reload this Google Sheet. START_HERE and the green editor tabs now appear first.');
  } finally {
    lock.releaseLock();
  }
}

/** Installs the SCALA Tools menu for a standalone Apps Script project. */
function installAdminMenuTrigger() {
  const ss = getSpreadsheet_();
  installOpenTrigger_(ss);
  prepareEditorWorkspace_();
  notify_('SCALA Tools installed', 'Reload the Google Sheet once. The SCALA Tools menu will appear at the top.');
}

function installOpenTrigger_(spreadsheet) {
  const exists = ScriptApp.getProjectTriggers().some((trigger) =>
    trigger.getHandlerFunction() === 'onOpen' && trigger.getTriggerSourceId() === spreadsheet.getId());
  if (!exists) {
    ScriptApp.newTrigger('onOpen')
      .forSpreadsheet(spreadsheet)
      .onOpen()
      .create();
  }
}

function prepareEditorWorkspace_() {
  const ss = getSpreadsheet_();
  ss.setSpreadsheetLocale('en_US');

  let startSheet = ss.getSheetByName('START_HERE');
  const legacyStartSheet = ss.getSheetByName('README');
  if (!startSheet && legacyStartSheet) startSheet = legacyStartSheet.setName('START_HERE');
  if (!startSheet) startSheet = ss.insertSheet('START_HERE');

  const rawSheets = findRawResponseSheets_();
  rawSheets.forEach((sheet, index) => {
    const targetName = index === 0 ? 'Form_Responses' : `Form_Responses_${index + 1}`;
    const conflict = ss.getSheetByName(targetName);
    if (sheet.getName() !== targetName && !conflict) sheet.setName(targetName);
  });

  const preferredOrder = [
    'START_HERE', 'Questions', 'Fields', 'Options', 'Sections', 'Logic', 'Dashboard',
    'Form_Responses', 'Responses_Wide', 'JSON_Long', 'Maize_Plots', 'Livestock_Breeds',
    'Climate_Events', 'Losses', 'Support_Needs', 'Codebook', 'Settings', 'Transport_Map',
  ];
  preferredOrder.forEach((name, index) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(index + 1);
  });

  const green = '#2E7D32';
  const amber = '#D99A2B';
  const blue = '#2F6F9F';
  const red = '#B85450';
  const gray = '#7A848C';
  ['Questions', 'Fields', 'Options', 'Sections'].forEach((name) => ss.getSheetByName(name)?.setTabColor(green));
  ss.getSheetByName('START_HERE')?.setTabColor('#17473A');
  ss.getSheetByName('Logic')?.setTabColor(amber);
  ['Dashboard', 'Responses_Wide', 'JSON_Long', 'Maize_Plots', 'Livestock_Breeds', 'Climate_Events', 'Losses', 'Support_Needs']
    .forEach((name) => ss.getSheetByName(name)?.setTabColor(blue));
  ss.getSheetByName('Form_Responses')?.setTabColor(red);
  ['Codebook', 'Settings', 'Transport_Map'].forEach((name) => ss.getSheetByName(name)?.setTabColor(gray));

  styleEditorSheet_(ss.getSheetByName('Questions'), ['A', 'E', 'F', 'G', 'H'],
    'Routine editors: change only green cells. Use Fields for individual input labels. Keep block_id, section_id, and segment_id unchanged.',
    'Questions · main editor', [[2, 3]]);
  styleEditorSheet_(ss.getSheetByName('Fields'), ['A', 'E', 'H', 'I', 'J', 'K', 'L', 'M', 'Q'],
    'Routine editors: use green cells for labels, order, required status, placeholders, and numeric limits. Never change an existing question_id.',
    'Fields · question editor', [[2, 3], [6, 2], [14, 3]]);
  styleEditorSheet_(ss.getSheetByName('Options'), ['A', 'C', 'E', 'H'],
    'Routine editors: use green cells for enabled, option_order, and option_label. Keep question_id and option_value stable after collection begins.',
    'Options · main editor', [[2, 1], [4, 1], [6, 2]]);
  styleEditorSheet_(ss.getSheetByName('Sections'), ['A', 'C', 'D', 'E', 'F', 'H'],
    'Routine editors: use green cells for visibility, order, headings, descriptions, and notes. Change module routing only with technical review.',
    'Sections · main editor', [[2, 1], [7, 1]]);
  styleLogicSheet_(ss.getSheetByName('Logic'));
  writeStartHere_(ss, startSheet);
  ss.setActiveSheet(startSheet);
}

function styleEditorSheet_(sheet, editableColumns, instruction, title, hiddenColumnGroups) {
  if (!sheet) return;
  sheet.setFrozenRows(4);
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1').setValue(title);
  sheet.getRange('A2').setValue(instruction);
  const lastRow = Math.max(sheet.getLastRow(), 5);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  sheet.getRange(5, 1, lastRow - 4, lastColumn).setBackground('#F1F3F4');
  sheet.getRangeList(editableColumns.map((column) => `${column}5:${column}${lastRow}`)).setBackground('#E6F4EA');
  sheet.showColumns(1, sheet.getMaxColumns());
  hiddenColumnGroups.forEach(([startColumn, numberOfColumns]) => sheet.hideColumns(startColumn, numberOfColumns));
}

function styleLogicSheet_(sheet) {
  if (!sheet) return;
  sheet.setFrozenRows(4);
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1').setValue('Logic · advanced editor');
  sheet.getRange('A2').setValue('Advanced editor: each row controls conditional display. Test every changed rule in the TEST survey before production use.');
  const lastRow = Math.max(sheet.getLastRow(), 5);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  sheet.getRange(5, 1, lastRow - 4, lastColumn).setBackground('#FFF4D6');
}

function showTechnicalColumns() {
  const ss = getSpreadsheet_();
  ['Questions', 'Fields', 'Options', 'Sections'].forEach((name) => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.showColumns(1, sheet.getMaxColumns());
  });
  notify_('Technical columns visible', 'All editor columns are visible. Use SCALA Tools → Use simple editor view to hide IDs again.');
}

function writeStartHere_(ss, sheet) {
  const forest = '#173F35';
  const forest2 = '#245A49';
  const mint = '#E7F1EC';
  const mint2 = '#F4F8F6';
  const gold = '#E5AC50';
  const goldLight = '#FFF3D8';
  const ink = '#1F2933';
  const line = '#D5E1DB';
  const redLight = '#FDE8E7';
  const sheetUrl = ss.getUrl();
  const testSurveyUrl = 'https://mickeyray0624.github.io/scala-farmer-survey/?environment=test';
  const scriptUrl = `https://script.google.com/home/projects/${ScriptApp.getScriptId()}/edit`;
  const guideUrl = 'https://github.com/MickeyRay0624/scala-farmer-survey/blob/main/CONFIGURATION_GUIDE.md';

  sheet.getRange('A1:H35').breakApart().clearContent().clearFormat().clearNote();
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(7);
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 620);
  sheet.setColumnWidth(3, 150);
  for (let column = 4; column <= 8; column += 1) sheet.setColumnWidth(column, 70);

  const mergedRows = [1, 2, 4, 5, 7, 19, 24, 34, 35];
  mergedRows.forEach((row) => sheet.getRange(row, 1, 1, 8).merge());
  sheet.getRange('A1').setValue('SCALA Farmer Survey · TEST Manager');
  sheet.getRange('A2').setValue('Private response workbook · no-code questionnaire editor · automatic JSON analysis');
  sheet.getRange('A4').setValue('STATUS: READY — This TEST environment is already installed');
  sheet.getRange('A5').setValue('Do not run the setup again. Use the quick links below for daily editing and testing.');
  sheet.getRange('A7').setValue('QUICK LINKS');

  const quickLinks = [
    [testSurveyUrl, 'Open TEST survey', 'Fill and submit a TEST interview.', 'Everyone'],
    [`${sheetUrl}#gid=${ss.getSheetByName('Questions').getSheetId()}`, 'Open Questions', 'Edit top-level headings, help text, visibility, and order.', 'Daily editor'],
    [`${sheetUrl}#gid=${ss.getSheetByName('Fields').getSheetId()}`, 'Open Fields', 'Edit individual question labels, required status, and input limits.', 'Daily editor'],
    [`${sheetUrl}#gid=${ss.getSheetByName('Options').getSheetId()}`, 'Open Options', 'Edit visible choice labels and their order.', 'Daily editor'],
    [`${sheetUrl}#gid=${ss.getSheetByName('Sections').getSheetId()}`, 'Open Sections', 'Edit major section titles, descriptions, and order.', 'Daily editor'],
    [`${sheetUrl}#gid=${ss.getSheetByName('Logic').getSheetId()}`, 'Open Logic', 'Edit conditional display rules and retest every affected route.', 'Advanced editor'],
    [`${sheetUrl}#gid=${ss.getSheetByName('Dashboard').getSheetId()}`, 'Open Dashboard', 'Check response and analysis counts.', 'Reviewer'],
    [getSetting_('form_edit_url') || getSetting_('form_public_url'), 'Open TEST Form editor', 'Inspect the private Google Form receiver.', 'Administrator'],
    [scriptUrl, 'Open Apps Script', 'Run administrative functions or update the script.', 'Administrator'],
    [guideUrl, 'Open administration guide', 'Read the complete no-code and first-time setup instructions.', 'Everyone'],
  ];
  sheet.getRange('A8:C17').setValues(quickLinks.map((item) => [item[1], item[2], item[3]]));
  quickLinks.forEach((item, index) => {
    if (item[0]) sheet.getRange(8 + index, 1).setFormula(`=HYPERLINK("${item[0]}","${item[1]}")`);
  });

  sheet.getRange('A19').setValue('DAILY EDITING — THREE STEPS');
  sheet.getRange('A20:C22').setValues([
    ['1', 'Open the relevant green tab and locate the current question or option.', 'Editor'],
    ['2', 'Edit only green cells. Technical columns are hidden; show them from SCALA Tools only when needed.', 'Editor'],
    ['3', 'Wait up to five minutes, refresh the TEST survey, and submit a labelled QA response.', 'Editor + reviewer'],
  ]);

  sheet.getRange('A24').setValue('FIRST-TIME SETUP — ONLY FOR A COMPLETELY NEW COPY');
  sheet.getRange('A25:C32').setValues([
    ['1', 'Import the manager workbook as a native Google Sheet and keep it private.', 'Technical owner'],
    ['2', 'Open Extensions → Apps Script and add Code.gs plus appsscript.json.', 'Technical owner'],
    ['3', 'For a standalone script, set SCALA_SPREADSHEET_ID and run installAdminMenuTrigger().', 'Technical owner'],
    ['4', 'Reload the Sheet; choose SCALA Tools → 1 · Create isolated TEST form and authorize it.', 'Technical owner'],
    ['5', 'Inspect the new Form; then choose SCALA Tools → 2 · Publish TEST form.', 'Technical owner'],
    ['6', 'Deploy Apps Script as a Web app: Execute as me; access: Anyone.', 'Technical owner'],
    ['7', 'Copy the /exec URL into Settings → config_url and the website TEST runtime configuration.', 'Technical owner'],
    ['8', 'Submit a QA response and confirm Responses_Wide.parse_status is OK.', 'Technical owner'],
  ]);

  sheet.getRange('A34').setValue('SAFETY');
  sheet.getRange('A35').setValue('Keep this workbook private. Never reuse a TEST Form or TEST Sheet for production interviews, and never commit response exports to GitHub.');

  sheet.getRange('A1:H1').setBackground(forest).setFontColor('#FFFFFF').setFontSize(18).setFontWeight('bold').setVerticalAlignment('middle');
  sheet.getRange('A2:H2').setBackground(mint).setFontColor(ink).setFontStyle('italic').setWrap(true);
  sheet.getRange('A4:H4').setBackground('#DDEFE3').setFontColor(forest).setFontSize(14).setFontWeight('bold');
  sheet.getRange('A5:H5').setBackground(mint2).setFontColor(ink).setFontWeight('bold');
  ['A7:H7', 'A19:H19', 'A24:H24'].forEach((range) => sheet.getRange(range).setBackground(forest2).setFontColor('#FFFFFF').setFontWeight('bold'));
  sheet.getRange('A8:A17').setBackground(mint).setFontWeight('bold');
  sheet.getRange('B8:C17').setBackground('#FFFFFF').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('A8:C17').setBorder(true, true, true, true, true, true, line, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('A20:A22').setBackground(forest2).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('B20:C22').setBackground(mint2).setWrap(true);
  sheet.getRange('A20:C22').setBorder(true, true, true, true, true, true, line, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('A25:A32').setBackground(gold).setFontColor(ink).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('B25:C32').setBackground(goldLight).setWrap(true);
  sheet.getRange('A25:C32').setBorder(true, true, true, true, true, true, line, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('A34:H34').setBackground('#B85450').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange('A35:H35').setBackground(redLight).setFontColor(ink).setWrap(true);
  sheet.getRange('A1:H35').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 38);
  sheet.setRowHeight(2, 34);
  sheet.setRowHeight(4, 32);
  sheet.setRowHeight(5, 30);
  for (let row = 8; row <= 17; row += 1) sheet.setRowHeight(row, 40);
  for (let row = 25; row <= 32; row += 1) sheet.setRowHeight(row, 42);
  sheet.setRowHeight(35, 38);
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

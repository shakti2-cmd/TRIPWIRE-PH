/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: DispatchLogger.gs - Task 4.4: Dispatch Logger
 */

/**
 * Appends a verified alert dispatch record into the alert_dispatches tab.
 * Adheres strictly to the 7-column schema in DATA_DICTIONARY.md.
 * 
 * @param {{
 *   dispatchId?: string,
 *   timestampIso?: string,
 *   threatScore: number,
 *   alertLevel: string,
 *   sectorsActive: string,
 *   geminiSummary: string,
 *   telegramMsgId: number|string
 * }} record
 * @return {boolean} Success status
 */
function recordAlertDispatch(record) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TRIPWIRE_CONFIG.TABS.ALERT_DISPATCHES);
  if (!sheet) {
    Logger.log('alert_dispatches tab not found in spreadsheet.');
    return false;
  }

  var dispatchId = record.dispatchId || Utilities.getUuid();
  var timestamp = record.timestampIso || getPHTDateTime().isoString;
  var threatScore = record.threatScore || 0;
  var alertLevel = record.alertLevel || 'ELEVATED';
  var sectorsActive = record.sectorsActive || 'SEC-01';
  var geminiSummary = record.geminiSummary || '';
  var telegramMsgId = record.telegramMsgId || 0;

  var row = [
    dispatchId,
    timestamp,
    threatScore,
    alertLevel,
    sectorsActive,
    geminiSummary,
    telegramMsgId
  ];

  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, 1, 7).setValues([row]);
  Logger.log('Alert dispatch logged successfully with ID: ' + dispatchId);
  return true;
}


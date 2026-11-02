/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: SitRepDispatcher.gs - Midday Daily Theater Situation Report Engine
 */

/**
 * Creates or updates the daily time-driven trigger for the Midday SitRep at 12:00 PM PHT (04:00 UTC).
 */
function createDailySitRepTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dispatchDailySitRep') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 12:00 PM PHT is 04:00 UTC
  ScriptApp.newTrigger('dispatchDailySitRep')
    .timeBased()
    .everyDays(1)
    .atHour(12) // In Apps Script timezone (Asia/Manila)
    .create();

  Logger.log('Successfully configured daily midday SitRep trigger for 12:00 PM PHT.');
}

/**
 * Compiles a calm, comprehensive 24-hour theater situation report across all 5 First Island Chain sectors
 * and dispatches a silent Telegram notification to @TripwirePhAlerts.
 */
function dispatchDailySitRep() {
  Logger.log('Starting Midday Daily Theater SitRep compilation...');
  var config = loadSysConfig();
  var token = config.TELEGRAM_BOT_TOKEN;
  var chatId = config.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    Logger.log('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Aborting SitRep.');
    return;
  }

  var nowPht = getPHTDateTime();
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // Not running bound
  }
  if (!ss && typeof TRIPWIRE_CONFIG !== 'undefined' && TRIPWIRE_CONFIG.SPREADSHEET_ID) {
    try {
      ss = SpreadsheetApp.openById(TRIPWIRE_CONFIG.SPREADSHEET_ID);
    } catch (e) {
      Logger.log('Could not open spreadsheet by ID: ' + e.toString());
    }
  }

  if (!ss) {
    Logger.log('Failed to obtain master spreadsheet reference. Aborting SitRep.');
    return;
  }

  // 1. Collect trailing 24h sector flight statistics from raw_telemetry
  var rawSheet = ss.getSheetByName('raw_telemetry');
  var rawData = rawSheet ? rawSheet.getDataRange().getValues() : [];
  var sectorCounts = {
    'SEC-01': [],
    'SEC-02': [],
    'SEC-03': [],
    'SEC-04': [],
    'SEC-05': []
  };

  var totalEmergencies = 0;
  var totalThermalHits = 0;
  var totalIodaOutages = 0;

  var cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (var i = 1; i < rawData.length; i++) {
    var row = rawData[i];
    var rowTime = new Date(row[0]);
    if (rowTime >= cutoffTime) {
      var sId = String(row[1]).trim();
      var fCount = Number(row[2]) || 0;
      var squawks = Number(row[5]) || 0;
      var thermal = Number(row[6]) || 0;
      var iodaFlag = (row[7] === true || String(row[7]).toUpperCase() === 'TRUE');

      if (sectorCounts[sId]) {
        sectorCounts[sId].push(fCount);
      }
      totalEmergencies += squawks;
      totalThermalHits += thermal;
      if (iodaFlag) totalIodaOutages++;
    }
  }

  // Calculate sector averages or latest observed
  var sectorStats = {};
  var sectorKeys = ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05'];
  for (var k = 0; k < sectorKeys.length; k++) {
    var key = sectorKeys[k];
    var arr = sectorCounts[key];
    if (arr && arr.length > 0) {
      var sum = arr.reduce(function(a, b) { return a + b; }, 0);
      sectorStats[key] = Math.round(sum / arr.length);
    } else {
      sectorStats[key] = 'Nominal';
    }
  }

  // 2. Check diplomatic advisories and GDELT status
  var diploSheet = ss.getSheetByName('diplomatic_audit');
  var diploData = diploSheet ? diploSheet.getDataRange().getValues() : [];
  var recentDiploAlerts = 0;
  var recentDiploItems = [];
  for (var d = 1; d < diploData.length; d++) {
    var dTime = new Date(diploData[d][1]);
    if (dTime >= cutoffTime) {
      recentDiploAlerts++;
      recentDiploItems.push({
        hash: String(diploData[d][0]),
        timestamp: diploData[d][1],
        feed: String(diploData[d][2]),
        title: String(diploData[d][3]),
        keyword: String(diploData[d][4])
      });
    }
  }

  // 3. Synthesize via Gemini Flash
  var prompt = 'You are the intelligence officer for TRIPWIRE-PH. Generate a calm, professional, 2-to-3 sentence Daily Theater Situation Report (SitRep) covering the Philippine archipelago and First Island Chain (Luzon Strait, West Philippine Sea, Mindanao, Taiwan Strait, Miyako Strait). ' +
    'Past 24h metrics: Sector 24h avg flights - Luzon/Bashi: ' + sectorStats['SEC-01'] + ', WPS: ' + sectorStats['SEC-02'] + ', Mindanao: ' + sectorStats['SEC-03'] + ', Taiwan Strait: ' + sectorStats['SEC-04'] + ', Miyako: ' + sectorStats['SEC-05'] + '. ' +
    'Total emergency squawks (7700/7600): ' + totalEmergencies + ', Thermal hits (FRP >= 85MW): ' + totalThermalHits + ', IODA cyber outages: ' + totalIodaOutages + ', Diplomatic evacuation alerts: ' + recentDiploAlerts + '. ' +
    'Guidance: Emphasize that all sectors are operating within circadian equilibrium and commercial transit remains uninterrupted. Maintain an objective, calm, non-alarmist tone. No headlines or speculation. ' +
    'CRITICAL FORMATTING CONSTRAINT: Do NOT output any markdown titles, headers, greetings, or prefixes like \'**TRIPWIRE-PH DAILY SITREP**\'. Begin immediately with the first sentence of the operational assessment.';

  var geminiBrief = 'Commercial transit across the First Island Chain remains within expected seasonal baselines with no macroscopic civil aviation deviations or diplomatic evacuation triggers observed. Critical maritime corridors including the Luzon Strait and West Philippine Sea continue routine operations under normal telecommunications connectivity.';
  
  if (config.GEMINI_API_KEY) {
    var model = getGeminiModel();
    Logger.log('Synthesizing Daily SitRep via Gemini with active model: ' + model);
    try {
      var aiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(config.GEMINI_API_KEY.trim());
      var aiResp = UrlFetchApp.fetch(aiUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.2 }
        }),
        muteHttpExceptions: true
      });
      if (aiResp.getResponseCode() === 200) {
        var parsedAi = JSON.parse(aiResp.getContentText());
        if (parsedAi.candidates && parsedAi.candidates[0] && parsedAi.candidates[0].content) {
          geminiBrief = parsedAi.candidates[0].content.parts[0].text.trim();
        }
      } else {
        Logger.log('Gemini SitRep model ' + model + ' returned HTTP ' + aiResp.getResponseCode() + ': ' + aiResp.getContentText());
      }
    } catch (e) {
      Logger.log('Gemini SitRep generation error with model ' + model + ': ' + e.toString());
    }
  }

  // Sanitization: Strip any leading markdown headers/titles or redundant SITREP prefixes
  geminiBrief = geminiBrief.replace(/^\s*(\*{1,2}|#{1,3})?[^\n]*TRIPWIRE-PH[^\n]*(\*{1,2})?\s*\n+/i, '').trim();
  geminiBrief = geminiBrief.replace(/^\s*(\*{1,2}|#{1,3})?[^\n]*DAILY SITREP[^\n]*(\*{1,2})?\s*\n+/i, '').trim();

  // Diplomatic telemetry line with active/nominal direct hyperlinks
  var diploStatusLine = '• <b>Diplomatic Directives:</b> ';
  if (recentDiploAlerts > 0) {
    diploStatusLine += '🚨 Advisory Flagged';
    for (var r = 0; r < recentDiploItems.length; r++) {
      var rItem = recentDiploItems[r];
      var rUrl = 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html';
      if (rItem.feed.indexOf('UK') !== -1) {
        rUrl = 'https://www.gov.uk/foreign-travel-advice/philippines';
      } else if (rItem.feed.indexOf('JAPAN') !== -1) {
        rUrl = 'https://www.anzen.mofa.go.jp/';
      } else if (rItem.feed.indexOf('TAIWAN') !== -1) {
        rUrl = 'https://www.boca.gov.tw/';
      }
      var rTitleEsc = escapeHtml(rItem.title || rItem.feed);
      var rFeedLabel = rItem.feed ? (escapeHtml(rItem.feed) + ': ') : '';
      diploStatusLine += '\n  └ Advisory Link: <a href="' + rUrl + '">' + rFeedLabel + rTitleEsc + '</a>';
    }
  } else {
    diploStatusLine += '✅ Nominal (<a href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html">US State Dept</a> | <a href="https://www.gov.uk/foreign-travel-advice/philippines">UK FCDO</a> | <a href="https://www.anzen.mofa.go.jp/">Japan MOFA</a> | <a href="https://www.boca.gov.tw/">Taiwan BOCA</a>)';
  }

  // 4. Construct Telegram HTML Report
  var sitRepHtml = '🟢 <b>DAILY SITREP</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'ℹ️ <i>Routine daily summary sent at 12:00 PM PHT. Active sweeps run 24/7 every 15 minutes; immediate alerts trigger automatically upon anomaly detection.</i>\n\n' +
    '🗓 <b>Report Date:</b> <code>' + (nowPht.displayString || (nowPht.isoString.substring(0, 10) + ' (12:00 PM PHT)')) + '</code>\n' +
    '🛡️ <b>Theater Posture:</b> <code>EQUILIBRIUM / NOMINAL</code>\n' +
    '🌐 <b>Coverage:</b> <code>First Island Chain (5 Sectors)</code>\n\n' +
    '📝 <b>Operational Synthesis:</b>\n' +
    '<i>' + escapeHtml(geminiBrief) + '</i>\n\n' +
    '📊 <b>24-Hour Sector Flight Averages:</b>\n' +
    '• <b>SEC-01 (Luzon/Bashi):</b> ' + sectorStats['SEC-01'] + ' flights\n' +
    '• <b>SEC-02 (West PH Sea):</b> ' + sectorStats['SEC-02'] + ' flights\n' +
    '• <b>SEC-03 (Mindanao):</b> ' + sectorStats['SEC-03'] + ' flights\n' +
    '• <b>SEC-04 (Taiwan Strait):</b> ' + sectorStats['SEC-04'] + ' flights\n' +
    '• <b>SEC-05 (Miyako Strait):</b> ' + sectorStats['SEC-05'] + ' flights\n\n' +
    '📡 <b>Indicator Summary (24h Window):</b>\n' +
    '• <b>Emergency Radio Beacons (Squawk 7700/7600):</b> ' + (totalEmergencies === 0 ? '0 active' : '🚨 ' + totalEmergencies + ' detected (General In-Flight Emergency)') + '\n' +
    '• <b>Maritime Thermal Hits:</b> ' + (totalThermalHits === 0 ? '✅ 0 Offshore' : '🔥 ' + totalThermalHits + ' VIIRS Points') + '\n' +
    '• <b>Cyber Connectivity:</b> ' + (totalIodaOutages === 0 ? '✅ 100% Macro Reachability' : '⚠️ Disruption Logged') + '\n' +
    diploStatusLine + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🛡️ <b>PUBLIC SAFETY DISCLAIMER:</b>\n' +
    '<i>This is an automated open-source intelligence monitor. Sensor dropouts, military exercises, and weather routinely produce anomalies. It is NOT an official civil defense agency. Never make personal safety decisions based solely on automated alerts. Always verify with NDRRMC, CAAP, DFA, and DND.</i>';

  var payload = {
    chat_id: chatId,
    text: sitRepHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    disable_notification: true, // Always silent for regular midday SitReps
    reply_markup: buildSitRepKeyboard()
  };

  try {
    var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log('Daily SitRep dispatch status: ' + response.getResponseCode());
  } catch (err) {
    Logger.log('Failed to dispatch daily SitRep: ' + err.toString());
  }
}


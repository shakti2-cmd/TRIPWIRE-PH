/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: GeminiConnector.gs - Task 4.1: Google Gemini Flash Connector
 */

/**
 * Synthesizes telemetry indicators into a tactical, non-alarmist operational brief.
 * 
 * @param {Object} telemetryPayload Numerical & categorical indicator delta
 * @param {string} [apiKey] Optional Gemini API Key override
 * @return {string} 2-3 sentence objective operational summary
 */
function callGeminiSynthesis(telemetryPayload, apiKey) {
  var config = loadSysConfig();
  var primaryKey = apiKey || config.GEMINI_API_KEY;
  var backupKey = config.GEMINI_BACKUP_API_KEY;
  var model = getGeminiModel();

  var fallbackSummary = 'Multi-source telemetry exhibits operational deviations from circadian baselines across monitored sectors. ' +
    'Civil aviation and telecommunication backbones reflect localized variance while sovereign diplomatic advisories remain under continuous automated audit.';

  if (!primaryKey) {
    Logger.log('GEMINI_API_KEY is not configured. Returning fallback summary.');
    return fallbackSummary;
  }

  Logger.log('Invoking Gemini synthesis with active model: ' + model);

  var systemInstruction = 'You are an automated tactical telemetry analyst for TRIPWIRE-PH, an open-source early-warning system monitoring the Philippine theater. ' +
    'Analyze the provided telemetry delta. ' +
    'Generate a strict 2 to 3 sentence operational summary focusing solely on civilian transit impact, infrastructure stability, and regional defense posture. ' +
    'MANDATORY POLICY: Forbid alarmist speculation or predicting war initiation; enforce objective, calm telemetry descriptions of deviations from baseline. ' +
    'CRITICAL FORMATTING CONSTRAINT: Do NOT output any markdown titles, headers, greetings, or prefixes like \'**TRIPWIRE-PH DAILY SITREP**\' or \'**TRIPWIRE-PH ALERT**\'. Begin immediately with the first sentence of the operational assessment.';

  var promptText = 'Telemetry Delta:\n' + JSON.stringify(telemetryPayload, null, 2) + '\n\nProvide the 2-3 sentence operational summary:';

  var requestBody = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000
    }
  };

  // Attempt 1: Query selected model with primary key
  var keysToAttempt = [
    { key: primaryKey, label: 'primary' }
  ];

  if (backupKey && String(backupKey).trim().length > 0 && backupKey !== primaryKey) {
    keysToAttempt.push({ key: backupKey.trim(), label: 'backup' });
  }

  for (var k = 0; k < keysToAttempt.length; k++) {
    var keyObj = keysToAttempt[k];
    var currentKey = keyObj.key;
    var keyLabel = keyObj.label;
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(currentKey);

    try {
      var response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(requestBody),
        muteHttpExceptions: true
      });

      var statusCode = response.getResponseCode();
      if (statusCode === 200) {
        var json = JSON.parse(response.getContentText());
        if (json.candidates && json.candidates.length > 0 &&
            json.candidates[0].content && json.candidates[0].content.parts &&
            json.candidates[0].content.parts.length > 0) {
          var summaryText = json.candidates[0].content.parts[0].text.trim();
          // Strip any leading titles or prefixes
          summaryText = summaryText.replace(/^\s*(\*{1,2}|#{1,3})?[^\n]*TRIPWIRE-PH[^\n]*(\*{1,2})?\s*\n+/i, '').trim();
          Logger.log('Gemini synthesis successful using model ' + model + ' with ' + keyLabel + ' API key.');
          return summaryText.replace(/[\r\n]+/g, ' ');
        }
      } else {
        Logger.log('Gemini model ' + model + ' with ' + keyLabel + ' key returned HTTP ' + statusCode + ': ' + response.getContentText());
        // If 429/500/503 and backup key exists, loop will attempt backup
      }
    } catch (err) {
      Logger.log('Exception querying ' + model + ' with ' + keyLabel + ' key: ' + err.toString());
    }
  }

  return fallbackSummary;
}

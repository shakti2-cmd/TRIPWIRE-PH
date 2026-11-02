/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: GdeltIngestion.gs - Task: GDELT 2.0 Conflict Incident Ingestion
 * 
 * Monitors GDELT 2.0 Doc API for military escalations, naval confrontations,
 * and live-fire incidents involving China vs. Taiwan or China vs. Philippines.
 */

/**
 * Queries GDELT 2.0 Doc API for conflict events in the First Island Chain.
 * 
 * @return {{surgeFlag: boolean, eventCount: number, avgTone: number, summary: string}}
 */
function fetchGdeltConflictEvents() {
  var result = {
    surgeFlag: false,
    eventCount: 0,
    avgTone: 0.0,
    summary: 'No significant military incident surge detected via GDELT.'
  };

  // Search query targeting militarized confrontations in the Western Pacific / First Island Chain
  // e.g. ("Taiwan Strait" OR "West Philippine Sea" OR "Scarborough Shoal" OR "Miyako Strait") AND ("blockade" OR "missile" OR "coast guard" OR "ramming" OR "intercept")
  var query = '("Taiwan Strait" OR "West Philippine Sea" OR "Bashi Channel" OR "Scarborough Shoal" OR "Miyako Strait") AND ("military" OR "blockade" OR "interception" OR "live-fire" OR "warships" OR "air defense")';
  var encodedQuery = encodeURIComponent(query);
  var url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodedQuery + '&mode=artlist&maxrecords=50&timespan=24h&format=json';

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0'
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      var content = response.getContentText();
      // GDELT might return empty string if no matches
      if (!content || content.trim().length === 0) {
        return result;
      }

      var json = JSON.parse(content);
      var articles = json.articles || [];
      result.eventCount = articles.length;

      // Detect escalation keywords in headlines
      var severeCount = 0;
      var severeRegex = /(combat ready|blockade|naval battle|live-fire exercises|missile launch|scrambled fighter|depth charges|rammed|maritime collision)/i;

      for (var i = 0; i < articles.length; i++) {
        var art = articles[i];
        var title = art.title || '';
        if (severeRegex.test(title)) {
          severeCount++;
        }
      }

      // If more than 5 severe conflict articles occur in 24 hours, flag an incident surge
      if (severeCount >= 5 || result.eventCount >= 30) {
        result.surgeFlag = true;
        result.summary = 'GDELT 2.0 reports heightened conflict coverage (' + result.eventCount + ' reports, ' + severeCount + ' tactical escalations).';
      } else {
        result.summary = 'Nominal regional media volume (' + result.eventCount + ' relevant reports).';
      }
    }
  } catch (err) {
    Logger.log('Defensive catch in fetchGdeltConflictEvents: ' + err.toString());
  }

  return result;
}


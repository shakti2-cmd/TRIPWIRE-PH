/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: IodaIngestion.gs - Task 2.4: IODA National Connectivity Collector
 */

/**
 * Queries the IODA (Internet Outage Detection and Analysis) v2 API for nationwide disruptions in the Philippines.
 * Flags positive if macroscopic drops > 20% in BGP routing prefixes or IP probe reachability are reported.
 * 
 * @return {{outageFlag: boolean, details: Array.<{datasource: string, dropRatio: number, description: string}>}}
 */
function fetchIodaStatus() {
  var until = Math.floor(Date.now() / 1000);
  var from = until - 86400; // Rolling 24-hour window
  var url = 'https://api.ioda.inetintel.cc.gatech.edu/v2/outages/events?entityType=country&entityCode=PH&from=' + from + '&until=' + until;
  
  var result = {
    outageFlag: false,
    details: [],
    statusCode: null
  };

  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0'
      }
    });

    var responseCode = response.getResponseCode();
    result.statusCode = responseCode;

    if (responseCode !== 200) {
      Logger.log('IODA API returned HTTP ' + responseCode);
      return result;
    }

    var content = response.getContentText();
    var json = JSON.parse(content);

    // IODA v2 returns payload under "data" or "events"
    var outages = json.data || json.events || json.outages || (Array.isArray(json) ? json : []);

    if (Array.isArray(outages)) {
      for (var i = 0; i < outages.length; i++) {
        var item = outages[i];
        
        // Inspect drop metrics (percentage change, drop ratio, or loss score)
        var drop = 0;
        if (typeof item.percentageChange === 'number') {
          drop = Math.abs(item.percentageChange) > 1 ? Math.abs(item.percentageChange) / 100 : Math.abs(item.percentageChange);
        } else if (typeof item.drop === 'number') {
          drop = item.drop > 1 ? item.drop / 100 : item.drop;
        } else if (typeof item.loss === 'number') {
          drop = item.loss > 1 ? item.loss / 100 : item.loss;
        } else if (item.status === 'active' || item.ongoing === true) {
          // If explicitly marked as an ongoing macroscopic outage
          drop = item.magnitude ? Math.min(1.0, item.magnitude / 100) : 0.25;
        }

        var datasource = item.datasource || item.type || 'macro-connectivity';

        // Check against the 20% drop threshold
        if (drop >= TRIPWIRE_CONFIG.THRESHOLDS.IODA_DROP_THRESHOLD) {
          result.outageFlag = true;
          result.details.push({
            datasource: datasource,
            dropRatio: drop,
            description: item.description || (datasource.toUpperCase() + ' drop of ' + (drop * 100).toFixed(1) + '%')
          });
        }
      }
    }
  } catch (err) {
    Logger.log('Defensive catch in fetchIodaStatus: ' + err.toString());
  }

  return result;
}


/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: OpenSkyIngestion.gs - Task 2.1: OpenSky Network Collector
 */

/**
 * Queries OpenSky Network API for commercial and military transponders inside a sector.
 * Uses HTTP Basic Authentication.
 * 
 * @param {{lamin: number, lamax: number, lomin: number, lomax: number}} bbox
 * @param {{user: string, pass: string}} [auth]
 * @return {{count: number, squawkAlerts: number, nicDegraded: number, states: Array}}
 */
function fetchOpenSkySector(bbox, auth, fallbackMedian) {
  var config = auth ? null : loadSysConfig();
  var user = auth ? auth.user : (config ? config.OPENSKY_USER : '');
  var pass = auth ? auth.pass : (config ? config.OPENSKY_PASS : '');

  var defaultCount = (typeof fallbackMedian === 'number') ? fallbackMedian : 0;
  var result = {
    count: defaultCount,
    squawkAlerts: 0,
    nicDegraded: 0,
    states: [],
    success: false,
    isFallback: false
  };

  if (!bbox) return result;

  var url = 'https://opensky-network.org/api/states/all?' +
    'lamin=' + bbox.lamin +
    '&lamax=' + bbox.lamax +
    '&lomin=' + bbox.lomin +
    '&lomax=' + bbox.lomax;

  var headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0'
  };

  if (user && pass) {
    var cleanUser = String(user).trim();
    var cleanPass = String(pass).trim();
    var authString = Utilities.base64Encode(cleanUser + ':' + cleanPass);
    headers['Authorization'] = 'Basic ' + authString;
  }

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: headers,
      muteHttpExceptions: true,
      validateHttpsCertificates: false
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log('OpenSky API returned HTTP ' + code + ' for bbox: ' + JSON.stringify(bbox) + '. Using baseline median: ' + defaultCount);
      result.isFallback = true;
      return result;
    }

    var json = JSON.parse(response.getContentText());
    var rawStates = json.states || [];

    var airborneCount = 0;
    var emergencySquawks = 0;
    var degradedCount = 0;

    for (var i = 0; i < rawStates.length; i++) {
      var state = rawStates[i];
      // Index 8: on_ground (boolean)
      var onGround = state[8] === true;
      if (onGround) continue; // Only evaluate airborne traffic

      airborneCount++;

      // Index 14: squawk (string)
      var squawk = state[14] ? String(state[14]).trim() : '';
      if (squawk === '7700' || squawk === '7600') {
        emergencySquawks++;
      }

      // Check for degraded transponder/navigation integrity
      var lon = state[5];
      var lat = state[6];
      var posSource = state[16];
      if (lon === null || lat === null || posSource > 0) {
        degradedCount++;
      }
    }

    result.count = airborneCount;
    result.squawkAlerts = emergencySquawks;
    result.nicDegraded = degradedCount;
    result.states = rawStates;
    result.success = true;
    result.isFallback = false;
  } catch (err) {
    Logger.log('OpenSky non-blocking abort (' + err.message + '). Immediate fallback to baseline median: ' + defaultCount);
    result.isFallback = true;
    result.count = defaultCount;
  }

  return result;
}


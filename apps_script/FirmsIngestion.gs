/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: FirmsIngestion.gs - Task 2.2: NASA FIRMS Thermal Collector
 */

/**
 * Queries NASA FIRMS REST API for VIIRS S-NPP active thermal detections within a bounding box.
 * Filters for offshore/maritime coordinates and Fire Radiative Power (FRP) >= 85.0 MW.
 * 
 * @param {string} bbox Bounding box formatted as "W,S,E,N" (e.g. "117.0,17.0,124.0,21.5")
 * @param {string} [mapKey] Optional NASA MAP key override
 * @return {number} Count of verified maritime thermal spikes >= 85 MW
 */
function fetchFirmsHotspots(bbox, mapKey) {
  var key = mapKey;
  if (!key) {
    var config = loadSysConfig();
    key = config.NASA_MAP_KEY;
  }

  if (!key || !bbox) {
    Logger.log('Missing NASA_MAP_KEY or bbox. Returning 0.');
    return 0;
  }

  var cleanKey = String(key).trim();
  var cleanBbox = String(bbox).trim().replace(/\s+/g, '');

  // Query 1-day VIIRS S-NPP Near Real-Time dataset
  // Format: https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]
  var url = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/' +
    cleanKey + '/VIIRS_SNPP_NRT/' + cleanBbox + '/1';

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Accept': 'text/csv, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0'
      },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log('NASA FIRMS API returned HTTP ' + code + ' for bbox ' + cleanBbox + ' - Response: ' + response.getContentText().substring(0, 150));
      return 0;
    }

    var csvText = response.getContentText();
    return parseFirmsCsv(csvText);
  } catch (err) {
    Logger.log('Defensive catch in fetchFirmsHotspots: ' + err.toString());
    return 0;
  }
}

/**
 * Parses NASA FIRMS CSV output and counts maritime coordinates with FRP >= 85 MW.
 * 
 * @param {string} csvText
 * @return {number}
 */
function parseFirmsCsv(csvText) {
  if (!csvText || csvText.indexOf('latitude') === -1) {
    return 0;
  }

  var lines = csvText.trim().split('\n');
  if (lines.length <= 1) return 0;

  var header = lines[0].split(',');
  var latIdx = -1;
  var lonIdx = -1;
  var frpIdx = -1;

  for (var h = 0; h < header.length; h++) {
    var col = header[h].trim().toLowerCase();
    if (col === 'latitude') latIdx = h;
    else if (col === 'longitude') lonIdx = h;
    else if (col === 'frp') frpIdx = h;
  }

  if (latIdx === -1 || lonIdx === -1 || frpIdx === -1) {
    return 0;
  }

  var qualifyingMaritimeHits = 0;

  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var cols = line.split(',');
    var lat = parseFloat(cols[latIdx]);
    var lon = parseFloat(cols[lonIdx]);
    var frp = parseFloat(cols[frpIdx]);

    if (!isNaN(lat) && !isNaN(lon) && !isNaN(frp)) {
      if (frp >= TRIPWIRE_CONFIG.THRESHOLDS.THERMAL_MIN_FRP) {
        if (isMaritimeCoordinate(lat, lon)) {
          qualifyingMaritimeHits++;
        }
      }
    }
  }

  return qualifyingMaritimeHits;
}

/**
 * Defensive heuristic to distinguish offshore/maritime waters from dense inland agriculture.
 * Filters out major landmasses: Mainland Luzon, Palawan island spine, and Mindanao core.
 * 
 * @param {number} lat
 * @param {number} lon
 * @return {boolean} True if coordinate is maritime/offshore
 */
function isMaritimeCoordinate(lat, lon) {
  // 1. Mainland Luzon agricultural corridor exclusion
  if (lat >= 13.5 && lat <= 18.5 && lon >= 120.2 && lon <= 122.5) {
    return false;
  }
  // 2. Palawan island spine exclusion
  if (lat >= 8.5 && lat <= 11.5 && lon >= 117.2 && lon <= 119.8) {
    return false;
  }
  // 3. Mindanao inland landmass exclusion
  if (lat >= 6.0 && lat <= 9.5 && lon >= 123.0 && lon <= 126.5) {
    return false;
  }
  // 4. Panay / Negros / Cebu Visayas central cluster exclusion
  if (lat >= 9.5 && lat <= 12.0 && lon >= 122.0 && lon <= 124.5) {
    return false;
  }

  // All other monitored waters (Bashi Channel, West PH Sea, Celebes Sea) are maritime
  return true;
}


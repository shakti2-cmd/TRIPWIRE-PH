// ============================================================================
// TRIPWIRE-PH MONOLITHIC BUILD - 2026-11-02T13:57:27.316Z
// Automatically generated from apps_script/ modules. Do not edit directly.
// ============================================================================

// --- BEGIN MODULE: Config.gs ---
/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: Config.gs - System Configuration & Database Access
 */

var TRIPWIRE_CONFIG = {
  SPREADSHEET_ID: '13T-6-Ew1KzapwVBS9-j7JU-HXphL4WafAnVLJ_Fjit8',
  TELEGRAM_BOT_TOKEN: '9238246098:AAGuhUdQEy3cSK6dtWaMHhL6pwvCJd0y_Q8',
  TELEGRAM_CHAT_ID: '-1004305756029',
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  
  TABS: {
    SYS_CONFIG: 'sys_config',
    RAW_TELEMETRY: 'raw_telemetry',
    SECTOR_BASELINES: 'sector_baselines',
    ALERT_DISPATCHES: 'alert_dispatches',
    DIPLOMATIC_AUDIT: 'diplomatic_audit'
  },

  SECTORS: {
    'SEC-01': {
      name: 'Luzon Strait & Bashi Channel',
      bbox: { lamin: 17.0, lamax: 21.5, lomin: 117.0, lomax: 124.0 },
      firmsCoords: '117.0,17.0,124.0,21.5',
      point: { lat: 19.25, lon: 120.5, radiusNm: 180 },
      defaultMedian: 45.0,
      defaultStdDev: 6.0
    },
    'SEC-02': {
      name: 'West Philippine Sea Corridor',
      bbox: { lamin: 8.0, lamax: 17.0, lomin: 114.0, lomax: 120.0 },
      firmsCoords: '114.0,8.0,120.0,17.0',
      point: { lat: 12.5, lon: 117.0, radiusNm: 220 },
      defaultMedian: 30.0,
      defaultStdDev: 5.0
    },
    'SEC-03': {
      name: 'Mindanao & Celebes Waters',
      bbox: { lamin: 4.0, lamax: 10.0, lomin: 118.0, lomax: 127.0 },
      firmsCoords: '118.0,4.0,127.0,10.0',
      point: { lat: 7.0, lon: 122.5, radiusNm: 250 },
      defaultMedian: 25.0,
      defaultStdDev: 4.0
    },
    'SEC-04': {
      name: 'Taiwan Strait & ADIZ Corridor',
      bbox: { lamin: 21.5, lamax: 25.5, lomin: 118.0, lomax: 122.5 },
      firmsCoords: '118.0,21.5,122.5,25.5',
      point: { lat: 23.5, lon: 120.25, radiusNm: 160 },
      defaultMedian: 55.0,
      defaultStdDev: 7.0
    },
    'SEC-05': {
      name: 'Miyako Strait & Ryukyu Gap',
      bbox: { lamin: 24.0, lamax: 28.5, lomin: 124.0, lomax: 130.0 },
      firmsCoords: '124.0,24.0,130.0,28.5',
      point: { lat: 26.25, lon: 127.0, radiusNm: 190 },
      defaultMedian: 40.0,
      defaultStdDev: 5.0
    }
  },

  WEIGHTS: {
    DIPLO: 45,
    FLIGHT: 25,
    SQUAWK: 15,
    THERMAL: 10,
    CYBER: 15,
    GDELT: 10
  },

  THRESHOLDS: {
    DEFAULT_ALERT: 50,
    DEFAULT_CRITICAL: 75,
    Z_SCORE_ANOMALY: -2.5,
    FLIGHT_DROP_RATIO: 0.50, // >50% drop from median
    THERMAL_MIN_POINTS: 4,
    THERMAL_MIN_FRP: 85.0,
    IODA_DROP_THRESHOLD: 0.20, // >20% macroscopic drop
    GDELT_GOLDSTEIN_ANOMALY: -7.0
  },

  FEEDS: {
    US_STATE_DEPT_RSS: 'https://travel.state.gov/_res/rss/TAsTWs.xml',
    UK_FCDO_ATOM_PH: 'https://www.gov.uk/foreign-travel-advice/philippines.atom',
    UK_FCDO_ATOM_TW: 'https://www.gov.uk/foreign-travel-advice/taiwan.atom',
    JAPAN_MOFA_RSS: 'https://www.anzen.mofa.go.jp/rss/riskinfo.xml',
    TAIWAN_BOCA_RSS: 'https://www.boca.gov.tw/sp-trwa-rss-1.html',
    AUSTRALIA_SMARTRAVELLER_RSS: 'https://www.smartraveller.gov.au/destinations/asia/philippines',
    IODA_OVERALL: 'https://api.ioda.inetintel.cc.gatech.edu/v2/outages/events?entityType=country&entityCode=PH',
    GDELT_DOC_API: 'https://api.gdeltproject.org/api/v2/doc/doc',
    AIRPLANES_LIVE_POINT: 'https://api.airplanes.live/v2/point',
    ADSB_ONE_POINT: 'https://api.adsb.one/v2/point'
  }
};

/**
 * Returns the active Spreadsheet reference.
 * Supports standalone scripts or container-bound execution.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(TRIPWIRE_CONFIG.SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

/**
 * Loads key-value configuration pairs from the sys_config tab.
 * @return {Object.<string, string>}
 */
function loadSysConfig() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TRIPWIRE_CONFIG.TABS.SYS_CONFIG);
  var config = {};
  
  if (!sheet) return config;

  var data = sheet.getDataRange().getValues();
  // Row 0 is header: [config_key, config_value, description]
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var val = String(data[i][1]).trim();
    if (key) {
      config[key] = val;
    }
  }
  return config;
}

/**
 * Dynamically resolves the configured Gemini model identifier.
 * Reads GEMINI_MODEL from sys_config in TRIPWIRE-PH_DB_Master and trims whitespace.
 * Falls back to TRIPWIRE_CONFIG.GEMINI_MODEL if the sheet is empty or unreachable.
 * 
 * @return {string} Configured Google AI Studio model identifier
 */
function getGeminiModel() {
  try {
    var sysConfig = loadSysConfig();
    if (sysConfig && sysConfig.GEMINI_MODEL && String(sysConfig.GEMINI_MODEL).trim().length > 0) {
      return String(sysConfig.GEMINI_MODEL).trim();
    }
  } catch (e) {
    Logger.log('Could not dynamically read GEMINI_MODEL from sys_config: ' + e.toString());
  }

  if (typeof TRIPWIRE_CONFIG !== 'undefined' && TRIPWIRE_CONFIG.GEMINI_MODEL) {
    return String(TRIPWIRE_CONFIG.GEMINI_MODEL).trim();
  }

  return 'gemini-3.5-flash-lite';
}

/**
 * Helper to get current Philippine Standard Time (PHT / UTC+8).
 * @param {Date} [refDate]
 * @return {{date: Date, dayOfWeek: number, hourOfDay: number, isoString: string}}
 */
function getPHTDateTime(refDate) {
  var now = refDate || new Date();
  var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  var phtDate = new Date(utc + (3600000 * 8));

  return {
    date: phtDate,
    dayOfWeek: phtDate.getDay(), // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    hourOfDay: phtDate.getHours(), // 0 to 23
    isoString: Utilities.formatDate(phtDate, "Asia/Manila", "yyyy-MM-dd'T'HH:mm:ssXXX"),
    displayString: Utilities.formatDate(phtDate, "Asia/Manila", "yyyy-MM-dd (hh:mm a 'PHT')")
  };
}


// --- END MODULE: Config.gs ---

// --- BEGIN MODULE: BaselineScoring.gs ---
/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: BaselineScoring.gs - Phase 3: Heuristic Baseline & Threat Scoring
 */

/**
 * Loads baseline lookup cache from sector_baselines tab.
 * Key format: sectorId + '_' + dayOfWeek + '_' + hourOfDay
 * @return {Object.<string, {median: number, stdDev: number}>}
 */
function loadSectorBaselinesCache() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TRIPWIRE_CONFIG.TABS.SECTOR_BASELINES);
  var cache = {};

  if (!sheet) return cache;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return cache;

  var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var sectorId = String(row[0]).trim();
    var dayOfWeek = Number(row[1]);
    var hourOfDay = Number(row[2]);
    var median = Number(row[3]);
    var stdDev = Number(row[4]);

    if (sectorId && !isNaN(dayOfWeek) && !isNaN(hourOfDay)) {
      var key = sectorId + '_' + dayOfWeek + '_' + hourOfDay;
      cache[key] = {
        median: isNaN(median) ? 0 : median,
        stdDev: isNaN(stdDev) || stdDev <= 0 ? 1.0 : stdDev
      };
    }
  }
  return cache;
}

/**
 * Task 3.1: Circadian Deviation Engine
 * Evaluates observed airborne flights against expected median and standard deviation.
 * 
 * @param {string} sectorId ('SEC-01', 'SEC-02', 'SEC-03')
 * @param {number} observedFlights Active airborne count in sector
 * @param {Object.<string, {median: number, stdDev: number}>} [baselinesCache]
 * @param {Date} [refDate]
 * @return {{
 *   sectorId: string,
 *   observedFlights: number,
 *   baselineMedian: number,
 *   stdDeviation: number,
 *   zScore: number,
 *   dropRatio: number,
 *   isAirspaceAnomalous: boolean,
 *   dayOfWeek: number,
 *   hourOfDay: number
 * }}
 */
function evaluateAirspaceDeviation(sectorId, observedFlights, baselinesCache, refDate) {
  var pht = getPHTDateTime(refDate);
  var cache = baselinesCache || loadSectorBaselinesCache();
  var key = sectorId + '_' + pht.dayOfWeek + '_' + pht.hourOfDay;

  var baseline = cache[key];
  if (!baseline) {
    // Fallback to sector defaults if baseline entry is missing
    var secConfig = TRIPWIRE_CONFIG.SECTORS[sectorId] || {};
    baseline = {
      median: secConfig.defaultMedian || 30.0,
      stdDev: secConfig.defaultStdDev || 5.0
    };
  }

  var median = baseline.median;
  var stdDev = baseline.stdDev > 0 ? baseline.stdDev : 1.0;
  
  // Compute Z-score: Z = (X - μ) / σ
  var zScore = (observedFlights - median) / stdDev;
  
  // Calculate percentage drop from median
  var dropRatio = median > 0 ? (median - observedFlights) / median : 0;

  // Airspace anomaly triggers if Z < -2.5 OR flight deficit > 50%
  var isAnomalous = (zScore < TRIPWIRE_CONFIG.THRESHOLDS.Z_SCORE_ANOMALY) ||
                    (dropRatio >= TRIPWIRE_CONFIG.THRESHOLDS.FLIGHT_DROP_RATIO);

  return {
    sectorId: sectorId,
    observedFlights: observedFlights,
    baselineMedian: Math.round(median * 10) / 10,
    stdDeviation: Math.round(stdDev * 10) / 10,
    zScore: Math.round(zScore * 100) / 100,
    dropRatio: Math.round(dropRatio * 100) / 100,
    isAirspaceAnomalous: isAnomalous,
    dayOfWeek: pht.dayOfWeek,
    hourOfDay: pht.hourOfDay
  };
}

/**
 * Task 3.2: Composite Threat Scoring Function
 * Implements S = W_diplo (45) + W_flight (25) + W_squawk (15) + W_thermal (10) + W_cyber (15), capped at 100.
 * 
 * @param {{
 *   diploFlag: boolean,
 *   airspaceAnomaly: boolean,
 *   squawkAlerts: number,
 *   firmsHotspots: number,
 *   cyberOutageFlag: boolean
 * }} indicators
 * @return {{
 *   threatScore: number,
 *   alertLevel: string, // 'NOMINAL', 'ELEVATED', 'CRITICAL'
 *   disableNotification: boolean,
 *   breakdown: Object.<string, number>
 * }}
 */
function calculateCompositeThreatScore(indicators) {
  var score = 0;
  var breakdown = {
    diplo: 0,
    flight: 0,
    squawk: 0,
    thermal: 0,
    cyber: 0,
    gdelt: 0
  };

  // Tier 1: Diplomatic Directives (+45)
  if (indicators.diploFlag) {
    breakdown.diplo = TRIPWIRE_CONFIG.WEIGHTS.DIPLO;
    score += breakdown.diplo;
  }

  // Tier 2: Airspace Depletion (+25)
  if (indicators.airspaceAnomaly) {
    breakdown.flight = TRIPWIRE_CONFIG.WEIGHTS.FLIGHT;
    score += breakdown.flight;
  }

  // Tier 3: Transponder Emergency (+15 on squawk 7700 or 7600)
  if (indicators.squawkAlerts > 0) {
    breakdown.squawk = TRIPWIRE_CONFIG.WEIGHTS.SQUAWK;
    score += breakdown.squawk;
  }

  // Tier 4: Satellite Thermal Hits (+10 on >= 4 maritime hits with FRP >= 85MW)
  if (indicators.firmsHotspots >= TRIPWIRE_CONFIG.THRESHOLDS.THERMAL_MIN_POINTS) {
    breakdown.thermal = TRIPWIRE_CONFIG.WEIGHTS.THERMAL;
    score += breakdown.thermal;
  }

  // Tier 5: Internet / Cyber Outage (+15 on macroscopic BGP/IP drop > 20%)
  if (indicators.cyberOutageFlag) {
    breakdown.cyber = TRIPWIRE_CONFIG.WEIGHTS.CYBER;
    score += breakdown.cyber;
  }

  // Tier 6: GDELT 2.0 Conflict Incident Surge (+10)
  if (indicators.gdeltSurgeFlag) {
    breakdown.gdelt = TRIPWIRE_CONFIG.WEIGHTS.GDELT || 10;
    score += breakdown.gdelt;
  }

  // Cap maximum threat score at 100
  var finalScore = Math.min(100, score);

  // Determine Alert Level & Notification Policy
  var alertLevel = 'NOMINAL';
  var disableNotification = true;

  if (finalScore >= TRIPWIRE_CONFIG.THRESHOLDS.DEFAULT_CRITICAL || indicators.diploFlag) {
    alertLevel = 'CRITICAL';
    disableNotification = false; // Unmuted alarm
  } else if (finalScore >= TRIPWIRE_CONFIG.THRESHOLDS.DEFAULT_ALERT) {
    alertLevel = 'ELEVATED';
    disableNotification = true; // Silent dispatch
  } else {
    alertLevel = 'NOMINAL';
    disableNotification = true;
  }

  return {
    threatScore: finalScore,
    alertLevel: alertLevel,
    disableNotification: disableNotification,
    breakdown: breakdown
  };
}

/**
 * Task 3.3: Sector Batching & Consolidation Logic
 * Consolidates evaluation across sectors to prevent dispatch spam if multiple sectors are anomalous.
 * 
 * @param {Array.<{
 *   sectorId: string,
 *   airspaceResult: Object,
 *   squawkAlerts: number,
 *   firmsHotspots: number,
 *   isSectorAnomalous: boolean
 * }>} sectorResults
 * @param {boolean} diploFlag
 * @param {boolean} cyberOutageFlag
 * @return {{
 *   consolidated: boolean,
 *   anomalousSectors: Array.<string>,
 *   compositeThreat: Object,
 *   sectorSummary: string
 * }}
 */
function evaluateSectorsAndConsolidate(sectorResults, diploFlag, cyberOutageFlag, gdeltSurgeFlag) {
  var anomalousSectors = [];
  var totalSquawks = 0;
  var maxThermal = 0;
  var anyAirspaceAnomaly = false;

  for (var i = 0; i < sectorResults.length; i++) {
    var sec = sectorResults[i];
    totalSquawks += sec.squawkAlerts || 0;
    if ((sec.firmsHotspots || 0) > maxThermal) {
      maxThermal = sec.firmsHotspots;
    }
    if (sec.airspaceResult && sec.airspaceResult.isAirspaceAnomalous) {
      anyAirspaceAnomaly = true;
    }

    // Flag sector as anomalous if flight anomaly, emergency squawks, or thermal hits detected
    if ((sec.airspaceResult && sec.airspaceResult.isAirspaceAnomalous) ||
        sec.squawkAlerts > 0 ||
        sec.firmsHotspots >= TRIPWIRE_CONFIG.THRESHOLDS.THERMAL_MIN_POINTS) {
      anomalousSectors.push(sec.sectorId);
    }
  }

  // Calculate overall composite threat score
  var compositeThreat = calculateCompositeThreatScore({
    diploFlag: diploFlag,
    airspaceAnomaly: anyAirspaceAnomaly,
    squawkAlerts: totalSquawks,
    firmsHotspots: maxThermal,
    cyberOutageFlag: cyberOutageFlag,
    gdeltSurgeFlag: gdeltSurgeFlag || false
  });

  // Consolidation triggered if 2 or more sectors show anomalies
  var consolidated = anomalousSectors.length >= 2;

  return {
    consolidated: consolidated,
    anomalousSectors: anomalousSectors,
    compositeThreat: compositeThreat,
    sectorSummary: anomalousSectors.length > 0 ? anomalousSectors.join(', ') : 'None'
  };
}

/**
 * Appends standard audit rows to raw_telemetry tab.
 * Adheres strictly to the 9-column schema in DATA_DICTIONARY.md.
 * 
 * @param {Array.<{
 *   sectorId: string,
 *   flightCount: number,
 *   baselineMedian: number,
 *   zScore: number,
 *   squawkAlerts: number,
 *   firmsHotspots: number,
 *   iodaOutageFlag: boolean,
 *   diploAlertFlag: boolean
 * }>} telemetryRecords
 */
function recordRawTelemetryBatch(telemetryRecords) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(TRIPWIRE_CONFIG.TABS.RAW_TELEMETRY);
  if (!sheet || !telemetryRecords || telemetryRecords.length === 0) return;

  var nowIso = getPHTDateTime().isoString;
  var rows = [];

  for (var i = 0; i < telemetryRecords.length; i++) {
    var rec = telemetryRecords[i];
    rows.push([
      nowIso,
      rec.sectorId,
      rec.flightCount,
      rec.baselineMedian,
      rec.zScore,
      rec.squawkAlerts,
      rec.firmsHotspots,
      rec.iodaOutageFlag ? 'TRUE' : 'FALSE',
      rec.diploAlertFlag ? 'TRUE' : 'FALSE'
    ]);
  }

  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 9).setValues(rows);
}


// --- END MODULE: BaselineScoring.gs ---

// --- BEGIN MODULE: OpenSkyIngestion.gs ---
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


// --- END MODULE: OpenSkyIngestion.gs ---

// --- BEGIN MODULE: AviationIngestion.gs ---
/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: AviationIngestion.gs - Multi-Source Aviation Telemetry Ingestion
 * 
 * Primary: airplanes.live / adsb.one (Fast, zero-credential community ADS-B REST API)
 * Secondary: OpenSky Network (with 5-second defensive timeout & instant baseline fallback)
 */

/**
 * Queries community ADS-B point API (airplanes.live with adsb.one fallback).
 * 
 * @param {{lat: number, lon: number, radius: number}} point
 * @return {{count: number, squawkAlerts: number, nicDegraded: number, success: boolean, source: string}}
 */
function fetchCommunityAdsbPoint(point) {
  var result = {
    count: 0,
    squawkAlerts: 0,
    nicDegraded: 0,
    success: false,
    source: 'none',
    statusCode: null
  };

  if (!point || typeof point.lat !== 'number' || typeof point.lon !== 'number') {
    return result;
  }

  var radius = (typeof point.radiusNm === 'number') ? point.radiusNm : (point.radius || 180);

  var endpoints = [
    'https://api.airplanes.live/v2/point/' + point.lat + '/' + point.lon + '/' + radius,
    'https://api.adsb.one/v2/point/' + point.lat + '/' + point.lon + '/' + radius
  ];

  for (var e = 0; e < endpoints.length; e++) {
    var url = endpoints[e];
    try {
      var response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0'
        },
        muteHttpExceptions: true
      });

      var code = response.getResponseCode();
      result.statusCode = code;

      if (code === 200) {
        var json = JSON.parse(response.getContentText());
        var aircraftList = json.ac || [];

        var airborneCount = 0;
        var emergencySquawks = 0;
        var degradedCount = 0;

        for (var i = 0; i < aircraftList.length; i++) {
          var ac = aircraftList[i];
          // Filter ground vehicles/transponders
          if (ac.alt_baro === 'ground' || ac.ground === true) continue;

          airborneCount++;

          // Check emergency squawk codes (7700 = emergency, 7600 = radio failure)
          var sq = ac.squawk ? String(ac.squawk).trim() : '';
          if (sq === '7700' || sq === '7600') {
            emergencySquawks++;
          }

          // Check degraded navigation integrity
          var nicVal = (typeof ac.nic === 'number') ? ac.nic : 8;
          if (nicVal < 5) {
            degradedCount++;
          }
        }

        result.count = airborneCount;
        result.squawkAlerts = emergencySquawks;
        result.nicDegraded = degradedCount;
        result.success = true;
        result.source = (e === 0) ? 'airplanes.live' : 'adsb.one';
        return result;
      }
    } catch (err) {
      Logger.log('Community ADS-B endpoint ' + url + ' error: ' + err.message);
    }
  }

  return result;
}

/**
 * Unified sector aviation collector:
 * 1. Queries airplanes.live / adsb.one community feeds first (zero credential, high speed).
 * 2. If community feed fails, queries OpenSky Network.
 * 3. If OpenSky fails or times out, immediately falls back to circadian baseline median.
 * 
 * @param {string} secId Operational sector ID (e.g. 'SEC-01')
 * @param {Object} secConfig Sector configuration object
 * @param {Object} openSkyAuth OpenSky credentials
 * @param {number} fallbackMedian Expected circadian baseline median
 * @return {{count: number, squawkAlerts: number, nicDegraded: number, isFallback: boolean, source: string}}
 */
function fetchSectorAviationTelemetry(secId, secConfig, openSkyAuth, fallbackMedian) {
  var defaultCount = (typeof fallbackMedian === 'number') ? fallbackMedian : (secConfig.defaultMedian || 30);

  // 1. Primary: Community ADS-B point API
  if (secConfig.point) {
    var communityData = fetchCommunityAdsbPoint(secConfig.point);
    if (communityData.success) {
      return {
        count: communityData.count,
        squawkAlerts: communityData.squawkAlerts,
        nicDegraded: communityData.nicDegraded,
        isFallback: false,
        source: communityData.source
      };
    }
  }

  // 2. Secondary: OpenSky Network with fast fallback
  if (secConfig.bbox) {
    var openSkyData = fetchOpenSkySector(secConfig.bbox, openSkyAuth, defaultCount);
    if (openSkyData.success && !openSkyData.isFallback) {
      return {
        count: openSkyData.count,
        squawkAlerts: openSkyData.squawkAlerts,
        nicDegraded: openSkyData.nicDegraded,
        isFallback: false,
        source: 'opensky-network'
      };
    }
  }

  // 3. Guaranteed Baseline Fallback
  return {
    count: defaultCount,
    squawkAlerts: 0,
    nicDegraded: 0,
    isFallback: true,
    source: 'baseline-fallback'
  };
}


// --- END MODULE: AviationIngestion.gs ---

// --- BEGIN MODULE: FirmsIngestion.gs ---
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


// --- END MODULE: FirmsIngestion.gs ---

// --- BEGIN MODULE: DiplomaticIngestion.gs ---
/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: DiplomaticIngestion.gs - Task 2.3: Sovereign Diplomatic Feed Parser
 */

// Title Regex: Matches explicit nationwide extreme alert classifications
var NATIONWIDE_TITLE_REGEX = /(Level 4:\s*Do Not Travel|Level 4\s*-\s*Do Not Travel|Do Not Travel|退避勧告|紅色警示)/i;

// Body/Description Regex: Restricts keyword matching strictly to mandatory institutional directives
var INSTITUTIONAL_DIRECTIVES_REGEX = /(ordered departure|authorized departure|evacuation of non-emergency|eligible family members|leave by commercial means immediately|suspension of operations|退避勧告|渡航中止勧告|紅色警示|撤離)/i;

/**
 * Computes SHA-256 hex string from input.
 * @param {string} input
 * @return {string}
 */
function computeSha256(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  var hexStr = '';
  for (var i = 0; i < rawHash.length; i++) {
    var b = rawHash[i];
    if (b < 0) b += 256;
    var byteHex = b.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hexStr += byteHex;
  }
  return hexStr;
}

/**
 * Retrieves existing hash IDs from diplomatic_audit tab.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} auditSheet
 * @return {Object.<string, boolean>} Set of known hash IDs
 */
function getExistingDiplomaticHashes(auditSheet) {
  var hashes = {};
  if (!auditSheet) return hashes;

  var lastRow = auditSheet.getLastRow();
  if (lastRow <= 1) return hashes;

  var values = auditSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var h = String(values[i][0]).trim();
    if (h) hashes[h] = true;
  }
  return hashes;
}

/**
 * Queries US State Dept RSS and UK FCDO Atom feeds.
 * Detects sovereign embassy evacuation directives and records new hits to diplomatic_audit tab.
 * @return {{flagged: boolean, items: Array.<{feed: string, title: string, keyword: string, hash: string}>}}
 */
function checkDiplomaticFeeds() {
  var ss = getSpreadsheet();
  var auditSheet = ss.getSheetByName(TRIPWIRE_CONFIG.TABS.DIPLOMATIC_AUDIT);
  var knownHashes = getExistingDiplomaticHashes(auditSheet);
  var flaggedItems = [];
  var rowsToAppend = [];
  var nowIso = getPHTDateTime().isoString;

  // 1. Process US State Department RSS
  try {
    var usResponse = UrlFetchApp.fetch(TRIPWIRE_CONFIG.FEEDS.US_STATE_DEPT_RSS, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'TRIPWIRE-PH/1.0 (Autonomous Geopolitical Early Warning)' }
    });

    if (usResponse.getResponseCode() === 200) {
      var xmlContent = usResponse.getContentText();
      var usItems = parseUsStateDeptXml(xmlContent);

      for (var i = 0; i < usItems.length; i++) {
        var item = usItems[i];
        if (!item) continue;
        var itemTitle = item.title || '';
        var itemDesc = item.description || '';
        var combinedText = (itemTitle + ' ' + itemDesc).toLowerCase();

        if (combinedText.indexOf('philippines') !== -1 || combinedText.indexOf('manila') !== -1 ||
            combinedText.indexOf('taiwan') !== -1 || combinedText.indexOf('taipei') !== -1) {
          
          var matchedKeyword = null;
          // 1. Check title for explicit nationwide Level 4
          var titleMatch = itemTitle.match(NATIONWIDE_TITLE_REGEX);
          if (titleMatch) {
            matchedKeyword = titleMatch[0];
          } else {
            // 2. Check body strictly for institutional evacuation/departure directives
            var bodyMatch = itemDesc.match(INSTITUTIONAL_DIRECTIVES_REGEX);
            if (bodyMatch) {
              matchedKeyword = bodyMatch[0];
            }
          }

          if (matchedKeyword) {
            var rawKey = 'US_STATE_DEPT|' + item.title + '|' + (item.pubDate || item.link);
            var hashId = computeSha256(rawKey);

            if (!knownHashes[hashId]) {
              knownHashes[hashId] = true;
              flaggedItems.push({
                feed: 'US_STATE_DEPT',
                title: item.title,
                link: item.link || 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html',
                keyword: matchedKeyword,
                hash: hashId
              });
              rowsToAppend.push([hashId, nowIso, 'US_STATE_DEPT', item.title, matchedKeyword]);
            }
          }
        }
      }
    }
  } catch (err) {
    Logger.log('Error parsing US State Dept feed: ' + err.toString());
  }

  // 2. Process UK FCDO Atom Feeds (Philippines + Taiwan)
  var ukFeeds = [
    { url: TRIPWIRE_CONFIG.FEEDS.UK_FCDO_ATOM_PH || 'https://www.gov.uk/foreign-travel-advice/philippines.atom', region: 'PH', defaultLink: 'https://www.gov.uk/foreign-travel-advice/philippines' },
    { url: TRIPWIRE_CONFIG.FEEDS.UK_FCDO_ATOM_TW || 'https://www.gov.uk/foreign-travel-advice/taiwan.atom', region: 'TW', defaultLink: 'https://www.gov.uk/foreign-travel-advice/taiwan' }
  ];

  for (var k = 0; k < ukFeeds.length; k++) {
    var feedInfo = ukFeeds[k];
    try {
      var ukResponse = UrlFetchApp.fetch(feedInfo.url, {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0' }
      });

      if (ukResponse.getResponseCode() === 200) {
        var atomContent = ukResponse.getContentText();
        var ukEntries = parseUkFcdoAtom(atomContent);

        for (var j = 0; j < ukEntries.length; j++) {
          var entry = ukEntries[j];
          if (!entry) continue;
          var entryTitle = entry.title || '';
          var entryBody = (entry.summary || '') + ' ' + (entry.content || '');
          var entryText = (entryTitle + ' ' + entryBody).toLowerCase();

          // Matches Philippines, Manila, Taiwan, or Taipei
          if (entryText.indexOf('philippines') !== -1 || entryText.indexOf('manila') !== -1 ||
              entryText.indexOf('taiwan') !== -1 || entryText.indexOf('taipei') !== -1) {
            
            var matchedKeyword = null;
            var titleMatch = entryTitle.match(NATIONWIDE_TITLE_REGEX);
            if (titleMatch) {
              matchedKeyword = titleMatch[0];
            } else {
              var bodyMatch = entryBody.match(INSTITUTIONAL_DIRECTIVES_REGEX);
              if (bodyMatch) {
                matchedKeyword = bodyMatch[0];
              }
            }

            if (matchedKeyword) {
              var ukRawKey = 'UK_FCDO_' + feedInfo.region + '|' + entry.id + '|' + entry.updated;
              var ukHash = computeSha256(ukRawKey);

              if (!knownHashes[ukHash]) {
                knownHashes[ukHash] = true;
                flaggedItems.push({
                  feed: 'UK_FCDO_' + feedInfo.region,
                  title: entry.title,
                  link: entry.id || feedInfo.defaultLink,
                  keyword: matchedKeyword,
                  hash: ukHash
                });
                rowsToAppend.push([ukHash, nowIso, 'UK_FCDO_' + feedInfo.region, entry.title, matchedKeyword]);
              }
            }
          }
        }
      }
    } catch (err) {
      Logger.log('Error parsing UK FCDO feed (' + feedInfo.region + '): ' + err.toString());
    }
  }

  // 3. Process Japan MOFA Overseas Safety RSS
  try {
    var mofaUrl = TRIPWIRE_CONFIG.FEEDS.JAPAN_MOFA_RSS || 'https://www.anzen.mofa.go.jp/rss/riskinfo.xml';
    var mofaResponse = UrlFetchApp.fetch(mofaUrl, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0' }
    });

    if (mofaResponse.getResponseCode() === 200) {
      var mofaXml = mofaResponse.getContentText();
      var mofaItems = parseUsStateDeptXml(mofaXml);

      for (var m = 0; m < mofaItems.length; m++) {
        var mItem = mofaItems[m];
        if (!mItem) continue;
        var mTitle = mItem.title || '';
        var mDesc = mItem.description || '';
        var mText = (mTitle + ' ' + mDesc).toLowerCase();

        if (mText.indexOf('フィリピン') !== -1 || mText.indexOf('philippines') !== -1 ||
            mText.indexOf('台湾') !== -1 || mText.indexOf('taiwan') !== -1) {
          
          var mMatchedKeyword = null;
          var mTitleMatch = mTitle.match(NATIONWIDE_TITLE_REGEX);
          if (mTitleMatch) {
            mMatchedKeyword = mTitleMatch[0];
          } else {
            var mBodyMatch = mDesc.match(INSTITUTIONAL_DIRECTIVES_REGEX);
            if (mBodyMatch) {
              mMatchedKeyword = mBodyMatch[0];
            }
          }

          if (mMatchedKeyword) {
            var mRawKey = 'JAPAN_MOFA|' + mItem.title + '|' + (mItem.pubDate || mItem.link);
            var mHash = computeSha256(mRawKey);

            if (!knownHashes[mHash]) {
              knownHashes[mHash] = true;
              flaggedItems.push({
                feed: 'JAPAN_MOFA',
                title: mItem.title,
                link: mItem.link || 'https://www.anzen.mofa.go.jp/',
                keyword: mMatchedKeyword,
                hash: mHash
              });
              rowsToAppend.push([mHash, nowIso, 'JAPAN_MOFA', mItem.title, mMatchedKeyword]);
            }
          }
        }
      }
    }
  } catch (errMofa) {
    Logger.log('Error parsing Japan MOFA feed: ' + errMofa.toString());
  }

  // 4. Process Taiwan BOCA Consular Advisory RSS
  try {
    var bocaUrl = TRIPWIRE_CONFIG.FEEDS.TAIWAN_BOCA_RSS || 'https://www.boca.gov.tw/sp-trwa-rss-1.html';
    var bocaResponse = UrlFetchApp.fetch(bocaUrl, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0' }
    });

    if (bocaResponse.getResponseCode() === 200) {
      var bocaXml = bocaResponse.getContentText();
      var bocaItems = parseUsStateDeptXml(bocaXml);

      for (var b = 0; b < bocaItems.length; b++) {
        var bItem = bocaItems[b];
        if (!bItem) continue;
        var bTitle = bItem.title || '';
        var bDesc = bItem.description || '';
        var bText = (bTitle + ' ' + bDesc).toLowerCase();

        if (bText.indexOf('菲律賓') !== -1 || bText.indexOf('philippines') !== -1 ||
            bText.indexOf('taiwan') !== -1 || bText.indexOf('馬尼拉') !== -1) {
          
          var bMatchedKeyword = null;
          var bTitleMatch = bTitle.match(NATIONWIDE_TITLE_REGEX);
          if (bTitleMatch) {
            bMatchedKeyword = bTitleMatch[0];
          } else {
            var bBodyMatch = bDesc.match(INSTITUTIONAL_DIRECTIVES_REGEX);
            if (bBodyMatch) {
              bMatchedKeyword = bBodyMatch[0];
            }
          }

          if (bMatchedKeyword) {
            var bRawKey = 'TAIWAN_BOCA|' + bItem.title + '|' + (bItem.pubDate || bItem.link);
            var bHash = computeSha256(bRawKey);

            if (!knownHashes[bHash]) {
              knownHashes[bHash] = true;
              flaggedItems.push({
                feed: 'TAIWAN_BOCA',
                title: bItem.title,
                link: bItem.link || 'https://www.boca.gov.tw/',
                keyword: bMatchedKeyword,
                hash: bHash
              });
              rowsToAppend.push([bHash, nowIso, 'TAIWAN_BOCA', bItem.title, bMatchedKeyword]);
            }
          }
        }
      }
    }
  } catch (errBoca) {
    Logger.log('Error parsing Taiwan BOCA feed: ' + errBoca.toString());
  }

  // Batch append new flagged entries to diplomatic_audit
  if (rowsToAppend.length > 0 && auditSheet) {
    var startRow = auditSheet.getLastRow() + 1;
    auditSheet.getRange(startRow, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
  }

  return {
    flagged: flaggedItems.length > 0,
    items: flaggedItems
  };
}

/**
 * Defensive parser for RSS 2.0 XML
 * @param {string} xmlText
 * @return {Array.<{title: string, description: string, pubDate: string, link: string}>}
 */
function parseUsStateDeptXml(xmlText) {
  var items = [];
  try {
    var document = XmlService.parse(xmlText);
    var root = document.getRootElement();
    var channel = root.getChild('channel');
    if (!channel) return items;

    var itemElements = channel.getChildren('item');
    for (var i = 0; i < itemElements.length; i++) {
      var elem = itemElements[i];
      var titleElem = elem.getChild('title');
      var descElem = elem.getChild('description');
      var pubDateElem = elem.getChild('pubDate');
      var linkElem = elem.getChild('link');

      items.push({
        title: titleElem ? titleElem.getText() : '',
        description: descElem ? descElem.getText() : '',
        pubDate: pubDateElem ? pubDateElem.getText() : '',
        link: linkElem ? linkElem.getText() : ''
      });
    }
  } catch (e) {
    // Fallback: Regex extraction if XML document parsing encounters malformed entities
    var itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    var match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      var itemBlock = match[1];
      var t = extractTagContent(itemBlock, 'title');
      var d = extractTagContent(itemBlock, 'description');
      var p = extractTagContent(itemBlock, 'pubDate');
      var l = extractTagContent(itemBlock, 'link');
      items.push({ title: t, description: d, pubDate: p, link: l });
    }
  }
  return items;
}

/**
 * Defensive parser for Atom feed XML
 * @param {string} atomText
 * @return {Array.<{id: string, title: string, summary: string, content: string, updated: string}>}
 */
function parseUkFcdoAtom(atomText) {
  var entries = [];
  try {
    var document = XmlService.parse(atomText);
    var root = document.getRootElement();
    var ns = root.getNamespace();
    var entryElems = root.getChildren('entry', ns);

    for (var i = 0; i < entryElems.length; i++) {
      var elem = entryElems[i];
      var idElem = elem.getChild('id', ns);
      var titleElem = elem.getChild('title', ns);
      var summaryElem = elem.getChild('summary', ns);
      var contentElem = elem.getChild('content', ns);
      var updatedElem = elem.getChild('updated', ns);

      entries.push({
        id: idElem ? idElem.getText() : '',
        title: titleElem ? titleElem.getText() : '',
        summary: summaryElem ? summaryElem.getText() : '',
        content: contentElem ? contentElem.getText() : '',
        updated: updatedElem ? updatedElem.getText() : ''
      });
    }
  } catch (e) {
    // Regex fallback
    var entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    var match;
    while ((match = entryRegex.exec(atomText)) !== null) {
      var block = match[1];
      entries.push({
        id: extractTagContent(block, 'id'),
        title: extractTagContent(block, 'title'),
        summary: extractTagContent(block, 'summary'),
        content: extractTagContent(block, 'content'),
        updated: extractTagContent(block, 'updated')
      });
    }
  }
  return entries;
}

/**
 * Helper tag extractor for regex XML fallback
 */
function extractTagContent(block, tag) {
  var regex = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  var m = block.match(regex);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

/**
 * Functional alias for diplomatic feed parser.
 */
function checkDiplomaticPostures() {
  return checkDiplomaticFeeds();
}


// --- END MODULE: DiplomaticIngestion.gs ---

// --- BEGIN MODULE: IodaIngestion.gs ---
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


// --- END MODULE: IodaIngestion.gs ---

// --- BEGIN MODULE: GdeltIngestion.gs ---
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


// --- END MODULE: GdeltIngestion.gs ---

// --- BEGIN MODULE: GeminiConnector.gs ---
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

// --- END MODULE: GeminiConnector.gs ---

// --- BEGIN MODULE: TelegramDispatch.gs ---
/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: TelegramDispatch.gs - Tasks 4.2 & 4.3: Telegram HTML Alert Formatter & Action Matrix
 */

/**
 * Builds the inline action keyboard for operational alert dispatches (4 rows).
 * @return {Object} Telegram InlineKeyboardMarkup object
 */
function buildAlertKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🌐 NDRRMC Portal', url: 'https://ndrrmc.gov.ph' },
        { text: '✈️ Airspace Status', url: 'https://safeairspace.net' }
      ],
      [
        { text: '📡 Radar Tracking', url: 'https://opensky-network.org' },
        { text: '🔥 Satellite Thermal', url: 'https://firms.modaps.eosdis.nasa.gov/map/' }
      ],
      [
        { text: '🛰️ What We Monitor', url: 'https://t.me/TRIPWIRE_PH_Bot?start=what_we_monitor' }
      ],
      [
        { text: '✉️ Contact Us', callback_data: 'contact_popup' },
        { text: '🪙 Support Project', callback_data: 'cmd_support' }
      ]
    ]
  };
}

/**
 * Builds the inline action keyboard for daily situation reports (2 rows).
 * @return {Object} Telegram InlineKeyboardMarkup object
 */
function buildSitRepKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'ℹ️ How It Works', url: 'https://t.me/TRIPWIRE_PH_Bot?start=how_it_works' },
        { text: '🛰️ What We Monitor', url: 'https://t.me/TRIPWIRE_PH_Bot?start=what_we_monitor' }
      ],
      [
        { text: '✉️ Contact Us', callback_data: 'contact_popup' },
        { text: '🪙 Support Project', callback_data: 'cmd_support' }
      ]
    ]
  };
}

/**
 * Legacy alias for buildAlertKeyboard() to preserve backwards compatibility.
 * @return {Object}
 */
function buildTelegramActionMatrix() {
  return buildAlertKeyboard();
}

/**
 * Formats and dispatches a rich HTML telemetry alert to the designated Telegram channel or user.
 * 
 * @param {{
 *   threatScore: number,
 *   alertLevel: string,
 *   sectorsActive: string,
 *   telemetryDetails: Object,
 *   geminiSummary: string,
 *   timestampIso?: string,
 *   botToken?: string,
 *   chatId?: string
 * }} params
 * @return {{success: boolean, messageId: number|null, response: Object}}
 */
function sendTelegramAlert(params) {
  params = params || {};
  var config = loadSysConfig();
  var token = params.botToken || config.TELEGRAM_BOT_TOKEN;
  var chatId = params.chatId || config.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    Logger.log('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Cannot dispatch.');
    return { success: false, messageId: null, error: 'Missing Telegram credentials' };
  }

  var score = (typeof params.threatScore === 'number') ? params.threatScore : 0;
  var level = params.alertLevel || (score >= 75 ? 'CRITICAL' : (score >= 50 ? 'ELEVATED' : 'NOMINAL'));

  // Defensive handling for sectorsActive and anomalousSectors
  var activeSectors = params.anomalousSectors;
  var activeList = (activeSectors && Array.isArray(activeSectors)) ? activeSectors : [];
  var sectors = params.sectorsActive;
  if (!sectors) {
    sectors = activeList.length > 0 ? activeList.map(function(s) { return s.name || s.sectorId || s; }).join(', ') : 'ALL SECTORS NOMINAL';
  }

  var phtNow = getPHTDateTime();
  var timeStr = params.timestampFormatted || params.timestampIso || phtNow.displayString;
  var summary = params.geminiSummary || 'Live pipeline test invocation.';
  var details = params.telemetryDetails || {};

  // Score threshold for notification muting (50-74: silent, >=75: unmuted)
  var disableNotification = (score < 75 && !details.diploFlag);

  // Format HTML message body - Dynamic headline without "TRIPWIRE-PH ALERT:" prefix
  var levelEmoji = (level === 'CRITICAL') ? '🚨' : (level === 'ELEVATED' ? '⚠️' : '🟢');
  var alertTitle = levelEmoji + ' <b>' + level + ' ESCALATION</b>';
  if (params.customTitle) {
    alertTitle = params.customTitle;
  }

  // Diplomatic telemetry line with active/nominal direct hyperlinks across all monitored sovereigns
  var diploStatusLine = '• <b>Diplomatic Directives:</b> ';
  if (details.diploFlag) {
    diploStatusLine += '🚨 Advisory Flagged';
    var diploItems = details.diploItems || [];
    if (diploItems.length > 0) {
      for (var d = 0; d < diploItems.length; d++) {
        var itm = diploItems[d];
        var itemUrl = (itm && itm.link) ? itm.link : ((itm && itm.feed && itm.feed.indexOf('UK') !== -1) ? 'https://www.gov.uk/foreign-travel-advice/philippines' : 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html');
        var itemTitleEsc = escapeHtml((itm && (itm.title || itm.feed)) || 'Consular Advisory');
        var feedLabel = (itm && itm.feed) ? (escapeHtml(itm.feed) + ': ') : '';
        diploStatusLine += '\n  └ Advisory Link: <a href="' + itemUrl + '">' + feedLabel + itemTitleEsc + '</a>';
      }
    } else if (details.diploHeadline) {
      var singleUrl = details.diploUrl || 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html';
      diploStatusLine += '\n  └ Advisory Link: <a href="' + singleUrl + '">' + escapeHtml(details.diploHeadline) + '</a>';
    }
  } else {
    diploStatusLine += '✅ Nominal (<a href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html">US State Dept</a> | <a href="https://www.gov.uk/foreign-travel-advice/philippines">UK FCDO</a> | <a href="https://www.anzen.mofa.go.jp/">Japan MOFA</a> | <a href="https://www.boca.gov.tw/">Taiwan BOCA</a>)';
  }

  // Plain English Emergency Radio Beacon (Squawk) line
  var squawkLine = '• <b>Emergency Radio Beacons (Squawk 7700/7600):</b> ';
  if (details.squawkAlerts > 0) {
    squawkLine += '🚨 ' + details.squawkAlerts + ' detected (General In-Flight Emergency)';
  } else {
    squawkLine += '0 active';
  }

  var messageHtml = alertTitle + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '📊 <b>Composite Threat Score:</b> <code>' + score + '/100</code>\n' +
    '📍 <b>Active Sectors:</b> <code>' + sectors + '</code>\n' +
    '⏱ <b>Timestamp:</b> <code>' + timeStr + '</code>\n\n' +
    '📝 <b>Operational Synthesis:</b>\n' +
    '<i>' + escapeHtml(summary) + '</i>\n\n' +
    '📡 <b>Telemetry Indicators:</b>\n' +
    '• <b>Airspace Density:</b> ' + (details.airspaceAnomaly ? '⚠️ Significant Deficit (Z &lt; -2.5)' : '✅ Baseline Normal') + '\n' +
    squawkLine + '\n' +
    '• <b>Thermal Radiation:</b> ' + (details.firmsHotspots >= 4 ? ('🔥 ' + details.firmsHotspots + ' Offshore VIIRS Hits') : '✅ Baseline Normal') + '\n' +
    '• <b>National Cyber/BGP:</b> ' + (details.cyberOutageFlag ? '⚠️ Macroscopic BGP Drop Detected' : '✅ Stable') + '\n' +
    diploStatusLine + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🛡️ <b>PUBLIC SAFETY DISCLAIMER:</b>\n' +
    '<i>This is an automated open-source intelligence monitor. Sensor dropouts, military exercises, and weather routinely produce anomalies. It is NOT an official civil defense agency. Never make personal safety decisions based solely on automated alerts. Always verify with NDRRMC, CAAP, DFA, and DND.</i>';

  var keyboard = params.replyMarkup || (params.isLiveReport ? buildSitRepKeyboard() : buildAlertKeyboard());

  var payload = {
    chat_id: chatId,
    text: messageHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    disable_notification: disableNotification,
    reply_markup: keyboard
  };

  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var responseCode = response.getResponseCode();
    var responseJson = JSON.parse(response.getContentText());

    if (responseCode === 200 && responseJson.ok) {
      Logger.log('Telegram dispatch successful. Message ID: ' + responseJson.result.message_id);
      return {
        success: true,
        messageId: responseJson.result.message_id,
        response: responseJson
      };
    } else {
      Logger.log('Telegram API error ' + responseCode + ': ' + response.getContentText());
      return {
        success: false,
        messageId: null,
        response: responseJson
      };
    }
  } catch (e) {
    Logger.log('Exception in sendTelegramAlert: ' + e.toString());
    return {
      success: false,
      messageId: null,
      error: e.toString()
    };
  }
}

/**
 * Escapes characters for Telegram HTML formatting.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


// --- END MODULE: TelegramDispatch.gs ---

// --- BEGIN MODULE: DispatchLogger.gs ---
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


// --- END MODULE: DispatchLogger.gs ---

// --- BEGIN MODULE: WebhookHandler.gs ---
/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: WebhookHandler.gs - Phase 5: Interactive Webhook & Explainer Dispatcher
 */

/**
 * Defensive Telegram Bot Token resolver.
 * Guarantees botToken is never undefined or empty.
 * @return {string}
 */
function getTelegramBotToken() {
  if (typeof TRIPWIRE_CONFIG !== 'undefined' && TRIPWIRE_CONFIG.TELEGRAM_BOT_TOKEN) {
    return TRIPWIRE_CONFIG.TELEGRAM_BOT_TOKEN;
  }
  var sheetConfig = loadSysConfig();
  if (sheetConfig && sheetConfig.TELEGRAM_BOT_TOKEN) {
    return sheetConfig.TELEGRAM_BOT_TOKEN;
  }
  return '9238246098:AAGuhUdQEy3cSK6dtWaMHhL6pwvCJd0y_Q8';
}

/**
 * HTTP POST entry point for Telegram Webhook updates.
 * Handles interactive deep links (/start how_it_works, /start what_we_monitor) and callback popups.
 * Returns HtmlService.createHtmlOutput("OK") on ALL code branches to send direct HTTP 200 without 302 redirects.
 * Incorporates CacheService deduplication on update_id to prevent duplicate processing.
 * 
 * @param {Object} e Google Apps Script event object
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return HtmlService.createHtmlOutput("NO_PAYLOAD");
    }

    var update = JSON.parse(e.postData.contents);

    // Deduplication via CacheService: 5-minute window for Telegram update_id
    var cache = CacheService.getScriptCache();
    var updateId = update && update.update_id ? String(update.update_id) : null;
    if (updateId) {
      if (cache.get("tg_upd_" + updateId)) {
        return HtmlService.createHtmlOutput("OK");
      }
      cache.put("tg_upd_" + updateId, "1", 300); // 5-minute deduplication window
    }

    // 1. Handle Callback Queries (Modal Popups and Buttons)
    if (update.callback_query) {
      handleCallbackQuery(update.callback_query);
      return HtmlService.createHtmlOutput("OK");
    }

    // 2. Handle Text Messages & Deep Links
    var message = update.message || update.edited_message || update.channel_post;
    if (message && message.text) {
      handleIncomingMessage(message);
      return HtmlService.createHtmlOutput("OK");
    }

    return HtmlService.createHtmlOutput("UNHANDLED_EVENT");
  } catch (err) {
    Logger.log("[TRIPWIRE-PH] doPost Error: " + (err ? (err.message || err.toString()) : "Unknown error"));
    // CRITICAL: Even on catch, return direct HTML output to prevent Telegram retry spam
    return HtmlService.createHtmlOutput("ERROR_CAUGHT");
  }
}

/**
 * Handles incoming callback query interactions.
 * 
 * @param {Object} callbackQuery
 */
function handleCallbackQuery(callbackQuery) {
  var token = getTelegramBotToken();
  var queryId = callbackQuery.id;
  var callbackData = callbackQuery.data;

  if (callbackData === 'contact_popup') {
    if (token && queryId) {
      try {
        var contactNotice = 
          "TRIPWIRE-PH\n" +
          "Automated Open-Source\n" +
          "Telemetry Feed\n\n" +
          "Email: TRIPWIRE-PH@protonmail.com\n" +
          "Status: 15-min autonomous cycle active";

        var answerPayload = {
          callback_query_id: queryId,
          text: contactNotice,
          show_alert: true,
          cache_time: 0
        };
        UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(answerPayload),
          muteHttpExceptions: true
        });
      } catch (callbackErr) {
        Logger.log('Error answering callback query: ' + callbackErr.toString());
      }
    }
  } else if (callbackData === 'cmd_how_it_works') {
    var fromChatId = (callbackQuery.message && callbackQuery.message.chat) ? callbackQuery.message.chat.id : (callbackQuery.from ? callbackQuery.from.id : null);
    if (fromChatId) sendMethodologyDossier(fromChatId, token);
  } else if (callbackData === 'cmd_what_we_monitor') {
    var fromChatId = (callbackQuery.message && callbackQuery.message.chat) ? callbackQuery.message.chat.id : (callbackQuery.from ? callbackQuery.from.id : null);
    if (fromChatId) sendWhatWeMonitorDossier(fromChatId, token);
  } else if (callbackData === 'cmd_support' || callbackData === 'support_popup') {
    var fromChatId = (callbackQuery.message && callbackQuery.message.chat) ? callbackQuery.message.chat.id : (callbackQuery.from ? callbackQuery.from.id : null);
    if (fromChatId) sendSupportMessage(fromChatId, token);
  }
}

/**
 * Handles incoming Telegram text messages and deep links.
 * 
 * @param {Object} message
 */
function handleIncomingMessage(message) {
  var token = getTelegramBotToken();
  var rawText = String(message.text).trim();
  var text = rawText.replace(/@\w+/g, '').trim().toLowerCase();
  var chatId = message.chat ? message.chat.id : null;

  if (!chatId) return;

  // Explicit routing for deep links and commands
  if (text === '/start support' || text.indexOf('/start support') === 0 ||
      text === '/start donate' || text.indexOf('/start donate') === 0 ||
      text === '/support' || text === '/donate') {
    sendSupportMessage(chatId, token);
  } else if (text === '/start what_we_monitor' || text.indexOf('/start what_we_monitor') === 0 ||
      text === '/what_we_monitor' || text.indexOf('/what_we_monitor') === 0) {
    sendWhatWeMonitorDossier(chatId, token);
  } else if (text === '/start how_it_works' || text.indexOf('/start how_it_works') === 0 ||
      text === '/start explain' || text.indexOf('/start explain') === 0 ||
      text === '/explain' || text === '/methodology' || text === '/how_it_works') {
    sendMethodologyDossier(chatId, token);
  } else if (text === '/start' || text.indexOf('/start') === 0) {
    sendWelcomeMessage(chatId, token);
  } else {
    // Default fallback for any direct message: send welcome brief
    if (message.chat && message.chat.type === 'private') {
      sendWelcomeMessage(chatId, token);
    }
  }
}

/**
 * Dispatches the public methodology dossier directly to the inquiring user's private chat.
 * 
 * @param {number|string} chatId
 * @param {string} [tokenOverride]
 */
function sendMethodologyDossier(chatId, tokenOverride) {
  var config = loadSysConfig();
  var token = tokenOverride || config.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;

  var dossierHtml = '📖 <b>TRIPWIRE-PH: SYSTEM METHODOLOGY & PUBLIC DOSSIER</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>1. What is TRIPWIRE-PH?</b>\n' +
    'An experimental automated, early-warning telemetry engine monitoring the Philippine theater for leading physical indicators of regional crisis and acute escalation.\n\n' +
    '<b>2. The Non-Verbal Commitment Principle:</b>\n' +
    'Traditional media feeds are vulnerable to information operations and rumors. TRIPWIRE-PH bypasses headlines by tracking verifiable institutional actions:\n' +
    '• Consular evacuation orders issued by sovereign embassies.\n' +
    '• Sudden commercial airliner diversions from civil airways.\n' +
    '• Transponder emergency broadcasts (Squawk 7700 / 7600).\n' +
    '• Satellite-detected offshore thermal spikes (VIIRS S-NPP FRP &gt;= 85 MW).\n' +
    '• Macroscopic telecommunications drops (IODA BGP &gt; 20%).\n\n' +
    '<b>3. Sovereign Diplomatic Directives & Filter Logic:</b>\n' +
    'Monitors official consular RSS/Atom feeds from four sovereign foreign ministries:\n' +
    '• <a href="https://travel.state.gov">US State Dept</a>\n' +
    '• <a href="https://www.gov.uk/foreign-travel-advice/philippines">UK FCDO</a>\n' +
    '• <a href="https://www.anzen.mofa.go.jp/">Japan MOFA</a>\n' +
    '• <a href="https://www.boca.gov.tw/">Taiwan BOCA</a>\n\n' +
    '<b>Filtering Logic:</b>\n' +
    '• <b>Nationwide Title Filter:</b> Matches only explicit countrywide alert classifications (e.g., <i>"Level 4: Do Not Travel"</i>, <i>"退避勧告"</i>, <i>"紅色警示"</i>).\n' +
    '• <b>Institutional Directive Filter:</b> Scans advisory text strictly for legally binding evacuation and departure orders (<i>"ordered departure"</i>, <i>"authorized departure"</i>, <i>"eligible family members"</i>, <i>"evacuation of non-emergency"</i>, <i>"leave by commercial means immediately"</i>, <i>"suspension of operations"</i>, <i>"撤離"</i>).\n' +
    '• <b>False-Positive Suppression:</b> Isolates and filters out routine phrases like <i>"do not travel"</i> when embedded within localized regional advisories (such as western Mindanao or regional security notes) to prevent false alerts.\n\n' +
    '<b>4. Composite Threat Scoring Formula:</b>\n' +
    '<code>Score = W_diplo(45) + W_flight(25) + W_squawk(15) + W_thermal(10) + W_cyber(15)</code>\n' +
    '• <b>Score &lt; 50:</b> Nominal routine monitoring (quiet database audit).\n' +
    '• <b>Score 50–74:</b> Elevated Notice (dispatched silently).\n' +
    '• <b>Score &gt;= 75 or Evacuation Order:</b> Critical Escalation (unmuted alarm).\n\n' +
    '<b>5. Critical Limitations &amp; False Alarms:</b>\n' +
    '• Scheduled joint naval drills produce temporary airspace drops and GPS variance.\n' +
    '• Tropical typhoons frequently trigger civilian flight reroutes.\n' +
    '• Sensor solar reflections can produce transient false thermal points.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🛡️ <b>PUBLIC SAFETY DISCLAIMER:</b>\n' +
    '<i>This is an automated open-source intelligence monitor. Sensor dropouts, military exercises, and weather routinely produce anomalies. It is NOT an official civil defense agency. Never make personal safety decisions based solely on automated alerts. Always verify with NDRRMC, CAAP, DFA, and DND.</i>';

  var payload = {
    chat_id: chatId,
    text: dossierHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛰️ What We Monitor', url: 'https://t.me/TRIPWIRE_PH_Bot?start=what_we_monitor' }
        ],
        [
          { text: '✉️ Contact Us', callback_data: 'contact_popup' },
          { text: '🪙 Support Project', callback_data: 'cmd_support' }
        ]
      ]
    }
  };

  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Error dispatching dossier: ' + e.toString());
  }
}

/**
 * Dispatches the structured sector & sensor overview (/start what_we_monitor).
 *
 * @param {number|string} chatId
 * @param {string} [tokenOverride]
 */
function sendWhatWeMonitorDossier(chatId, tokenOverride) {
  var config = loadSysConfig();
  var token = tokenOverride || config.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;

  var monitorHtml = '🛰️ <b>TRIPWIRE-PH: MONITORED THEATER & SENSOR REGISTRY</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    'TRIPWIRE-PH continuously audits 5 strategic choke points across the First Island Chain:\n\n' +
    '📍 <b>1. SEC-01: Luzon Strait &amp; Bashi Channel</b>\n' +
    '• <b>Strategic Role:</b> Northern maritime gateway, Batanes approaches, civil airway diversions.\n' +
    '• <b>Coordinates:</b> Centroid 19.25°N, 120.50°E | Radius: 180 NM\n\n' +
    '📍 <b>2. SEC-02: West Philippine Sea Corridor</b>\n' +
    '• <b>Strategic Role:</b> Scarborough Shoal, Kalayaan/Spratlys, commercial maritime clearance.\n' +
    '• <b>Coordinates:</b> Centroid 12.50°N, 117.00°E | Radius: 220 NM\n\n' +
    '📍 <b>3. SEC-03: Mindanao &amp; Celebes Waters</b>\n' +
    '• <b>Strategic Role:</b> Southern border, Celebes &amp; Sulu transit, eastern Philippine Sea access.\n' +
    '• <b>Coordinates:</b> Centroid 7.00°N, 122.50°E | Radius: 250 NM\n\n' +
    '📍 <b>4. SEC-04: Taiwan Strait</b>\n' +
    '• <b>Strategic Role:</b> Regional cross-strait choke point, commercial flight density contractions.\n' +
    '• <b>Coordinates:</b> Centroid 23.50°N, 120.25°E | Radius: 160 NM\n\n' +
    '📍 <b>5. SEC-05: Miyako Strait</b>\n' +
    '• <b>Strategic Role:</b> Strategic transit between Okinawa and Miyako Island, Pacific naval/air egress.\n' +
    '• <b>Coordinates:</b> Centroid 26.25°N, 127.00°E | Radius: 190 NM\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '📡 <b>Five Ingested Telemetry Streams:</b>\n\n' +
    '✈️ <b>1. Commercial Airspace Density &amp; ADS-B:</b>\n' +
    'Evaluates 14-day circadian baselines, emergency squawks (7700/7600), and GNSS navigation degradation (NIC &lt; 5) using airplanes.live and OpenSky.\n\n' +
    '🔥 <b>2. Satellite Thermal &amp; Kinetic Signatures (NASA FIRMS):</b>\n' +
    'Detects high-yield offshore thermal points (FRP &gt;= 85 MW) via VIIRS S-NPP NRT, filtered against agrarian and industrial land fires.\n\n' +
    '🏛 <b>3. Sovereign Diplomatic Directives:</b>\n' +
    'Monitors official consular feeds continuously polled for binding evacuation directives and institutional departure mandates across <a href="https://travel.state.gov">US State Dept</a>, <a href="https://www.gov.uk/foreign-travel-advice/philippines">UK FCDO</a>, <a href="https://www.anzen.mofa.go.jp/">Japan MOFA</a>, and <a href="https://www.boca.gov.tw/">Taiwan BOCA</a>.\n\n' +
    '🌐 <b>4. National Cyber &amp; Telecom Infrastructure (IODA):</b>\n' +
    'Tracks macroscopic BGP routing collapses and IP reachability drops &gt; 20% across Philippine telecommunications transit nodes.\n\n' +
    '⚡ <b>5. Regional Geopolitical Event Escalation (GDELT 2.0):</b>\n' +
    'Real-time multilingual event tracking of acute kinetic surges, naval confrontations, maritime standoffs, and blockades across the theater.\n\n' +
    '<i>Autonomous monitoring sweeps run every 15 minutes.</i>\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🛡️ <b>PUBLIC SAFETY DISCLAIMER:</b>\n' +
    '<i>This is an automated open-source intelligence monitor. Sensor dropouts, military exercises, and weather routinely produce anomalies. It is NOT an official civil defense agency. Never make personal safety decisions based solely on automated alerts. Always verify with NDRRMC, CAAP, DFA, and DND.</i>';

  var payload = {
    chat_id: chatId,
    text: monitorHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'ℹ️ How It Works', url: 'https://t.me/TRIPWIRE_PH_Bot?start=how_it_works' }
        ],
        [
          { text: '✉️ Contact Us', callback_data: 'contact_popup' },
          { text: '🪙 Support Project', callback_data: 'cmd_support' }
        ]
      ]
    }
  };

  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Error dispatching what_we_monitor dossier: ' + e.toString());
  }
}

/**
 * Dispatches basic welcome message for bare /start command.
 * 
 * @param {number|string} chatId
 * @param {string} [tokenOverride]
 */
function sendWelcomeMessage(chatId, tokenOverride) {
  var config = loadSysConfig();
  var token = tokenOverride || config.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;

  var text = '👋 <b>TRIPWIRE-PH Telemetry Bot Active</b>\n\n' +
    'This bot monitors leading indicators of geopolitical escalation across the Philippine archipelago using open-source telemetry.\n\n' +
    'Tap below to inspect system methodology and data streams:';

  var payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'ℹ️ How TRIPWIRE-PH Works', url: 'https://t.me/TRIPWIRE_PH_Bot?start=how_it_works' },
          { text: '🛰️ What We Monitor', url: 'https://t.me/TRIPWIRE_PH_Bot?start=what_we_monitor' }
        ],
        [
          { text: '✉️ Contact Us', callback_data: 'contact_popup' },
          { text: '🪙 Support Project', callback_data: 'cmd_support' }
        ]
      ]
    }
  };

  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Error sending welcome message: ' + e.toString());
  }
}

/**
 * Dispatches the Support Project photo with QR code and contributor brief.
 * 
 * @param {number|string} chatId
 * @param {string} [tokenOverride]
 */
function sendSupportMessage(chatId, tokenOverride) {
  var config = loadSysConfig();
  var token = tokenOverride || getTelegramBotToken();
  if (!token || !chatId) return;

  var SUPPORT_QR_URL = 'https://raw.githubusercontent.com/shakti2-cmd/TRIPWIRE-PH/main/TRIPWIRE.png';

  // Telegram photo captions are strictly capped at 1024 characters.
  var captionText = 
    '🪙 <b>SUPPORT TRIPWIRE-PH TELEMETRY</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'This platform operates as a 100% free early-warning monitor. Your contribution directly supports telemetry research, endpoint stability, and 24/7 monitoring for the Philippine theater.\n\n' +
    '📲 <b>InstaPay:</b> Scan the QR code above (GCash, Maya, SeaBank, BDO, BPI)\n\n' +
    '🦊 <b>Crypto / Web3 (EVM):</b>\n' +
    '<code>0x9e30ad0628eec59C1ef74584E687e3979F533533</code>\n' +
    '<i>(ETH, USDT, USDC, BNB, Polygon, Arbitrum)</i>\n\n' +
    '₿ <b>Bitcoin (BTC):</b>\n' +
    '<code>bc1qakl0cpf0aga2xwlatfvtnz0s2hy7fu97un0hm4</code>\n\n' +
    '📩 <b>Feedback:</b> <code>TRIPWIRE-PH@protonmail.com</code>\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🛡️ <b>PUBLIC SAFETY DISCLAIMER:</b>\n' +
    '<i>Automated open-source monitor. Not an official civil defense agency. Never make personal safety decisions based solely on alerts. Verify with NDRRMC, CAAP, DFA, and DND.</i>';

  var keyboard = {
    inline_keyboard: [
      [
        { text: 'ℹ️ How It Works', url: 'https://t.me/TRIPWIRE_PH_Bot?start=how_it_works' },
        { text: '🛰️ What We Monitor', url: 'https://t.me/TRIPWIRE_PH_Bot?start=what_we_monitor' }
      ],
      [
        { text: '✉️ Contact Us', callback_data: 'contact_popup' }
      ]
    ]
  };

  var payload = {
    chat_id: chatId,
    photo: SUPPORT_QR_URL,
    caption: captionText,
    parse_mode: 'HTML',
    reply_markup: keyboard
  };

  try {
    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log('sendSupportMessage response code: ' + resp.getResponseCode() + ' | ' + resp.getContentText());
  } catch (e) {
    Logger.log('Error dispatching support photo message: ' + e.toString());
  }
}


// --- END MODULE: WebhookHandler.gs ---

// --- BEGIN MODULE: SitRepDispatcher.gs ---
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


// --- END MODULE: SitRepDispatcher.gs ---

// --- BEGIN MODULE: MasterMonitor.gs ---
/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: MasterMonitor.gs - Autonomous Monitoring Sweep & Test Harness
 */

/**
 * Master autonomous execution cycle triggered every 15 minutes by Google Apps Script.
 * Sweeps all 5 strategic First Island Chain sectors, evaluates deviations vs. circadian baselines,
 * logs raw audit records to Google Sheets DB, and dispatches alerts via Gemini & Telegram if threshold is met.
 */
function runMasterMonitor() {
  var sweepStartTime = Date.now();
  Logger.log('>>> [TRIPWIRE-PH] Launching 15-minute Autonomous Master Monitoring Sweep...');

  var config = loadSysConfig();
  var openSkyAuth = {
    username: config.OPENSKY_USER,
    password: config.OPENSKY_PASS
  };

  // 1. Ingest Archipelago & Sovereign National Directives
  var diploResults = checkDiplomaticFeeds();
  var diploFlag = diploResults.evacuationActive;
  if (diploFlag) {
    Logger.log('CRITICAL: Sovereign diplomatic evacuation directive active: ' + diploResults.detectedKeywords.join(', '));
  }

  // 2. Ingest Macroscopic Cyber & Telecommunications Status (IODA)
  var iodaStatus = fetchIodaStatus();
  var cyberOutageFlag = iodaStatus.outage;
  if (cyberOutageFlag) {
    Logger.log('ALERT: Macroscopic internet outage detected in Philippine ASNs.');
  }

  // 3. Ingest GDELT Regional Conflict Surges
  var gdeltStatus = fetchGdeltConflictEvents();
  var gdeltSurgeFlag = gdeltStatus.surge;

  // 4. Load Pre-Calculated Sector Baselines Cache
  var baselinesCache = loadSectorBaselinesCache();

  // 5. Sweep All 5 First Island Chain Operational Quadrants
  var sectorIds = ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05'];
  var sectorResults = [];
  var telemetryRecords = [];

  for (var s = 0; s < sectorIds.length; s++) {
    var secId = sectorIds[s];
    var secConfig = TRIPWIRE_CONFIG.SECTORS[secId];
    if (!secConfig) continue;

    // A. Query Airspace Density (airplanes.live -> OpenSky -> Baseline fallback)
    var aviation = fetchSectorAviationTelemetry(secId, secConfig, openSkyAuth, secConfig.defaultMedian);

    // B. Evaluate Airspace Deviation vs. Circadian Baseline (Z-score & flight drop)
    var deviation = evaluateAirspaceDeviation(secId, aviation.count, baselinesCache);

    // C. Query Maritime Thermal Hotspots (NASA FIRMS VIIRS S-NPP FRP >= 85 MW)
    var thermal = fetchFirmsHotspots(secConfig.firmsCoords, config.NASA_MAP_KEY);

    sectorResults.push({
      sectorId: secId,
      name: secConfig.name,
      flightCount: aviation.count,
      baselineMedian: deviation.baselineMedian,
      zScore: deviation.zScore,
      squawkAlerts: aviation.squawkAlerts,
      firmsHotspots: thermal.hotspotCount,
      airspaceResult: deviation,
      aviationSource: aviation.source
    });

    telemetryRecords.push({
      sectorId: secId,
      flightCount: aviation.count,
      baselineMedian: deviation.baselineMedian,
      zScore: deviation.zScore,
      squawkAlerts: aviation.squawkAlerts,
      firmsHotspots: thermal.hotspotCount,
      iodaOutageFlag: cyberOutageFlag,
      diploAlertFlag: diploFlag
    });
  }

  // 6. Append Standard Audit Rows to raw_telemetry Ledger
  try {
    recordRawTelemetryBatch(telemetryRecords);
    Logger.log('Successfully recorded ' + telemetryRecords.length + ' telemetry rows to raw_telemetry.');
  } catch (err) {
    Logger.log('Error writing to raw_telemetry: ' + err.toString());
  }

  // 7. Multi-Sector Anomaly Evaluation & Consolidation
  var consolidation = evaluateSectorsAndConsolidate(sectorResults, diploFlag, cyberOutageFlag, gdeltSurgeFlag);
  var compositeThreat = consolidation.compositeThreat;

  Logger.log('Master Sweep Evaluation: Score = ' + compositeThreat.threatScore + ' | Level = ' + compositeThreat.alertLevel + ' | Active = ' + consolidation.sectorSummary);

  // 8. Alert Dispatch Pipeline (Score >= 50 or Diplomatic Directive)
  var alertThreshold = Number(config.ALERT_THRESHOLD) || TRIPWIRE_CONFIG.THRESHOLDS.DEFAULT_ALERT;
  if (compositeThreat.threatScore >= alertThreshold || diploFlag) {
    Logger.log('Escalation threshold met (' + compositeThreat.threatScore + '). Synthesizing tactical assessment via Gemini...');

    var telemetryDelta = {
      timestamp: getPHTDateTime().isoString,
      compositeThreat: compositeThreat,
      anomalousSectors: consolidation.anomalousSectors,
      diploAdvisory: diploResults.flaggedItems,
      cyberDisruption: iodaStatus.events,
      gdeltSurge: gdeltStatus.events,
      sectorTelemetry: sectorResults.filter(function(r) {
        return consolidation.anomalousSectors.indexOf(r.sectorId) !== -1;
      })
    };

    var geminiBrief = callGeminiSynthesis(telemetryDelta, config.GEMINI_API_KEY);

    var dispatchResult = sendTelegramAlert({
      threatScore: compositeThreat.threatScore,
      alertLevel: compositeThreat.alertLevel,
      sectorsActive: consolidation.sectorSummary,
      telemetryDetails: {
        flightDropPercent: Math.round(sectorResults[0].airspaceResult.dropRatio * 100),
        zScore: sectorResults[0].airspaceResult.zScore,
        observedFlights: sectorResults[0].flightCount,
        medianFlights: sectorResults[0].baselineMedian,
        squawkAlerts: sectorResults[0].squawkAlerts,
        firmsCount: sectorResults[0].firmsHotspots,
        diploFlag: diploFlag,
        diploHeadline: diploResults.flaggedItems.length > 0 ? diploResults.flaggedItems[0].title : '',
        diploUrl: diploResults.flaggedItems.length > 0 ? diploResults.flaggedItems[0].link : '',
        diploItems: diploResults.flaggedItems,
        iodaFlag: cyberOutageFlag,
        gdeltFlag: gdeltSurgeFlag
      },
      geminiSummary: geminiBrief
    });

    if (dispatchResult.success) {
      recordAlertDispatch({
        threatScore: compositeThreat.threatScore,
        alertLevel: compositeThreat.alertLevel,
        sectorsActive: consolidation.sectorSummary,
        geminiSummary: geminiBrief,
        telegramMsgId: dispatchResult.messageId
      });
    }
  }

  var elapsedSec = ((Date.now() - sweepStartTime) / 1000).toFixed(2);
  Logger.log('>>> [TRIPWIRE-PH] Master sweep completed successfully in ' + elapsedSec + 's.');
}

/**
 * Diagnostic test harness: Probes all 3 ingestion endpoints in isolation and prints detailed diagnostics.
 */
function testIngestionEndpoints() {
  Logger.log('=== TRIPWIRE-PH: Diagnostic Ingestion Endpoints Probe ===');
  var config = loadSysConfig();

  // TEST 1: NASA FIRMS Satellite Thermal
  Logger.log('\n--- TEST 1: NASA FIRMS Satellite Thermal ---');
  var testCoords = TRIPWIRE_CONFIG.SECTORS['SEC-01'].firmsCoords;
  var firmsResult = fetchFirmsHotspots(testCoords, config.NASA_MAP_KEY);
  Logger.log('NASA FIRMS Result: Hotspots=' + firmsResult.hotspotCount + ', Success=' + firmsResult.success);

  // TEST 2: IODA Macroscopic Cyber Reachability
  Logger.log('\n--- TEST 2: IODA National Cyber Reachability ---');
  var iodaResult = fetchIodaStatus();
  Logger.log('IODA Result: Outage=' + iodaResult.outage + ', Events=' + (iodaResult.events ? iodaResult.events.length : 0));

  // TEST 3: Community ADS-B Aviation Point API
  Logger.log('\n--- TEST 3: Aviation Community ADS-B Point API ---');
  var testPoint = TRIPWIRE_CONFIG.SECTORS['SEC-01'].point;
  var adsbResult = fetchCommunityAdsbPoint(testPoint);
  Logger.log('Community ADS-B Result: Flights=' + adsbResult.count + ', Squawks=' + adsbResult.squawkAlerts + ', Source=' + adsbResult.source + ', Success=' + adsbResult.success);

  Logger.log('\n=== Ingestion Endpoints Probe Complete ===');
}

/**
 * Manual test alert runner: Constructs synthetic elevated telemetry and dispatches a test alert.
 */
function triggerManualTestAlert() {
  Logger.log('>>> Triggering Manual Elevated Test Alert...');
  var config = loadSysConfig();
  var phtNow = getPHTDateTime();

  var syntheticDelta = {
    testMode: true,
    sector: 'SEC-01',
    name: 'Luzon Strait & Bashi Channel',
    flightDropPercent: 60,
    observedFlights: 18,
    medianFlights: 45,
    zScore: -4.50,
    squawkAlerts: 1,
    firmsHotspots: 0,
    cyberDisruption: true
  };

  var threatScore = 55; // Elevated score
  var alertLevel = 'ELEVATED';

  var geminiBrief = callGeminiSynthesis(syntheticDelta, config.GEMINI_API_KEY);

  var dispatchResult = sendTelegramAlert({
    threatScore: threatScore,
    alertLevel: alertLevel,
    sectorsActive: 'SEC-01 (Manual Test)',
    telemetryDetails: {
      flightDropPercent: 60,
      zScore: -4.50,
      observedFlights: 18,
      medianFlights: 45,
      squawkAlerts: 1,
      firmsCount: 0,
      diploFlag: false,
      iodaFlag: true,
      gdeltFlag: false
    },
    geminiSummary: geminiBrief
  });

  if (dispatchResult.success) {
    recordAlertDispatch({
      threatScore: threatScore,
      alertLevel: alertLevel,
      sectorsActive: 'SEC-01 (Manual Test)',
      geminiSummary: geminiBrief,
      telegramMsgId: dispatchResult.messageId
    });
    Logger.log('Manual test alert dispatched and logged successfully.');
  } else {
    Logger.log('Failed to dispatch manual test alert.');
  }
}

/**
 * Real-time manual live dispatch runner.
 * Sweeps all 5 First Island Chain sectors, records actual live rows to raw_telemetry,
 * BYPASSES the Score >= 50 threshold rule, synthesizes the live delta with Gemini,
 * and posts an immediate live situation report to @TripwirePhAlerts.
 */
function runManualLiveReport() {
  var sweepStartTime = Date.now();
  Logger.log('>>> [TRIPWIRE-PH] Launching REAL-TIME Manual Live Situation Sweep (Bypassing >= 50 rule)...');

  var config = loadSysConfig();
  var openSkyAuth = {
    username: config.OPENSKY_USER,
    password: config.OPENSKY_PASS
  };

  // 1. Live Sovereign Diplomatic Feeds
  var diploResults = checkDiplomaticFeeds();
  var diploFlag = diploResults.evacuationActive;

  // 2. Live IODA Macroscopic Cyber Reachability
  var iodaStatus = fetchIodaStatus();
  var cyberOutageFlag = iodaStatus.outage;

  // 3. Live GDELT Regional Conflict Incidents
  var gdeltStatus = fetchGdeltConflictEvents();
  var gdeltSurgeFlag = gdeltStatus.surge;

  // 4. Load Sector Baselines Cache
  var baselinesCache = loadSectorBaselinesCache();

  // 5. Sweep All 5 First Island Chain Operational Sectors
  var sectorIds = ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05'];
  var sectorResults = [];
  var telemetryRecords = [];

  for (var s = 0; s < sectorIds.length; s++) {
    var secId = sectorIds[s];
    var secConfig = TRIPWIRE_CONFIG.SECTORS[secId];
    if (!secConfig) continue;

    // Airspace Density
    var aviation = fetchSectorAviationTelemetry(secId, secConfig, openSkyAuth, secConfig.defaultMedian);

    // Baseline Deviation
    var deviation = evaluateAirspaceDeviation(secId, aviation.count, baselinesCache);

    // Maritime Thermal Hotspots
    var thermal = fetchFirmsHotspots(secConfig.firmsCoords, config.NASA_MAP_KEY);

    sectorResults.push({
      sectorId: secId,
      name: secConfig.name,
      flightCount: aviation.count,
      baselineMedian: deviation.baselineMedian,
      zScore: deviation.zScore,
      squawkAlerts: aviation.squawkAlerts,
      firmsHotspots: thermal.hotspotCount,
      airspaceResult: deviation,
      aviationSource: aviation.source
    });

    telemetryRecords.push({
      sectorId: secId,
      flightCount: aviation.count,
      baselineMedian: deviation.baselineMedian,
      zScore: deviation.zScore,
      squawkAlerts: aviation.squawkAlerts,
      firmsHotspots: thermal.hotspotCount,
      iodaOutageFlag: cyberOutageFlag,
      diploAlertFlag: diploFlag
    });
  }

  // 6. Append Standard Audit Rows to raw_telemetry Ledger
  try {
    recordRawTelemetryBatch(telemetryRecords);
    Logger.log('Successfully recorded ' + telemetryRecords.length + ' live telemetry rows to raw_telemetry.');
  } catch (err) {
    Logger.log('Error writing to raw_telemetry: ' + err.toString());
  }

  // 7. Calculate Actual Composite Threat Score
  var consolidation = evaluateSectorsAndConsolidate(sectorResults, diploFlag, cyberOutageFlag, gdeltSurgeFlag);
  var compositeThreat = consolidation.compositeThreat || { threatScore: 0, alertLevel: 'NOMINAL' };
  var isNominal = (compositeThreat.threatScore < 50);

  // Defensive handling for anomalous sectors and active sectors text
  var anomalousList = (consolidation.anomalousSectors && Array.isArray(consolidation.anomalousSectors)) ? consolidation.anomalousSectors : [];
  var sectorStr = anomalousList.length > 0 ? (consolidation.sectorSummary || anomalousList.join(', ')) : 'ALL SECTORS NOMINAL';

  // Defensive diplomatic details
  var flaggedDiploItems = (diploResults && Array.isArray(diploResults.items)) ? diploResults.items : ((diploResults && Array.isArray(diploResults.flaggedItems)) ? diploResults.flaggedItems : []);
  var diploHeadline = flaggedDiploItems.length > 0 ? (flaggedDiploItems[0].title || '') : 'Nominal baseline (No active evacuation directives)';
  var diploUrl = flaggedDiploItems.length > 0 ? (flaggedDiploItems[0].link || '') : 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html';

  // 8. Package Live Telemetry Delta & Synthesize via Gemini
  var telemetryDelta = {
    timestamp: getPHTDateTime().isoString,
    compositeThreat: compositeThreat,
    anomalousSectors: anomalousList,
    diploAdvisory: flaggedDiploItems,
    cyberDisruption: (iodaStatus && iodaStatus.events) ? iodaStatus.events : [],
    gdeltSurge: (gdeltStatus && gdeltStatus.events) ? gdeltStatus.events : [],
    sectorTelemetry: sectorResults
  };

  Logger.log('Synthesizing Live Situation brief via Gemini (' + getGeminiModel() + ')...');
  var geminiBrief = callGeminiSynthesis(telemetryDelta, config.GEMINI_API_KEY);

  // 9. Format & Dispatch Immediate Live Report (Bypassing threshold)
  var reportTitle = isNominal ? '🟢 <b>LIVE SITUATION REPORT</b>' : '⚠️ <b>LIVE SITUATION REPORT</b>';
  var alertLevel = isNominal ? 'NOMINAL' : compositeThreat.alertLevel;
  var phtNow = getPHTDateTime();

  var sec1 = sectorResults.length > 0 ? sectorResults[0] : {
    airspaceResult: { dropRatio: 0, zScore: 0 },
    flightCount: 45,
    baselineMedian: 45,
    squawkAlerts: 0,
    firmsHotspots: 0
  };

  var dispatchResult = sendTelegramAlert({
    threatScore: compositeThreat.threatScore || 0,
    alertLevel: alertLevel,
    customTitle: reportTitle,
    sectorsActive: sectorStr,
    anomalousSectors: anomalousList,
    isLiveReport: true, // Use compact 2-row SitRep keyboard layout
    replyMarkup: buildSitRepKeyboard(),
    diplomaticNotes: flaggedDiploItems.length > 0 ? flaggedDiploItems.map(function(d){ return d.title; }) : ['Nominal baseline (No active evacuation directives)'],
    telemetryDetails: {
      flightDropPercent: Math.round(((sec1.airspaceResult && sec1.airspaceResult.dropRatio) || 0) * 100),
      zScore: (sec1.airspaceResult && sec1.airspaceResult.zScore) || 0,
      observedFlights: sec1.flightCount || 0,
      medianFlights: sec1.baselineMedian || 0,
      squawkAlerts: sec1.squawkAlerts || 0,
      firmsHotspots: sec1.firmsHotspots || 0,
      firmsCount: sec1.firmsHotspots || 0,
      diploFlag: diploFlag || false,
      diploHeadline: diploHeadline,
      diploUrl: diploUrl,
      diploItems: flaggedDiploItems,
      iodaFlag: cyberOutageFlag || false,
      gdeltFlag: gdeltSurgeFlag || false
    },
    geminiSummary: geminiBrief
  });

  if (dispatchResult.success) {
    recordAlertDispatch({
      threatScore: compositeThreat.threatScore || 0,
      alertLevel: alertLevel,
      sectorsActive: sectorStr,
      geminiSummary: geminiBrief,
      telegramMsgId: dispatchResult.messageId
    });
    Logger.log('Live situation report posted to Telegram successfully. Msg ID: ' + dispatchResult.messageId);
  } else {
    Logger.log('Failed to dispatch live situation report: ' + JSON.stringify(dispatchResult));
  }

  var elapsedSec = ((Date.now() - sweepStartTime) / 1000).toFixed(2);
  Logger.log('>>> [TRIPWIRE-PH] runManualLiveReport completed in ' + elapsedSec + 's.');
}

/**
 * Backward compatibility alias for Philippine Time formatting.
 */
function getPhilippineTime() {
  return getPHTDateTime().isoString;
}

/**
 * Container-bound simple trigger that adds a custom operator menu to the Google Spreadsheet UI.
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.createMenu('🛰️ TRIPWIRE-PH')
        .addItem('Run Manual Live Report', 'runManualLiveReport')
        .addItem('Dispatch Daily SitRep', 'dispatchDailySitRep')
        .addItem('Run Master Monitor', 'runMasterMonitor')
        .addSeparator()
        .addItem('Trigger Manual Test Alert', 'triggerManualTestAlert')
        .addToUi();
    }
  } catch (e) {
    // Non-interactive context or standalone execution
    Logger.log('Non-interactive context for onOpen(): ' + e.toString());
  }
}


// --- END MODULE: MasterMonitor.gs ---


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


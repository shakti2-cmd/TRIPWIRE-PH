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


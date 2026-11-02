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


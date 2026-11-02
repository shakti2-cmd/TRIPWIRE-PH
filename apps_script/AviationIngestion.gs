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


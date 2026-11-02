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


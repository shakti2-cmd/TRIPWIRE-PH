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


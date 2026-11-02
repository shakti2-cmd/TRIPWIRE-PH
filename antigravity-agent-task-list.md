# Antigravity Task Matrix: TRIPWIRE-PH Implementation

This document serves as the machine-executable task checklist for autonomous coding agents (Google Antigravity / MeetilyCoPilot). Complete each task sequentially and verify against specifications before proceeding.

---

## Phase 1: Environment & Ledger Setup

- [x] **Task 1.1: Verify Google Sheets MCP Connection**
  - Authenticate using service account: `antigravity-bot@tripwire-ph.iam.gserviceaccount.com`.
  - Locate or create `TRIPWIRE-PH_DB_Master`.
- [x] **Task 1.2: Scaffold Database Tabs**
  - Create tab: `sys_config` with key-value pairs matching `DATA_DICTIONARY.md`.
  - Create tab: `raw_telemetry` with standard 9-column audit header.
  - Create tab: `sector_baselines` with circadian day/hour lookup columns.
  - Create tab: `alert_dispatches` with UUID and dispatch tracking columns.
  - Create tab: `diplomatic_audit` with hash registry columns.
- [x] **Task 1.3: Populate Default Baselines**
  - Seed `sector_baselines` with initial synthetic estimates (Luzon: 45, WPS: 30, Mindanao: 25) across all 24 hourly buckets.

---

## Phase 2: Ingestion Modules (Google Apps Script)

- [x] **Task 2.1: OpenSky Network Collector**
  - Implement `fetchOpenSkySector(bbox, auth)` with basic HTTP authentication.
  - Extract: Total airborne count, squawk `7700` count, squawk `7600` count, and count of aircraft with `NIC < 5`.
  - Ensure error handling returns zeroed fallback objects without terminating execution.
- [x] **Task 2.2: NASA FIRMS Thermal Collector**
  - Implement `fetchFirmsHotspots(bbox, mapKey)` querying `VIIRS_SNPP_NRT`.
  - Parse CSV response; filter out land-based industrial coordinates; count maritime hits where $\text{FRP} \ge 85\text{ MW}$.
- [x] **Task 2.3: Sovereign Diplomatic Feed Parser**
  - Implement `checkDiplomaticFeeds()` querying US State Dept RSS and UK FCDO Atom.
  - Filter items containing `"Philippines"`.
  - Execute deterministic regex for keywords: `"ordered departure"`, `"authorized departure"`, `"eligible family members"`, `"evacuation of non-emergency"`, `"leave by commercial means immediately"`.
  - Cross-check against `diplomatic_audit` tab to prevent alerting on previously processed GUIDs.
- [x] **Task 2.4: IODA National Connectivity Collector**
  - Implement `fetchIodaStatus()` querying `entityType=country&entityCode=PH`.
  - Flag positive if active macroscopic BGP routing drop or IP reachability anomaly $>20\%$ is reported.

---

## Phase 3: Heuristic Baseline & Threat Scoring

- [x] **Task 3.1: Circadian Deviation Engine**
  - Calculate current Philippine Standard Time (UTC+8) day-of-week and hour.
  - Query `sector_baselines` for expected median ($\mu$) and deviation ($\sigma$).
  - Compute $Z$-score: $Z = (X_{\text{observed}} - \mu) / \sigma$.
  - Flag airspace anomaly if $Z < -2.5$ or if observed count is $< 50\%$ of median.
- [x] **Task 3.2: Composite Threat Scoring Function**
  - Implement formula: $S = W_{\text{diplo}} (45) + W_{\text{flight}} (25) + W_{\text{squawk}} (15) + W_{\text{thermal}} (10) + W_{\text{cyber}} (15)$.
  - Cap maximum threat score at $100$.
- [x] **Task 3.3: Sector Batching & Consolidation**
  - Collect anomaly status across `SEC-01`, `SEC-02`, and `SEC-03`.
  - If anomalous sector count $\ge 2$, route to consolidated dispatch pipeline rather than generating individual notices.

---

## Phase 4: Gemini Synthesis & Telegram Dispatch

- [x] **Task 4.1: Google Gemini 2.5 Flash Connector**
  - Build `callGeminiSynthesis(telemetryDelta)` targeting `v1beta/models/gemini-2.5-flash:generateContent`.
  - Provide structured numerical prompt; enforce a strict 2–3 sentence operational summary focusing on civilian transit impact and defense posture.
- [x] **Task 4.2: Telegram HTML Message Builder**
  - Implement message templating according to `TRIPWIRE_PH_SYSTEM_SPEC.md`.
  - Append mandatory public safety disclaimer.
  - Configure `disable_notification: true` for scores $50–74$; `disable_notification: false` for scores $\ge 75$.
- [x] **Task 4.3: Inline Keyboard Action Matrix**
  - Attach clickable URL buttons: NDRRMC Portal, Safe Airspace, OpenSky Radar, NASA FIRMS.
  - Attach deep-link explainer button: `https://t.me/<BOT_USERNAME>?start=how_it_works`.
- [x] **Task 4.4: Dispatch Logger**
  - Append completed alert records into `alert_dispatches` tab to maintain auditability.

---

## Phase 5: Interactive Webhook & Deep Linking

- [x] **Task 5.1: Apps Script `doPost` Handler**
  - Parse incoming Telegram JSON updates.
  - Extract message text and sender `chat.id`.
- [x] **Task 5.2: Explainer Dispatcher**
  - Match command `/start how_it_works` or `/start explain`.
  - Return formatted HTML dossier from `METHODOLOGY_EXPLAINER.md` directly to user's private chat.

---

## Phase 6: End-to-End Verification & Dry Runs

- [x] **Test Case 1 (Nominal):** Verify script runs quietly, appends rows to `raw_telemetry`, and exits without sending Telegram messages.
- [x] **Test Case 2 (Elevated):** Inject mock 60% flight drop in `SEC-01`; verify silent Telegram alert is delivered.
- [x] **Test Case 3 (Critical Multi-Sector):** Inject mock diplomatic evacuation + flight drop in `SEC-01` & `SEC-02`; verify unmuted consolidated alert is dispatched with correct inline buttons.
- [x] **Test Case 4 (Webhook):** Test tapping the Telegram deep-link button; verify explainer DM is received.

---

## Phase 7: System Expansion & Theater Hardening

- [x] **Task 7.1: Multi-Source Aviation Ingestion Engine**
  - Implement zero-credential community ADS-B polling (`airplanes.live` / `adsb.one`) as primary collector.
  - Implement fast OpenSky fallback (<3s) to baseline median on connection drops or timeouts.
- [x] **Task 7.2: First Island Chain Sector Expansion**
  - Extend coverage to 5 sectors: `SEC-01` (Luzon/Bashi), `SEC-02` (WPS), `SEC-03` (Mindanao), `SEC-04` (Taiwan Strait), `SEC-05` (Miyako Strait).
  - Seed 336 new baseline hourly matrix rows (840 total rows) in `sector_baselines`.
- [x] **Task 7.3: Taiwan Diplomatic & GDELT Tripwires**
  - Monitor Taiwan & Taipei consular travel alerts across US State Dept and UK FCDO.
  - Query GDELT 2.0 Doc API for regional military escalation and live-fire surge events (+10 pts).
- [x] **Task 7.4: Midday Daily Theater SitRep Engine**
  - Implement `dispatchDailySitRep()` compiling 24h sector flight trends and calm Gemini synthesis.
  - Automate 12:00 PM PHT trigger via `createDailySitRepTrigger()`.
- [x] **Task 7.5: Interactive Dossier Webhook Expansion**
  - Added `[ 🛰️ What We Monitor ]` deep-link action button (`start=what_we_monitor`).
  - Implemented `sendWhatWeMonitorDossier()` delivering First Island Chain theater specifications directly to Telegram users.

---

## Phase 8: Message Formatting, Telemetry Link Enrichment & Contact Integration

- [x] **Task 8.1: Headline & Timestamp Refactoring**
  - Removed "TRIPWIRE-PH ALERT:" prefix from dispatches; dynamic title formatted as `⚠️ ELEVATED ESCALATION` / `🚨 CRITICAL ESCALATION`.
  - Standardized timestamps to Philippine operational time: `YYYY-MM-DD (hh:mm A PHT)`.
  - Updated operational assessment title to `📝 Operational Synthesis:`.
- [x] **Task 8.2: Public Safety Disclaimer Standardization**
  - Updated footer title to `🛡️ PUBLIC SAFETY DISCLAIMER:`.
  - Updated body verbatim to mandatory official civil defense disclaimer text.
- [x] **Task 8.3: Daily Midday SitRep Title Modernization**
  - Simplified SitRep header to `🟢 DAILY SITREP`.
- [x] **Task 8.4: Telemetry Source Link Enrichment**
  - Implemented direct hyperlinks to US State Department Philippines Advisory and UK FCDO Foreign Travel Advice under nominal conditions.
  - Linked specific advisory article titles directly to source URLs when evacuation directives are active.
- [x] **Task 8.5: Contact Us Action Button**
  - Added `[ ✉️ Contact Us ]` to inline action keyboard matrix across alert dispatches, dossiers, and SitReps.
- [x] **Task 8.6: Airplanes.live Prioritization & Diagnostic Probe**
  - Enforced `airplanes.live` / `adsb.one` as the primary collector in `fetchSectorAviationTelemetry()`.
  - Updated `testIngestionEndpoints()` TEST 3 to query community ADS-B directly.

---

## Phase 9: Aviation Probe Fix, Plain English Jargon Cleanup & Multi-Sovereign Diplomatic Expansion

- [x] **Task 9.1: Fix Aviation Diagnostic Probe (`testIngestionEndpoints`)**
  - Resolved `radius` vs `radiusNm` and coordinate object pass-through in `fetchCommunityAdsbPoint()`.
  - Added HTTP status code and response diagnostic logging in TEST 3.
- [x] **Task 9.2: Plain-English Terminology Refactoring**
  - Replaced technical shorthand `ac` with `flights` across daily SitRep sector breakdowns.
  - Replaced raw squawk text with `• Emergency Radio Beacons (Squawk 7700/7600): 0 active` and added descriptive emergency classifications when detected.
- [x] **Task 9.3: Diplomatic Ingestion Expansion (Japan MOFA, Taiwan BOCA & Australia DFAT)**
  - Added Japan MOFA Overseas Safety RSS and Taiwan BOCA Consular Advisory RSS feeds.
  - Expanded evacuation regex tripwires to include Japanese (*退避勧告, 渡航中止勧告*) and Chinese (*紅色警示, 橙色警示, 撤離*) travel warning classifications.
  - Updated nominal diplomatic line to display clickable links to US State Dept, UK FCDO, Japan MOFA, and Taiwan BOCA.

---

## Phase 10: Production Pipeline Audit & Health Verification

- [x] **Task 10.1: Telegram Webhook & Callback Health Check**
  - Validated live webhook endpoint status (`pending_update_count: 0`, dropped pending updates).
  - Verified deep-link routing targeting `@TRIPWIRE_PH_Bot` (`/start how_it_works`, `/start what_we_monitor`).
  - Confirmed native modal dialog callback handler (`callback_query.data === "contact_popup"`, `show_alert: true`).
- [x] **Task 10.2: Aviation Ingestion & API Telemetry Probe**
  - Verified NASA FIRMS satellite thermal feed: HTTP 200, 0 offshore anomalies.
  - Verified IODA macroscopic connectivity feed: HTTP 200, 0 macroscopic outages.
  - Verified aviation telemetry: OpenSky transponder states fetched in $<1.0$s with immediate baseline median fallback.
- [x] **Task 10.3: Midday SitRep Delivery Verification**
  - Verified resolution of `ReferenceError: MASTER_SPREADSHEET_ID is not defined` via `TRIPWIRE_CONFIG.SPREADSHEET_ID`.
  - Dispatched `🟢 DAILY SITREP` silently (`disable_notification: true`) to `@TripwirePhAlerts` (`message_id: 23`) with 2-row compact keyboard.
- [x] **Task 10.4: Master Sweep & Database Ledger Check**
  - Completed autonomous sweep across all 5 sectors (`SEC-01` to `SEC-05`) in $2.96$ seconds.
  - Verified 5 new audit rows appended to `raw_telemetry` in `TRIPWIRE-PH_DB_Master` via `google-sheets` MCP tool.

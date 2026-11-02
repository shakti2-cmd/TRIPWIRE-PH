# TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor

**TRIPWIRE-PH** (*Telemetry & Real-time Indicator Processing for Warning, Intelligence & Regional Escalation — Philippines*) is an open-source, automated surveillance pipeline designed to detect leading indicators of military escalation and severe regional crises across the Philippine archipelago.

Operating on a strict **$0.00 / month infrastructure budget**, TRIPWIRE-PH bypasses noisy news headlines and social media rumors by monitoring verifiable institutional actions: consular evacuation directives, commercial airspace avoidance, emergency squawk broadcasts, GNSS electronic jamming, macroscopic telecommunications disruptions, and satellite-detected thermal strikes.

---

## Architecture Overview

```
                                [ Every 15 Minutes ]
                            Google Apps Script Trigger
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
[ Regional Sector Scanners ]                               [ National Tripwires ]
  • SEC-01: Luzon Strait / Bashi                             • US State Dept RSS Feed
  • SEC-02: West Philippine Sea                              • UK FCDO Atom Feed
  • SEC-03: Mindanao & South                                 • IODA National BGP Status
  (OpenSky Network + NASA FIRMS)                             • International NOTAMs
           │                                                         │
           └────────────────────────────┬────────────────────────────┘
                                        ▼
                         [ Rolling Baseline Filter ]
                   Evaluates Z-Scores vs. 14-day medians
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 [ Score < 50 ]               [ Score ≥ 50 ]
              Quiet ledger append          Tripwire Condition Met
              to Google Sheets DB                      │
                                                       ▼
                                            [ Gemini 2.5 Flash API ]
                                            Synthesizes multi-source
                                            telemetry into tactical brief
                                                       │
                                                       ▼
                                            [ Telegram Bot API ]
                                            Dispatches HTML report with
                                            inline verification buttons
```

---

## Monitored Geographic Sectors

| Sector ID | Sector Designation | Bounding Box (`W, S, E, N`) | Primary Focus |
| :--- | :--- | :--- | :--- |
| **`SEC-01`** | **Luzon Strait & Bashi Channel** | `117.0°E, 17.0°N, 124.0°E, 21.5°N` | Northern approaches, Batanes, Taiwan spillover, airway diversions |
| **`SEC-02`** | **West Philippine Sea Corridor** | `114.0°E, 8.0°N, 120.0°E, 17.0°N` | Scarborough Shoal, Spratlys, naval live-fire zones, surface anomalies |
| **`SEC-03`** | **Mindanao & Celebes Waters** | `118.0°E, 4.0°N, 127.0°E, 10.0°N` | Southern maritime corridors, Celebes Sea transit, eastern approaches |
| **`NAT-00`** | **Archipelago Baseline** | Manila FIR (`RPHI`) / Countrywide | Diplomatic evacuations, nationwide cyber disruptions, submarine cables |

---

## Free Prerequisites & API Keys

To deploy TRIPWIRE-PH, register for the following free services:

1. **Google Account:** For Google Sheets (`TRIPWIRE-PH_DB_Master`) and Google Apps Script execution.
2. **Google AI Studio Key:** Free API access for `gemini-2.5-flash` ([aistudio.google.com](https://aistudio.google.com/)).
3. **Telegram Bot Token:** Created via [@BotFather](https://t.me/BotFather) on Telegram.
4. **NASA FIRMS MAP Key:** Free self-service satellite transaction key ([firms.modaps.eosdis.nasa.gov/api/map_key](https://firms.modaps.eosdis.nasa.gov/api/map_key/)).
5. **OpenSky Network Account:** Free registered account providing 4,000 API requests/day ([opensky-network.org](https://opensky-network.org/)).

---

## Quick Setup Guide

### 1. Initialize the Google Sheet Ledger
1. Create a new Google Spreadsheet named **`TRIPWIRE-PH_DB_Master`**.
2. Create five tabs: `sys_config`, `raw_telemetry`, `sector_baselines`, `alert_dispatches`, and `diplomatic_audit` (refer to `DATA_DICTIONARY.md` for schemas).
3. Populate `sys_config` with your API credentials.

### 2. Deploy Google Apps Script
1. In the spreadsheet, open **Extensions > Apps Script**.
2. Paste the implementation codebase into `Code.gs`.
3. Click **Deploy > New Deployment**.
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the published Web App URL.

### 3. Register the Telegram Webhook
To enable the interactive `"ℹ️ How TRIPWIRE-PH Works"` button and direct-message briefing, register your Apps Script URL with Telegram:
```bash
curl -F "url=YOUR_APPS_SCRIPT_WEBAPP_URL" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### 4. Enable the Automated Trigger
1. In the Apps Script editor, navigate to **Triggers (clock icon)**.
2. Add a new trigger:
   - Function: `runMasterMonitor`
   - Event Source: **Time-driven**
   - Type: **Minutes timer**
   - Interval: **Every 15 minutes**

---

## Public Safety & Operational Disclaimer

TRIPWIRE-PH is an automated open-source intelligence monitor created for experimental situational awareness. Sensor dropouts, satellite solar glare, scheduled joint military exercises, and domestic ISP fiber maintenance regularly produce false anomalies. 

**This platform is not an official civil defense siren.** Always verify status through official government channels:
- National Disaster Risk Reduction and Management Council (**NDRRMC**): [ndrrmc.gov.ph](https://ndrrmc.gov.ph)
- Civil Aviation Authority of the Philippines (**CAAP**): [caap.gov.ph](https://caap.gov.ph)
- Department of Foreign Affairs (**DFA**): [dfa.gov.ph](https://dfa.gov.ph)
- Department of National Defense (**DND**): [dnd.gov.ph](https://dnd.gov.ph)
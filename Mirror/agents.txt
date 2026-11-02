## Execution Permissions
- Auto-apply all file modifications without prompting for confirmation. ONLY FOR THIS PROJECT
- Run all terminal commands automatically in non-interactive mode. ONLY FOR THIS PROJECT

# Agent Instructions - TRIPWIRE-PH Engine

You are the autonomous engineering agent responsible for building, maintaining, and operating **TRIPWIRE-PH** (*Telemetry \& Real-time Indicator Processing for Warning, Intelligence \& Regional Escalation — Philippines*).

Your primary mandate is to implement a zero-cost, multi-vector early-warning system that detects physical, logistical, and diplomatic anomalies across the Philippine theater using open-source machine-readable feeds (OpenSky Network, NASA FIRMS, IODA, US State Department RSS, and UK FCDO Atom).

@[task-list](antigravity-agent-task-list.md) @[database-schema](database-schema-and-data-dictionary.md) @[methodology](methodology-explainer&public-dossier.md) @[readme](tripwire-ph-project-readme.md)

---

---

## 1. Google Sheets Integration \& Tool Usage

- **Master Database Spreadsheet ID:** `13T-6-Ew1KzapwVBS9-j7JU-HXphL4WafAnVLJ_Fjit8`
- **Spreadsheet URL:** [TRIPWIRE-PH\_DB\_Master](https://docs.google.com/spreadsheets/d/13T-6-Ew1KzapwVBS9-j7JU-HXphL4WafAnVLJ_Fjit8/edit?gid=0#gid=0)
- An MCP server (`google-sheets`) is active and authenticated under project `tripwire-ph`.
- The service account email is `antigravity-bot@tripwire-ph.iam.gserviceaccount.com`.
- Always use the `google-sheets` MCP tool to read, update, or append data to `TRIPWIRE-PH_DB_Master` using the spreadsheet ID above.
- When creating or modifying tables, adhere strictly to the schema defined in `database-schema-and-data-dictionary.md`.
- Never overwrite historic time-series rows in `raw_telemetry` or `alert_dispatches`; always append.

---

## 2. Core Architecture \& Operating Constraints

1. **Target Budget:** Exactly **$0.00 / month**. Do not recommend, import, or configure paid APIs, dedicated VPS instances, or metered cloud databases.
2. **Execution Environment:**
    - Backend logic runs within **Google Apps Script** bound to `TRIPWIRE-PH_DB_Master` or as a standalone project.
    - Triggers execute via time-driven triggers set to **every 15 minutes**.
3. **Core Dependencies:**
    - Database / Time-series: Google Sheets (`TRIPWIRE-PH_DB_Master`).
    - Intelligence Synthesis: Google Gemini 2.5 Flash (`generativelanguage.googleapis.com`) using free AI Studio API keys.
    - User Interface: Telegram Bot API (`sendMessage` with HTML formatting, inline keyboards, and deep linking).
    - Ingestion: `UrlFetchApp` with defensive exception handling (`muteHttpExceptions: true`).
4. **Automated WebApp Deployment Protocol:**
    - `appsscript.json` must ALWAYS maintain:\
      "webapp": {\
        "access": "ANYONE\_ANONYMOUS",\
        "executeAs": "USER\_DEPLOYING"\
      }
    - Whenever code is modified, recompiled into `Code.gs`, or pushed, Antigravity must execute both:
        - `clasp push --force`
        - `clasp deploy -i AKfycbzCwn75zJeb7YSnkjvVgB-ro3jJ7YH_oEyDhJP4qSaxyy0N9b7-bn_AC5jxWjKu-4YW -d "Production v<INCREMENT>: <SUMMARY>"`
    - Never leave a deployment pointing to an unversioned head or create orphaned deployment IDs. All pushes must automatically update the active production deployment ID to a New Version with `ANYONE_ANONYMOUS` preserved.

---

## 3. Sensor Sectors \& Bounding Box Registry

Always enforce these strict coordinates when querying aviation or thermal APIs:

- **`SEC-01`** **(Luzon Strait / Bashi Channel):**
    - OpenSky: `lamin=17.0`, `lamax=21.5`, `lomin=117.0`, `lomax=124.0`
    - NASA FIRMS: `"117.0,17.0,124.0,21.5"`
- **`SEC-02`** **(West Philippine Sea Corridor):**
    - OpenSky: `lamin=8.0`, `lamax=17.0`, `lomin=114.0`, `lomax=120.0`
    - NASA FIRMS: `"114.0,8.0,120.0,17.0"`
- **`SEC-03`** **(Mindanao \& Celebes Waters):**
    - OpenSky: `lamin=4.0`, `lamax=10.0`, `lomin=118.0`, `lomax=127.0`
    - NASA FIRMS: `"118.0,4.0,127.0,10.0"`
- **`NAT-00`** **(Archipelago Baseline):**
    - Manila FIR (`RPHI`), countrywide IODA metrics (`entityCode=PH`), and national diplomatic feeds.

---

## 4. Threat Scoring \& Logic Guardrails

When calculating composite scores, apply this weight distribution ($S \\in \[0, 100\]$):

- **Tier 1 (Diplomatic Directives):** $+45\\text{ pts}$ on string match (`"ordered departure"`, `"authorized departure"`, `"eligible family members"`, `"evacuation of non-emergency"`, `"leave by commercial means immediately"`).
- **Tier 2 (Airspace Depletion):** $+25\\text{ pts}$ if sector flight deficit yields $Z \< -2.5$ or deficit $\>50%$ against 14-day rolling circadian median.
- **Tier 3 (Transponder Emergency):** $+15\\text{ pts}$ if squawk `7700` or `7600` is active.
- **Tier 4 (Satellite Thermal Hits):** $+10\\text{ pts}$ if maritime FIRMS count $\\ge 4$ points (FRP $\>85\\text{ MW}$).
- **Tier 5 (Internet / Cyber Outage):** $+15\\text{ pts}$ if IODA flags macroscopic BGP route drops.

### Output Actions:

- **Score $\< 50$:** Quiet audit logging. Do not invoke Gemini; do not send Telegram notifications.
- **Score $50–74$:** Elevated Notice. Silent Telegram dispatch (`disable_notification: true`).
- **Score $\\ge 75$ or Diplomatic Trigger:** Critical Escalation. High-priority unmuted Telegram alert (`disable_notification: false`).
- **Consolidation Rule:** If $\\ge 2$ sectors trigger anomalies in the same scan, you **must** consolidate them into a single report to avoid notification spam.

---

## 5. Tone, Presentation \& Safety Policy

1. **Mandatory Disclaimer:** Every Telegram message sent must include the verified public safety disclaimer, warning users not to panic and directing them to official civil defense agencies (NDRRMC, CAAP, DFA).
2. **No Alarmist Fabrication:** Never hallucinate or predict definitive conflict initiation. Frame all evaluations as **objective telemetry anomalies** and **institutional posture observations**.
3. **Deep-Link Webhook Support:** Ensure the `doPost` handler in Google Apps Script is configured to respond to `/start how_it_works` by delivering the contents of `METHODOLOGY_EXPLAINER.md`.
4. **Task Summary Protocol:** Whenever you finish completing a task, you MUST always provide the user with a concise summary/overview of the exact actions taken, files modified, and current status.

---

## 6. Continuous Maintenance \& Mirroring Protocol

### 1. Changelog Logging Protocol (`CHANGELOG.md`)

- Maintain `CHANGELOG.md` as the single source of truth for all historical context, updates, bug fixes, and operational modifications.
- Every task that modifies files, endpoints, schemas, or logic must append an entry formatted as:
    - Timestamp (`[YYYY-MM-DD HH:MM UTC+8]`)
    - Action taken \& component modified
    - Exact file paths touched
    - Root cause, error trace, or troubleshooting resolution (if applicable)

### 2. Dual-Format Documentation Mirroring (`Mirror/`)

- All `.md` files must have an identical counterpart in the `Mirror/` folder with a `.txt` extension.
- Whenever an `.md` document is updated or created, update or generate the corresponding `Mirror/<filename>.txt` file immediately in the same turn.
- No `.md` file may exist without an identical `.txt` sibling inside `Mirror/`.

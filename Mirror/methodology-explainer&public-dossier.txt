# TRIPWIRE-PH: System Methodology, Telemetry Sources & Public Dossier

*This documentation is delivered automatically to users who trigger the `/start how_it_works` or `/start what_we_monitor` commands, or click the **"ℹ️ How TRIPWIRE-PH Works"** / **"🛰️ What We Monitor"** buttons on Telegram.*

---

## 1. What is TRIPWIRE-PH?

**TRIPWIRE-PH** (*Telemetry & Real-time Indicator Processing for Warning, Intelligence & Regional Escalation — Philippines*) is an experimental automated, early-warning telemetry engine. It monitors the Philippine archipelago, the First Island Chain, and strategic maritime exclusive economic zones (EEZ) for physical and institutional signs of acute geopolitical escalation or armed conflict.

### The Non-Verbal Commitment Principle
Traditional news aggregators and social media feeds are plagued by sensationalism, political posturing, state-backed information operations, and mistranslations. 

TRIPWIRE-PH bypasses editorial noise by tracking **non-verbal commitments**—physical, logistical, and legal actions that governments, airlines, and utility networks take when kinetic danger is real:
1. Embassies do not issue mandatory evacuation orders for their diplomats' families as posturing; doing so costs immense political capital and requires emergency public funding.
2. Commercial airliners do not burn fuel executing 180-degree mid-flight diversions unless aviation insurers or air traffic controllers warn of active surface-to-air missile threats.
3. Satellite thermal sensors do not detect dense offshore heat spikes unless industrial flaring, ordnance detonation, or naval combat has occurred.

---

## 2. Monitored Geographic Choke Points (First Island Chain)

TRIPWIRE-PH continuously monitors 5 strategic regional sectors:
1. **`SEC-01` (Luzon Strait & Bashi Channel):** Northern approaches, Batanes, Taiwan spillover, airway diversions (Centroid: `19.25°N, 120.50°E`, Radius `180` NM).
2. **`SEC-02` (West Philippine Sea Corridor):** Scarborough Shoal, Spratlys, naval live-fire zones (Centroid: `12.50°N, 117.00°E`, Radius `220` NM).
3. **`SEC-03` (Mindanao & Celebes Waters):** Southern maritime choke points, Celebes Sea transit (Centroid: `7.00°N, 122.50°E`, Radius `250` NM).
4. **`SEC-04` (Taiwan Strait & ADIZ Corridor):** Cross-strait civilian air transit, naval exclusion lines (Centroid: `23.50°N, 120.25°E`, Radius `160` NM).
5. **`SEC-05` (Miyako Strait & Ryukyu Choke):** Miyako gap naval surface transit, Pacific breakout routes (Centroid: `26.25°N, 127.00°E`, Radius `190` NM).

---

## 3. Monitored Sensor Streams & Verification Tiers

TRIPWIRE-PH collects machine-readable data every 15 minutes across five verification tiers:

### Tier 1: Sovereign Diplomatic Directives (Ground Truth)
- **Primary Sources:** Consular advisory feeds from four issuing foreign ministries:
  - <a href="https://travel.state.gov">US State Dept</a>
  - <a href="https://www.gov.uk/foreign-travel-advice/philippines">UK FCDO</a>
  - <a href="https://www.anzen.mofa.go.jp/">Japan MOFA</a>
  - <a href="https://www.boca.gov.tw/">Taiwan BOCA</a>
- **Monitoring & Filtering Logic:** Automated multi-lingual regex filtering isolates legally binding state actions from ambient travel advice:
  - **Nationwide Title Filter:** Matches only explicit countrywide alert classifications (e.g., `"Level 4: Do Not Travel"`, `"Do Not Travel"`, `退避勧告` [Evacuation Advisory], `紅色警示` [Red Alert - Do Not Travel]).
  - **Institutional Directive Filter:** Scans advisory text strictly for legally binding evacuation and departure orders (`"ordered departure"`, `"authorized departure"`, `"eligible family members"`, `"evacuation of non-emergency"`, `"leave by commercial means immediately"`, `"suspension of operations"`, `"suspension of consular operations"`, `退避勧告`, `渡航中止勧告`, `紅色警示`, `撤離`).
  - **False-Positive Suppression:** Isolates and filters out routine phrases like `"do not travel"` when embedded within localized regional advisories (such as western Mindanao or regional security notes) to prevent false alerts.

### Tier 2: Commercial Airspace Integrity & Electronic Warfare (Community ADS-B & OpenSky)
- **Primary Sources:** Community ADS-B point APIs (`airplanes.live` / `adsb.one`) with fallback to OpenSky Network.
- **What It Measures:** 
  - **Flight Depletion:** Measures active commercial flight counts across all 5 sectors. A sudden drop $>50\%$ against rolling 14-day circadian medians flags corridor avoidance.
  - **Emergency Transponders:** Immediate trigger on squawk codes `7700` (General In-Flight Emergency) or `7600` (Radio Loss).
  - **GNSS / Electronic Jamming:** Evaluates Navigation Integrity Category (`NIC < 5`). Degraded values across multiple civilian aircraft indicate active wide-area GPS spoofing/jamming.

### Tier 3: Satellite Thermal & Kinetic Events (NASA FIRMS)
- **Primary Source:** NASA Fire Information for Resource Management System (VIIRS S-NPP Near Real-Time).
- **What It Measures:** Detects thermal anomalies with Fire Radiative Power (FRP) $\ge 85\text{ MW}$ in maritime zones or coastal military perimeters, filtering out baseline agricultural burns.

### Tier 4: Macroscopic National Infrastructure (IODA)
- **Primary Source:** Internet Outage Detection & Analysis (Georgia Institute of Technology).
- **What It Measures:** Tracks macroscopic Border Gateway Protocol (BGP) routing announcements and active IP reachability probes across Philippine telecommunication backbones to detect cyber warfare strikes or physical submarine fiber cuts.

### Tier 5: Regional Event Escalation Surge (GDELT 2.0)
- **Primary Source:** GDELT 2.0 Global Document API.
- **What It Measures:** Monitors sudden surges in localized naval confrontations, blockades, missile launches, and maritime collisions (+10 pts).

---

## 4. How Threat Scores are Calculated

Every 15 minutes, raw metrics are synthesized into a **Composite Threat Score ($0–100$)**:

$$\text{Threat Score} = \min\Big(100, W_{\text{diplo}} (45) + W_{\text{flight}} (25) + W_{\text{squawk}} (15) + W_{\text{thermal}} (10) + W_{\text{cyber}} (15) + W_{\text{gdelt}} (10)\Big)$$

- **Score $< 50$ (Nominal):** Normal day-to-day operations. Data is logged silently to the database; no messages are sent.
- **Score $50–74$ (Elevated Notice):** Localized anomalies without diplomatic evacuation. Dispatched as a **silent Telegram message**.
- **Score $\ge 75$ or Diplomatic Trigger (Critical Escalation):** Multi-vector alignment. Dispatched as an **unmuted, high-priority alert**.
- **Midday Daily SitRep:** Dispatched daily at 12:00 PM PHT as a silent theater status overview confirming nominal equilibrium.

---

## 4. Crucial Limitations & False Alarms

TRIPWIRE-PH is an experimental telemetry monitor, not a psychic predictor. Users must be aware of its operational blind spots:

1. **Scheduled Military Drills:** Large-scale naval exercises (e.g., annual joint exercises) look almost identical to war staging in telemetry feeds. They involve airspace closures, GPS jamming tests, and naval surface movements.
2. **Tactical Skirmishes (The Unplanned Spark):** Minor standoffs or coast guard water cannon incidents do not trigger advance embassy evacuations. The system only registers these events after physical confrontation occurs.
3. **Severe Weather & Monsoons:** Heavy tropical typhoons routinely force commercial airlines to reroute and can suppress internet connectivity, temporarily mimicking conflict signals.
4. **Satellite Glare:** Cloud refraction or offshore gas flares can occasionally register as transient thermal anomalies on NASA FIRMS.

---

## 5. Mandatory Public Advisory: Do Not Panic

```
🛡️ PUBLIC SAFETY DISCLAIMER:
This is an automated open-source intelligence monitor. Sensor dropouts, military exercises, and weather routinely produce anomalies. It is NOT an official civil defense agency. Never make personal safety decisions based solely on automated alerts. Always verify with NDRRMC, CAAP, DFA, and DND.

Official civil defense portals:
• National Disaster Risk Reduction & Management Council (NDRRMC): https://ndrrmc.gov.ph
• Civil Aviation Authority of the Philippines (CAAP): https://caap.gov.ph
• Department of Foreign Affairs (DFA): https://dfa.gov.ph
• Department of National Defense (DND): https://dnd.gov.ph
```
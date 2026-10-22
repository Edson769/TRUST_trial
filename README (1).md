# TRUST — Transport Resilient Unified Sensor Technology

**Kwame Nkrumah University of Science and Technology (KNUST)**  
**Regional Transport Research and Education Centre (TRECK)**

> Detect. Fuse. Verify. Monitor.

TRUST is a multi-sensor positioning system designed to maintain reliable location estimates when GNSS (GPS) becomes unavailable, unreliable, or manipulated. GNSS is the baseline reference; TRUST is the independent sensor-fusion engine that continues estimating position when GNSS fails.

---

## What the system does

| Component | Role |
|-----------|------|
| `trust_phone.html` | Phone sensor client — collects real GPS, compass, accelerometer, step odometry. Runs the TRUST dead-reckoning engine. Sends data to dashboard. |
| `trust_dashboard.html` | Operator dashboard — real OpenStreetMap map, live position trails, reference point, simulation controls, event log, CSV export. |

### Positioning modes

| Mode | What happens |
|------|-------------|
| **GNSS Trusted** | GPS provides absolute position. DR is seeded each tick. |
| **GNSS Jammed** | TRUST ignores incoming GPS. Continues estimating from last trusted fix + step odometry + compass heading. |
| **Spoofing Detected** | TRUST compares injected GNSS coords against its independent DR estimate. Flags mismatch in metres. |
| **Recovering** | After GNSS is restored, confidence climbs back gradually before full trust is reinstated. |

---

## Quick start — local testing

### Option A: Same browser (dashboard uses its own GPS)

1. Open `trust_dashboard.html` in Chrome or Firefox on your computer.
2. Allow location access when prompted.
3. The dashboard will use the browser's own GPS/IP location as the GNSS source.
4. Use the Jam / Spoof / Restore buttons to test all modes.

### Option B: Separate phone (recommended for real demo)

Because GPS and motion sensors require HTTPS on phones, you must host the files somewhere with HTTPS. The easiest free option is GitHub Pages.

---

## Deployment on GitHub Pages (free, HTTPS, takes ~5 minutes)

1. Create a new public GitHub repository (e.g. `trust-demo`).
2. Upload all three files:
   - `trust_dashboard.html`
   - `trust_phone.html`
   - `trust_manifest.json`
3. Go to **Settings → Pages → Source → main branch → / (root) → Save**.
4. GitHub will give you a URL like: `https://yourusername.github.io/trust-demo/`

Your URLs will then be:
- Dashboard: `https://yourusername.github.io/trust-demo/trust_dashboard.html`
- Phone client: `https://yourusername.github.io/trust-demo/trust_phone.html`

---

## Connecting your phone to the dashboard

Both pages communicate via `localStorage` and `BroadcastChannel`. This works automatically when both pages are open **in the same browser on the same device**, or when the phone client writes to the shared localStorage key.

### For a real phone ↔ desktop connection:

Because `localStorage` is per-browser and per-origin, the simplest approach for a live demo with two devices is:

**Option 1 — Use the phone as the only device** (simplest):
- Open `trust_phone.html` on your phone.
- Open `trust_dashboard.html` on the same phone (second tab).
- Both share `localStorage` on the same origin — sensor data flows automatically.

**Option 2 — Phone client + desktop dashboard via relay**:
The phone client can POST to a tiny relay server. A Node.js relay is provided below (optional advanced setup). For a conference demo, Option 1 is recommended.

**Option 3 — Dashboard uses its own GPS** (single device):
- Open only `trust_dashboard.html` on any device with GPS.
- The dashboard starts `navigator.geolocation.watchPosition()` on itself.
- No phone client needed.

---

## How to use the demo

### Normal operation
1. Open the phone client and tap **Start**.
2. Grant GPS and motion permissions.
3. Watch your position appear on the OpenStreetMap map in the dashboard.
4. The GNSS marker (cyan) moves with you. Confidence stays at ~95–100%.

### Simulate GNSS jamming
1. Tap **Jam (simulate)** on the phone client, or **Simulate Jamming** on the dashboard.
2. The system stops trusting new GPS fixes.
3. TRUST continues estimating position using step counting + compass heading.
4. The violet dead-reckoning trail diverges from the cyan GPS trail.
5. Confidence decays as drift accumulates (heuristic: ~0.4% per metre of drift).
6. **No actual radio interference is produced. This is a software simulation only.**

### Simulate GNSS spoofing
1. Tap **Spoof (simulate)**.
2. A fake GPS position is injected (default: +200 m north, +300 m east of true position).
3. TRUST compares the injected GPS against its independent DR estimate.
4. The mismatch is displayed in metres on the banner and map popup.
5. The red spoof marker appears on the map, clearly labelled SIMULATED.
6. The true position is preserved — the original telemetry is never overwritten.

### Restore GNSS
1. Tap **Restore GNSS**.
2. Mode switches to RECOVERING.
3. Confidence climbs back to 88% before TRUST re-trusts GPS.
4. This models a cautious re-validation step before accepting a restored signal.

### Reset
- Clears position trails, step counters, and event log.
- Requires confirmation — historical CSV data is not deleted automatically.

---

## Data export and Colab analysis

Tap **Download Log CSV** on the phone client to export the session data.  
Upload it to the provided `TRUST_Live_Demo_Analysis.ipynb` notebook in Google Colab for:
- Confidence-over-time chart
- Real GPS path vs. dead-reckoning comparison
- Map-match distance plot
- PDF report export

CSV columns:
```
timestamp_ms, mode, confidence, real_lat, real_lng, dr_lat, dr_lng,
acc_m, steps, dr_dist_m, speed_kph, heading_deg
```

---

## Sensor notes

| Sensor | Source | Notes |
|--------|--------|-------|
| GNSS position | `navigator.geolocation` | Reports device-fused location (OS estimate). Not raw GNSS pseudoranges. |
| Heading | `deviceorientation.alpha` | Compass bearing in degrees. May need calibration (figure-8 motion). |
| Step detection | `devicemotion` (accelerometer magnitude threshold) | Counts peaks above 11.5 m/s² with 280 ms debounce. Tune `STEP_THRESHOLD` in code. |
| Speed | `pos.coords.speed` | GNSS-derived. Null when stationary or unavailable. |
| Altitude | `pos.coords.altitude` | Available on most phones outdoors. Null indoors. |

**Important**: The browser Geolocation API does not expose raw GNSS measurements (pseudoranges, carrier phase, Doppler, NMEA sentences). The reported accuracy is the OS estimate, not an independently verified error bound. Future phases can add an Android app with raw GNSS API or an external u-blox receiver for true measurement-level access.

---

## Dead-reckoning accuracy expectations

Step odometry + compass heading is a coarse method. Typical drift:
- **Walking**: 5–15% of distance travelled in good conditions.
- **Compass error**: 5–20° typical on phones (magnetic interference, calibration).
- **Step length variation**: ±15% around the configured `STRIDE_M` value.

These limitations are by design — the system measures and displays drift rather than hiding it. Future phases will add an Extended Kalman Filter, wheel speed sensor integration (vehicle mode), and map-matching to constrain drift.

---

## Tuning parameters

In `trust_phone.html`, edit the constants at the top of the script block:

```javascript
const STRIDE_M         = 0.72;   // Your average stride in metres
const STEP_THRESHOLD   = 11.5;   // Lower = more sensitive, higher = fewer false steps
const STEP_DEBOUNCE_MS = 280;    // Minimum ms between steps (prevents double-counting)
```

Measure your own stride: walk exactly 10 metres and count your steps. `STRIDE_M = 10 / stepCount`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| GPS not working on phone | Must be HTTPS. File:// URLs block GPS on iOS and most Android. |
| Motion sensors not working on iOS | Tap the yellow banner to grant permission. iOS 13+ requires a user gesture. |
| Map shows wrong tiles | Check internet connectivity. The map uses OpenStreetMap (free, no API key). |
| Steps not being counted | Shake the phone firmly, or lower `STEP_THRESHOLD` to ~10.0. |
| Compass jumps around | Calibrate by moving phone in a figure-8. Keep away from metal surfaces. |
| Dashboard not receiving phone data | Ensure both pages are on the same origin (both on GitHub Pages from the same repo). |
| `trust_manifest.json` 404 | Upload all three files to the same folder/repo. |

---

## Architecture notes

```
trust_phone.html
├── navigator.geolocation.watchPosition()     ← real GPS
├── window.addEventListener("deviceorientation") ← compass
├── window.addEventListener("devicemotion")   ← accelerometer + step detection
├── TRUST DR Engine                           ← step + heading → position estimate
├── BroadcastChannel("trust-sensors")        ← sends data to dashboard (same tab/origin)
└── localStorage["trust_phone_data"]         ← fallback data channel

trust_dashboard.html
├── Leaflet + OpenStreetMap tiles             ← real geographic map
├── polled localStorage every 500ms          ← receives phone data
├── BroadcastChannel("trust-sensors")        ← receives phone data (direct)
├── navigator.geolocation (own GPS fallback) ← if no phone client connected
├── TRUST confidence engine                  ← mode-aware score
└── CSV export + event log
```

---

## Future development phases

- [ ] Extended Kalman Filter for optimal sensor fusion
- [ ] Android app with raw GNSS API (pseudoranges, carrier phase)
- [ ] Vehicle mode: wheel speed encoder + steering angle integration
- [ ] u-blox NEO-M8N / NEO-MBN receiver via USB/Bluetooth
- [ ] Map-matching against OSM road network (constrained positioning)
- [ ] Anomaly detection ML model trained on real collected trajectories
- [ ] Multi-vehicle fleet dashboard
- [ ] Real-time websocket relay for phone ↔ desktop across network

---

## Citation / acknowledgement

If you use TRUST in research, please cite:

> Dagbey, B., Mensah, G.N.O., & Biney, E. (2026). *TRUST: Transport Resilient Unified Sensor Technology — Multi-Sensor Positioning During GNSS Disruptions*. KNUST Regional Transport Research and Education Centre (TRECK), Kumasi, Ghana.

---

*TRUST v1.0 · KNUST · TRECK · 2026*

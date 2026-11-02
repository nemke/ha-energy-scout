# Energy Scout

Discover existing energy counters and review devices to add to Home Assistant's Energy dashboard.

Energy Scout is a Python custom integration. It runs inside HA, with native configuration dialogs. No additional container, server, cloud account, PHP runtime, or access token is needed. It is independent of Breeze Purifier Card.

**Initial beta: 0.1.0b1.** Requires Home Assistant **2026.10.4** or newer. Automated compatibility validation currently covers 2026.10.4; newer releases have not yet been verified. The repository has not been accepted into the HACS default catalog.

## Install

1. In HACS, open **Custom repositories** and add `https://github.com/nemke/ha-energy-scout`, category **Integration**.
2. Download **Energy Scout** and restart Home Assistant.
3. Open **Settings → Devices & services → Add integration → Energy Scout**.
4. After setup, open Energy Scout's **Configure/Options** dialog.

Alternatively, copy `custom_components/energy_scout` into your HA configuration's `custom_components` folder and restart HA.

## Scan → review → add

Open the integration options and choose **Review and add devices**. Energy Scout reads your existing sensor metadata, devices, areas, and Recorder statistics. It does not poll appliances or create new measurement sensors.

The report separates ready counters, already tracked counters, sensors needing attention, power-only devices, and ignored suggestions. Select the appliance energy counters you want to add. Nothing is preselected or added automatically.

The review screen shows the proposed energy and optional power sensors. Choose **Customize a device mapping** to change its display name, select another eligible power sensor from the same device, leave power unset, or select an existing Individual device as its upstream device. Then choose **Add devices to Energy dashboard** and submit.

Entries are added under **Individual devices** in the built-in Energy configuration. Existing grid, solar, battery, water, tariff settings, and device entries are preserved. A fresh metadata/configuration check happens when you submit. An invalid or stale selection is rejected before writing.

An accepted configuration does not guarantee immediate graphs: HA may need time to compile new statistics. Energy Scout does not import or backfill historical data.

## Choosing counters

- Prefer a device's cumulative lifetime total over a daily, weekly, or monthly counter when both measure the same consumption.
- Do not add both the total and a period counter for the same channel. Energy Scout flags likely alternatives and rejects selecting both together when they share its channel hint.
- Multi-outlet devices can expose one counter per outlet. Matching names can suggest corresponding power channels, but ambiguous power mappings are left unset for review.
- A device can also expose aggregate, import, export, production, or battery counters. Units and state classes alone cannot prove their role. Review the source before adding it as appliance consumption.
- Set an **upstream device** when one tracked device already includes another's consumption. Energy Scout never guesses these physical relationships.
- Power-only devices need an energy counter first. You can create one with HA's Integration helper or another suitable integration; Energy Scout does not estimate consumption or create helpers in this version.

Eligibility checks include energy device class, HA energy units, cumulative state class (or legacy measurement with a reset), finite nonnegative current readings, Recorder inclusion, and existing sum metadata. Power suggestions require compatible power metadata and mean statistics. Disabled, unavailable, excluded, and not-yet-recorded sources are reported instead of converted to zero.

## Background discovery

Scans run after HA startup, after debounced registry/metadata changes, and every five minutes to pick up Recorder readiness. These are local metadata reads; device refresh rates are untouched. Ordinary numeric updates do not trigger a new scan for every reading.

When enabled, one persistent notification links to the integration options when the set of ready candidates changes. Dismissing it does not cause it to reappear on every scan. Ignore individual suggestions to suppress them persistently, or disable discovery notifications. Ignored entity-registry IDs survive entity renames.

**Automatic registration is intentionally deferred.** This release discovers and notifies in the background; users review every addition. There is no unattended addition mode.

## Remove additions

**Remove entries added by Energy Scout** lists only entries in its persistent ownership log. Select entries, then explicitly confirm removal. Sensors and Recorder history remain untouched.

If an entry was edited outside Energy Scout, removal is refused. An upstream entry with remaining dependents is also protected. Manage such entries in HA's Energy settings. Unloading or uninstalling Energy Scout leaves configured Energy entries in place.

This is selective removal of recorded additions, not a global snapshot rollback. The ownership log is stored separately from HA's Energy preferences; an interrupted write may leave a successfully added entry that must be managed in HA's own Energy settings.

## Development

Python 3.14 is required for the pinned HA runtime:

```sh
python3.14 -m venv .venv
.venv/bin/pip install -r requirements_test.txt
.venv/bin/ruff check custom_components tests
.venv/bin/ruff format --check custom_components tests
.venv/bin/pytest -q
```

Tests exercise discovery rules, actual HA configuration flows, the actual Energy preferences manager and storage, merges, stale reviews, exclusions, notifications, and guarded removal. Device and Recorder metadata fixtures are simulated; validation on a real HA installation remains necessary before a stable release.

The internal Energy preferences API is isolated in `energy.py` and tested against HA 2026.10.4. Energy Scout does not edit `.storage/energy` directly. See [implementation notes](docs/ARCHITECTURE.md).

MIT license.


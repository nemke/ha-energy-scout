Energy Scout's first stable release brings the existing discovery and bulk-review workflow out of beta.

- Discover existing appliance energy counters and matched power sensors from local HA metadata.
- Review devices in a searchable sidebar using HA's native table, forms, selectors, and controls.
- Select recommended counters, edit names and power/upstream mappings, then confirm a batch of additions to Individual devices.
- Keep drafts through state updates and rescans. Filter by room/status and use a responsive layout on phones.
- Ignore or restore suggestions in bulk, and review removal of unchanged entries previously added by Energy Scout.
- Exclude recognizable fitness calorie counters while retaining legitimate electrical and heating meters.
- Discover new candidates in the background with optional notifications. Every dashboard addition still requires review.

Update through HACS, restart Home Assistant, and reload the frontend. Open **Energy Scout** in the sidebar. Existing configuration, ownership data, exclusions, and Energy dashboard settings are retained. No migration or integration reinstallation is required. This release is available without enabling beta versions in HACS.

Requires HA **2026.10.4** or newer; automated compatibility validation covers HA 2026.10.4 and frontend 20260930.5. Device and Recorder metadata in tests are simulated. Future HA versions and all hardware combinations have not been validated.

Scope: adds Individual devices; existing grid, solar, battery, and tariff configuration is preserved. Grid setup and estimated consumption aggregates are not included in this release. HACS default-catalog submission remains separate from publishing a stable GitHub release.

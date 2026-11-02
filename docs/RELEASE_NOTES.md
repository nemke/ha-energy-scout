Energy Scout now has a dedicated HA sidebar page for larger installations.

- Reuses HA's native data table, search, checkboxes, forms, selectors, buttons, alerts, and app bar.
- Lists discoveries and tracked counters together, with search, room/status filters, and sortable columns.
- Adds Select recommended and a single batch review/confirmation. A 35-device fixture is exercised end to end.
- Prefers one lifetime counter per channel and flags ambiguous totals or alternatives to existing tracked counters for manual review.
- Provides editable names, power mappings, and upstream devices; drafts survive HA refreshes and rescans.
- Supports bulk ignore/restore and guarded removal of owned entries. Panel and APIs require an administrator account.
- Keeps native integration options as a fallback. No additional container, server, or manual dashboard resource configuration.

Update through HACS, restart HA, and reload the frontend. Open **Energy Scout** in the sidebar. Choose **Select recommended → Review additions → Add N devices**.

[Desktop, phone and batch-review previews](https://github.com/nemke/ha-energy-scout/blob/v0.1.0b3/README.md#scan--select--review--add).

Validation targets HA 2026.10.4 and its matching frontend. Devices and Recorder metadata in automated tests are simulated. The native component loader and Energy preferences API are version-dependent. Existing counters are displayed for review; this beta does not replace their mappings automatically or introduce unattended registration.

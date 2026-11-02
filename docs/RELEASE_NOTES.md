Initial Energy Scout beta for Home Assistant 2026.10.4.

- Discovers existing energy counters, identifies already tracked sensors, and explains missing Recorder statistics, unavailable readings, and incompatible metadata.
- Provides native HA dialogs for bulk selection, editable names, same-device power mappings, upstream device selection, and final review.
- Adds only reviewed Individual device entries, preserving existing Energy preferences and rejecting stale or duplicate selections.
- Includes persistent ignore/restore controls, background metadata discovery, optional notifications, and guarded removal of unchanged entries added by Energy Scout.
- Runs inside HA with Python. No separate container, server, frontend bundle, or access token.

**Beta limitations:** device/Recorder fixtures are simulated on the real HA 2026.10.4 runtime. Validation on a real installation is still needed. Hardware roles and upstream relationships require review. This version does not automatically register devices, create energy helpers, or rewrite existing entries on rename. The internal Energy API is version-dependent.

Install as a HACS custom repository with category **Integration**, restart HA, then add **Energy Scout** under Settings → Devices & services. Open its Configure/Options dialog to review devices. If the beta version is not listed, enable beta versions or select the repository's main branch.


# Implementation and compatibility

Energy Scout consists of a native config/options flow, a local discovery runtime, a pure discovery model, and a small adapter around HA's internal Energy preferences manager. A small Lit sidebar bundle composes existing HA frontend controls; there is no separate service. The native options flow remains available.

`models.py` assesses normalized sensor metadata. `scout.py` reads HA registries, states and Recorder metadata, serializes operations with a lock, stores exclusions/ownership, and manages one replaceable persistent notification. `config_flow.py` holds editable drafts in a flow instance; background state refreshes cannot overwrite user input.

Only `energy.py` imports the internal Energy data API. It uses the same initialized manager as HA's Energy WebSocket configuration handlers. It validates each new device mapping against HA's device schema before writing only the `device_consumption` preference key. Other preference keys are never passed back or replaced.

Before an addition, metadata is re-read, candidates are reassessed, mappings and upstream references are validated, and the latest preference list is read again. There is no await between that final read/merge and the HA 2026.10.4 manager's assignment, which occurs before its first await. The integration's own operations are serialized. This behavior is version-dependent and must be rechecked if HA changes its manager implementation; it is not a public compare-and-swap API or a cross-client transaction guarantee.

After applying, the ownership log records exact inserted configurations keyed by entity-registry ID. Removal requires the current entry to equal that recorded configuration, and rejects removal of a parent used by a remaining entry. User edits are never reverted by a global restore. A crash between the Energy update and ownership save can leave an unowned addition; users manage it through Energy settings. Removing the integration does not remove dashboard devices.

Entity registry IDs preserve exclusions across renames. Energy preferences refer to statistic IDs; a rename during review requires a fresh review. The integration does not rewrite existing Energy entries after renames. If HA or another tool updates an added entry, the old ownership snapshot will no longer match and selective removal is refused.

Counter and power channel names are hints within the same HA device. They are not proof of physical topology. Hardware role, whole-house versus appliance scope, aggregate versus outlet usage, net versus import/export, and upstream relationships require review. Automatic addition is out of scope for the initial version.

Unregistered state entities can be reviewed if their statistics are eligible, but cannot be automatically paired with a power sensor from another entity using names alone. External-only statistics without current entities and remote historical imports are out of scope.

All registry listeners, startup listeners, debounce timers, and the periodic local scan are detached on unload. Notifications are dismissed on unload. No devices are polled and no entity states are written.

## Sidebar and native frontend controls

`panel.py` registers an admin-only custom panel and static JavaScript path once per HA process. API handlers resolve the current runtime per request and reject access after unload. WebSocket commands require administrator privileges and reuse the same validated, serialized backend operations as the native options flow. Responses include device-review data, not grid tariffs or other Energy source preferences.

`frontend/ha-components.ts` isolates component loading for HA 2026.10.4 / frontend 20260930.5. HA does not provide a standalone stable UI SDK; the adapter uses HA's existing Settings route loaders to define its data table and form controls. It never connects Settings views or navigates the user. If component loading is unavailable, the page reports an error and links to the native integration options. This frontend dependency must be retested for future HA versions, alongside the Python Energy adapter.

The page uses HA's data table, search, checkboxes, form selectors, buttons, alerts and app bar. Custom code supplies Energy Scout's columns, filtering, drafts, recommendations and batch review. A ResizeObserver adapts the native table's narrow mode to the panel width and is disconnected when leaving the page. No background browser poll or device refresh is introduced.

Mapping drafts remain in the page instance across ordinary HA updates and manual rescans. Filters clear the native table's selection; explicit review is required before a batch write. Error responses keep the current review and drafts. Backend revalidation handles counters that change or disappear after the scan. Recommendations deliberately avoid automatic replacement of an already tracked counter.

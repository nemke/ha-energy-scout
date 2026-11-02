"""Energy Scout: discover existing counters and review Energy dashboard additions."""

from homeassistant.components import persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, EVENT_STATE_CHANGED
from homeassistant.core import CoreState, Event, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.storage import Store

from .const import CONF_NOTIFY, DOMAIN, NOTIFICATION_ID, STORAGE_VERSION
from .energy import EnergyAdapter
from .panel import async_register, async_unregister
from .scout import RESCAN_INTERVAL, Scout

type ScoutConfigEntry = ConfigEntry[Scout]


async def async_setup_entry(hass: HomeAssistant, entry: ScoutConfigEntry) -> bool:
    """Set up one local runtime; all listeners and timers are unloadable."""
    scout = Scout(
        hass,
        await EnergyAdapter.async_create(hass),
        Store(hass, STORAGE_VERSION, DOMAIN),
        dict(entry.options),
    )
    await scout.async_load()
    entry.runtime_data = scout
    await async_register(hass)
    entry.async_on_unload(lambda: async_unregister(hass))
    cancel_pending = None

    @callback
    def schedule(_event=None) -> None:
        nonlocal cancel_pending
        if cancel_pending is not None:
            cancel_pending()
        cancel_pending = async_call_later(hass, 5, run_scan)

    async def run_scan(_now) -> None:
        nonlocal cancel_pending
        cancel_pending = None
        await scout.async_background_scan()

    @callback
    def on_state(event: Event) -> None:
        entity_id = event.data["entity_id"]
        if not entity_id.startswith("sensor."):
            return
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if new is None:
            return
        # Numeric fluctuations aren't discovery events. The periodic local scan
        # picks up Recorder readiness/unavailability without per-reading queries.
        if new.attributes.get("device_class") in {"energy", "power"} and (
            old is None
            or any(
                old.attributes.get(key) != new.attributes.get(key)
                for key in ("device_class", "state_class", "unit_of_measurement")
            )
        ):
            schedule()

    @callback
    def close() -> None:
        scout.closed = True
        if cancel_pending is not None:
            cancel_pending()
        persistent_notification.async_dismiss(hass, NOTIFICATION_ID)

    for event in (
        er.EVENT_ENTITY_REGISTRY_UPDATED,
        dr.EVENT_DEVICE_REGISTRY_UPDATED,
        ar.EVENT_AREA_REGISTRY_UPDATED,
    ):
        entry.async_on_unload(hass.bus.async_listen(event, schedule))
    entry.async_on_unload(hass.bus.async_listen(EVENT_STATE_CHANGED, on_state))
    entry.async_on_unload(
        async_track_time_interval(hass, scout.async_background_scan, RESCAN_INTERVAL)
    )
    entry.async_on_unload(close)
    entry.async_on_unload(entry.add_update_listener(async_options_updated))
    if hass.state is CoreState.running:
        schedule()
    else:
        entry.async_on_unload(hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, schedule))
    return True


async def async_options_updated(hass: HomeAssistant, entry: ScoutConfigEntry) -> None:
    """Apply notification settings without reloading the integration."""
    scout = entry.runtime_data
    scout.options = dict(entry.options)
    # Force an opt-in toggle to restore a previously dismissed notification.
    if scout.options.get(CONF_NOTIFY, True):
        scout._notification_keys = set()
    scout.update_notification()


async def async_unload_entry(hass: HomeAssistant, entry: ScoutConfigEntry) -> bool:
    """HA invokes async_on_unload callbacks. Energy entries remain in place."""
    return True

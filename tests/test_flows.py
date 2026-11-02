"""Drive the actual HA config/options flow manager, not direct method calls."""

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType

from custom_components.energy_scout.const import DOMAIN


async def options(hass, entry):
    return await hass.config_entries.options.async_init(entry.entry_id)


async def advance(hass, result, data=None, step=None):
    return await hass.config_entries.options.async_configure(
        result["flow_id"], user_input={"next_step_id": step} if step else data or {}
    )


async def test_setup_and_single_instance(hass, recorder_mock):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"notify_new_devices": False}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["options"] == {"notify_new_devices": False}
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["reason"] == "already_configured"


async def test_review_customize_confirm_add(hass, loaded):
    entry, scout = loaded
    result = await options(hass, entry)
    assert result["type"] is FlowResultType.MENU
    result = await advance(hass, result, step="review")
    assert result["step_id"] == "review"
    result = await advance(hass, result, {"sensors": ["washer-energy-id"]})
    assert result["step_id"] == "confirm"
    assert not scout.adapter.preferences()["device_consumption"]
    result = await advance(hass, result, {"action": "customize"})
    result = await advance(hass, result, {"sensor": "washer-energy-id"})
    assert result["step_id"] == "mapping"
    result = await advance(hass, result, {"name": "Laundry", "power": "", "upstream": ""})
    assert result["step_id"] == "confirm"
    result = await advance(hass, result, {"action": "apply"})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "devices_added"
    assert scout.adapter.preferences()["device_consumption"] == [
        {"stat_consumption": "sensor.washer_energy_total", "name": "Laundry"}
    ]


async def test_empty_selection_stays_in_review(hass, loaded):
    entry, _ = loaded
    result = await advance(hass, await options(hass, entry), step="review")
    result = await advance(hass, result, {"sensors": []})
    assert result["errors"] == {"base": "empty_selection"}


async def test_revalidation_error_keeps_draft(hass, loaded):
    entry, scout = loaded
    result = await advance(hass, await options(hass, entry), step="review")
    result = await advance(hass, result, {"sensors": ["washer-energy-id"]})
    scout.adapter.manager.data = {
        "device_consumption": [{"stat_consumption": "sensor.washer_energy_total"}],
        "energy_sources": [],
    }
    result = await advance(hass, result, {"action": "apply"})
    assert result["errors"] == {"base": "stale_review"}
    assert "sensor.washer_energy_total" in result["description_placeholders"]["summary"]


async def test_ignore_and_restore(hass, loaded):
    entry, scout = loaded
    result = await advance(hass, await options(hass, entry), step="ignore")
    result = await advance(hass, result, {"sensors": ["washer-energy-id"]})
    assert result["type"] is FlowResultType.MENU
    assert "review" not in result["menu_options"]
    result = await advance(hass, result, step="restore")
    result = await advance(hass, result, {"sensors": ["washer-energy-id"]})
    assert "review" in result["menu_options"]
    assert not scout.ignored


async def test_remove_needs_explicit_confirmation(hass, loaded):
    entry, scout = loaded
    await scout.async_apply({"washer-energy-id": {}})
    result = await advance(hass, await options(hass, entry), step="remove")
    result = await advance(hass, result, {"sensors": ["washer-energy-id"]})
    assert result["step_id"] == "confirm_remove"
    result = await advance(hass, result, {"confirm": False})
    assert scout.adapter.preferences()["device_consumption"]
    result = await advance(hass, result, step="remove")
    result = await advance(hass, result, {"sensors": ["washer-energy-id"]})
    result = await advance(hass, result, {"confirm": True})
    assert result["reason"] == "devices_removed"
    assert not scout.adapter.preferences()["device_consumption"]


async def test_settings_update_without_reload(hass, loaded):
    entry, scout = loaded
    result = await advance(hass, await options(hass, entry), step="settings")
    result = await advance(hass, result, {"notify_new_devices": False})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert scout.options["notify_new_devices"] is False

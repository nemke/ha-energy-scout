"""Read actual HA registries and states, with simulated Recorder metadata."""

from unittest.mock import patch

from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from custom_components.energy_scout.scout import Scout

read_sources = Scout.async_sources


async def test_reads_device_area_and_stable_registry_ids(hass, loaded):
    entry, scout = loaded
    area = ar.async_get(hass).async_create("Utility room")
    override = ar.async_get(hass).async_create("Kitchen")
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={("tasmota", "washer")},
        name="Washer",
    )
    dr.async_get(hass).async_update_device(device.id, area_id=area.id)
    registry = er.async_get(hass)
    energy = registry.async_get_or_create(
        "sensor",
        "tasmota",
        "washer-total",
        device_id=device.id,
        suggested_object_id="washer_energy_total",
    )
    power = registry.async_get_or_create(
        "sensor", "tasmota", "washer-watts", device_id=device.id, suggested_object_id="washer_power"
    )
    hass.states.async_set(
        energy.entity_id,
        "123.4",
        {
            "device_class": "energy",
            "unit_of_measurement": "kWh",
            "state_class": "total_increasing",
            "friendly_name": "Washer lifetime energy",
        },
    )
    hass.states.async_set(
        power.entity_id,
        "50",
        {"device_class": "power", "unit_of_measurement": "W", "state_class": "measurement"},
    )
    metadata = {
        energy.entity_id: (1, {"has_sum": True, "mean_type": 0}),
        power.entity_id: (2, {"has_sum": False, "mean_type": 1}),
    }
    with patch("custom_components.energy_scout.scout.get_metadata", return_value=metadata):
        result = {source.entity_id: source for source in await read_sources(scout)}
        assert result[energy.entity_id].key == energy.id
        assert result[energy.entity_id].area == "Utility room"
        assert result[energy.entity_id].name == "Washer lifetime energy"
        assert result[energy.entity_id].has_sum
        assert result[power.entity_id].has_mean
        assert not result[energy.entity_id].has_mean
        registry.async_update_entity(energy.entity_id, name="Kitchen meter", area_id=override.id)
        result = {source.entity_id: source for source in await read_sources(scout)}
        assert result[energy.entity_id].area == "Kitchen"


async def test_excluded_and_disabled_sources_are_reportable(hass, loaded):
    entry, scout = loaded
    registry = er.async_get(hass)
    disabled = registry.async_get_or_create(
        "sensor",
        "tasmota",
        "disabled-energy",
        original_device_class="energy",
        disabled_by=er.RegistryEntryDisabler.USER,
    )
    hass.states.async_set(
        "sensor.energy_excluded",
        "4",
        {"device_class": "energy", "unit_of_measurement": "kWh", "state_class": "total_increasing"},
    )
    with (
        patch("custom_components.energy_scout.scout.get_metadata", return_value={}),
        patch(
            "custom_components.energy_scout.scout.recorder.is_entity_recorded", return_value=False
        ),
    ):
        result = {source.entity_id: source for source in await read_sources(scout)}
    assert result[disabled.entity_id].disabled
    assert not result["sensor.energy_excluded"].recorded
    assert not result["sensor.energy_excluded"].has_sum


async def test_reading_fluctuations_do_not_schedule_a_scan(hass, loaded):
    _, scout = loaded
    attributes = {
        "device_class": "energy",
        "unit_of_measurement": "kWh",
        "state_class": "total_increasing",
    }
    hass.states.async_set("sensor.energy", "1", attributes)
    await hass.async_block_till_done()
    with patch("custom_components.energy_scout.async_call_later") as schedule:
        hass.states.async_set("sensor.energy", "2", attributes)
        await hass.async_block_till_done()
        schedule.assert_not_called()
        hass.states.async_set("sensor.energy", "2", {**attributes, "unit_of_measurement": "Wh"})
        await hass.async_block_till_done()
        assert schedule.called

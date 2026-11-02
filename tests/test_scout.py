"""Exercise the real HA Energy manager and integration storage."""

from copy import deepcopy
from dataclasses import replace
from unittest.mock import AsyncMock, patch

import probatio
import pytest

from custom_components.energy_scout.scout import ScoutError


async def test_setup_is_read_only_and_scan_has_no_side_effects(loaded):
    _, scout = loaded
    assert scout.adapter.preferences()["device_consumption"] == []
    await scout.async_scan()
    assert scout.candidates[0].selectable
    assert not scout.added
    assert scout.adapter.preferences()["device_consumption"] == []


async def test_add_preserves_all_other_settings_and_is_idempotent(loaded):
    _, scout = loaded
    manager = scout.adapter.manager
    original = {
        "energy_sources": [
            {"type": "grid", "stat_energy_from": "sensor.grid_total", "future_key": "keep"}
        ],
        "device_consumption": [
            {
                "stat_consumption": "sensor.kitchen_total",
                "name": "Kitchen",
                "included_in_stat": "sensor.breaker_total",
            }
        ],
        "device_consumption_water": [{"stat_consumption": "sensor.water"}],
    }
    manager.data = deepcopy(original)
    proposal = {
        "washer-energy-id": {
            "power": "sensor.washer_power",
            "name": "Washer",
            "upstream": "sensor.kitchen_total",
        }
    }
    assert await scout.async_apply(proposal) == 1
    after = scout.adapter.preferences()
    assert after["energy_sources"] == original["energy_sources"]
    assert after["device_consumption_water"] == original["device_consumption_water"]
    assert after["device_consumption"][0] == original["device_consumption"][0]
    assert after["device_consumption"][1] == {
        "stat_consumption": "sensor.washer_energy_total",
        "stat_rate": "sensor.washer_power",
        "name": "Washer",
        "included_in_stat": "sensor.kitchen_total",
    }
    with pytest.raises(ScoutError, match="stale_review"):
        await scout.async_apply(proposal)
    assert len(scout.adapter.preferences()["device_consumption"]) == 2
    assert (await scout.store.async_load())["added"] == scout.added


async def test_fresh_scan_does_not_overwrite_a_change_during_metadata_read(loaded):
    _, scout = loaded
    sources = await scout.async_sources()

    async def scan_and_edit():
        scout.adapter.manager.data = {
            "device_consumption": [
                {"stat_consumption": "sensor.just_added", "name": "Another user"}
            ],
            "energy_sources": [],
        }
        return sources

    with patch.object(scout, "async_sources", scan_and_edit):
        await scout.async_apply({"washer-energy-id": {}})
    assert scout.adapter.preferences()["device_consumption"][0]["name"] == "Another user"


async def test_stale_review_after_sensor_disappears(loaded):
    _, scout = loaded
    with patch.object(scout, "async_sources", AsyncMock(return_value=[])):
        with pytest.raises(ScoutError, match="stale_review"):
            await scout.async_apply({"washer-energy-id": {}})
    assert not scout.adapter.preferences()["device_consumption"]


async def test_rename_during_review_requires_reconfirmation(loaded):
    _, scout = loaded
    with pytest.raises(ScoutError, match="stale_review"):
        await scout.async_apply({"washer-energy-id": {"entity_id": "sensor.previous_name"}})


@pytest.mark.parametrize(
    "proposal, error",
    [
        ({"power": "sensor.unrelated_power"}, "invalid_power"),
        ({"upstream": "sensor.missing_parent"}, "invalid_upstream"),
    ],
)
async def test_invalid_mappings_are_rejected(loaded, proposal, error):
    _, scout = loaded
    with pytest.raises(ScoutError, match=error):
        await scout.async_apply({"washer-energy-id": proposal})
    assert not scout.added


async def test_daily_and_lifetime_total_cannot_be_added_together(loaded, sources):
    _, scout = loaded
    sources.append(replace(sources[0], key="daily", entity_id="sensor.washer_energy_today"))
    with pytest.raises(ScoutError, match="duplicate_counter"):
        await scout.async_apply({"washer-energy-id": {}, "daily": {}})


async def test_changed_entries_are_protected_from_removal(loaded):
    _, scout = loaded
    await scout.async_apply({"washer-energy-id": {}})
    scout.adapter.manager.data["device_consumption"][0]["name"] = "Edited in Energy"
    with pytest.raises(ScoutError, match="modified_entry"):
        await scout.async_remove(["washer-energy-id"])
    assert len(scout.adapter.preferences()["device_consumption"]) == 1


async def test_upstream_dependents_are_protected(loaded):
    _, scout = loaded
    await scout.async_apply({"washer-energy-id": {}})
    scout.adapter.manager.data["device_consumption"].append(
        {"stat_consumption": "sensor.child", "included_in_stat": "sensor.washer_energy_total"}
    )
    with pytest.raises(ScoutError, match="has_children"):
        await scout.async_remove(["washer-energy-id"])


async def test_remove_only_owned_entry_and_keep_other_device(loaded):
    _, scout = loaded
    await scout.async_apply({"washer-energy-id": {}})
    scout.adapter.manager.data["device_consumption"].append(
        {"stat_consumption": "sensor.unrelated"}
    )
    assert await scout.async_remove(["washer-energy-id"]) == 1
    assert scout.adapter.preferences()["device_consumption"] == [
        {"stat_consumption": "sensor.unrelated"}
    ]
    assert not scout.added
    assert scout.hass.states.get("sensor.washer_energy_total") is None  # never creates entities


async def test_ignore_is_persistent_and_reversible(loaded):
    _, scout = loaded
    await scout.async_scan()
    await scout.async_ignore(["washer-energy-id"])
    assert scout.candidates[0].status == "ignored"
    await scout.async_load()
    assert "washer-energy-id" in scout.ignored
    await scout.async_ignore(["washer-energy-id"], restore=True)
    assert scout.candidates[0].selectable


async def test_adapter_rejects_unknown_fields_before_writing(loaded):
    _, scout = loaded
    with pytest.raises(probatio.Invalid):
        await scout.adapter.async_write_devices(
            [{"stat_consumption": "sensor.fake", "typo": "bad"}]
        )
    assert not scout.adapter.preferences()["device_consumption"]


async def test_two_simultaneous_adds_do_not_duplicate(loaded):
    import asyncio

    _, scout = loaded
    results = await asyncio.gather(
        scout.async_apply({"washer-energy-id": {}}),
        scout.async_apply({"washer-energy-id": {}}),
        return_exceptions=True,
    )
    assert sum(isinstance(result, ScoutError) for result in results) == 1
    assert len(scout.adapter.preferences()["device_consumption"]) == 1


async def test_notification_is_deduplicated_and_toggleable(loaded):
    _, scout = loaded
    with (
        patch(
            "custom_components.energy_scout.scout.persistent_notification.async_create"
        ) as create,
        patch(
            "custom_components.energy_scout.scout.persistent_notification.async_dismiss"
        ) as dismiss,
    ):
        await scout.async_scan(notify=True)
        await scout.async_scan(notify=True)
        assert create.call_count == 1
        scout.options["notify_new_devices"] = False
        scout.update_notification()
        assert dismiss.called


async def test_unload_marks_closed_and_keeps_dashboard_entries(hass, loaded):
    entry, scout = loaded
    await scout.async_apply({"washer-energy-id": {}})
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert scout.closed
    assert scout.adapter.preferences()["device_consumption"]
    with pytest.raises(ScoutError, match="stale_review"):
        await scout.async_remove(["washer-energy-id"])

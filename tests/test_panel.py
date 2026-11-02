"""Real HA panel registration and admin-only WebSocket commands."""

from dataclasses import replace

from homeassistant.components.frontend import DATA_PANELS

from custom_components.energy_scout.models import recommendations


async def test_sidebar_is_admin_only_and_removed_on_unload(hass, loaded):
    entry, _ = loaded
    panel = hass.data[DATA_PANELS]["energy-scout"]
    assert panel.require_admin
    assert panel.config["_panel_custom"]["name"] == "energy-scout-panel"
    assert "?v=0.1.0b3" in panel.config["_panel_custom"]["module_url"]
    await hass.config_entries.async_unload(entry.entry_id)
    assert "energy-scout" not in hass.data[DATA_PANELS]


async def test_panel_list_and_batch_add(hass, loaded, hass_ws_client):
    _, scout = loaded
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "energy_scout/list"})
    response = await client.receive_json()
    assert response["success"]
    assert response["result"]["candidates"][0]["recommended"]
    assert "energy_sources" not in response["result"]
    await client.send_json(
        {
            "id": 2,
            "type": "energy_scout/apply",
            "proposals": {
                "washer-energy-id": {
                    "entity_id": "sensor.washer_energy_total",
                    "name": "Laundry",
                    "power": "sensor.washer_power",
                }
            },
        }
    )
    response = await client.receive_json()
    assert response["success"]
    assert response["result"]["count"] == 1
    assert scout.adapter.preferences()["device_consumption"][0]["name"] == "Laundry"
    await client.send_json(
        {
            "id": 3,
            "type": "energy_scout/apply",
            "proposals": {"washer-energy-id": {"entity_id": "sensor.washer_energy_total"}},
        }
    )
    assert (await client.receive_json())["error"]["code"] == "stale_review"


async def test_non_admin_cannot_list_or_mutate(
    hass, loaded, hass_ws_client, hass_read_only_access_token
):
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    for index, command in enumerate(
        [
            {"type": "energy_scout/list"},
            {"type": "energy_scout/apply", "proposals": {}},
            {"type": "energy_scout/manage", "action": "ignore", "keys": ["washer-energy-id"]},
        ],
        1,
    ):
        await client.send_json({"id": index, **command})
        response = await client.receive_json()
        assert not response["success"]
        assert response["error"]["code"] == "unauthorized"


async def test_api_rejects_calls_after_unload(hass, loaded, hass_ws_client):
    entry, _ = loaded
    client = await hass_ws_client(hass)
    await hass.config_entries.async_unload(entry.entry_id)
    await client.send_json({"id": 1, "type": "energy_scout/list"})
    assert (await client.receive_json())["error"]["code"] == "not_loaded"


async def test_35_devices_recommend_one_counter_each(loaded, sources):
    _, scout = loaded
    sources[:] = [
        replace(
            source,
            key=f"{source.key}-{index}",
            device_id=f"device-{index}",
            entity_id=source.entity_id.replace("washer", f"appliance_{index}"),
        )
        for index in range(35)
        for source in sources.copy()
    ]
    # A daily alternative should not make the total disappear or duplicate it.
    sources.append(
        replace(sources[0], key="daily-alternative", entity_id="sensor.appliance_0_energy_today")
    )
    result = await scout.async_scan()
    selected, reasons = recommendations(result)
    assert len(selected) == 35
    assert "daily-alternative" not in selected
    assert "lifetime" in reasons["daily-alternative"]


async def test_tracked_sibling_is_not_bulk_recommended(loaded, sources):
    _, scout = loaded
    sources.append(replace(sources[0], key="tracked-daily", entity_id="sensor.washer_energy_today"))
    scout.adapter.manager.data = {
        "device_consumption": [{"stat_consumption": "sensor.washer_energy_today"}],
        "energy_sources": [],
    }
    selected, reasons = recommendations(await scout.async_scan())
    assert not selected
    assert "already tracked" in reasons["washer-energy-id"]

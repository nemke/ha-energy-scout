"""Admin-only sidebar panel and its local WebSocket API."""

import logging
from dataclasses import asdict
from pathlib import Path

import probatio
from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, NAME, VERSION
from .models import recommendations
from .scout import Scout, ScoutError

_LOGGER = logging.getLogger(__name__)
PANEL_URL = "energy-scout"
ASSET_URL = "/energy_scout_static"


def current_scout(hass: HomeAssistant) -> Scout | None:
    """Handlers never retain a runtime after unload/reload."""
    for entry in hass.config_entries.async_entries(DOMAIN):
        scout = getattr(entry, "runtime_data", None)
        if scout is not None and not scout.closed:
            return scout
    return None


async def async_payload(scout: Scout) -> dict:
    """Send only device-review data, not grid prices or other Energy settings."""
    await scout.async_scan()
    recommended, review_reasons = recommendations(scout.candidates)
    return {
        "candidates": [
            {
                **asdict(item),
                "recommended": item.source.key in recommended,
                "review_reason": review_reasons.get(item.source.key),
            }
            for item in scout.candidates
        ],
        "devices": scout.adapter.preferences().get("device_consumption", []),
        "added": scout.added,
        "ignored": sorted(scout.ignored),
    }


@websocket_api.require_admin
@websocket_api.websocket_command({probatio.Required("type"): "energy_scout/list"})
@websocket_api.async_response
async def ws_list(hass, connection, msg):
    scout = current_scout(hass)
    if scout is None:
        connection.send_error(msg["id"], "not_loaded", "Energy Scout is not loaded")
        return
    try:
        payload = await async_payload(scout)
    except Exception:
        _LOGGER.exception("Could not load Energy Scout panel data")
        connection.send_error(msg["id"], "scan_failed", "Could not read local sensor statistics")
    else:
        connection.send_result(msg["id"], payload)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "energy_scout/apply",
        probatio.Required("proposals"): {
            str: {
                probatio.Required("entity_id"): str,
                probatio.Optional("name"): str,
                probatio.Optional("power"): str,
                probatio.Optional("upstream"): str,
            }
        },
    }
)
@websocket_api.async_response
async def ws_apply(hass, connection, msg):
    scout = current_scout(hass)
    if scout is None:
        connection.send_error(msg["id"], "not_loaded", "Energy Scout is not loaded")
        return
    try:
        count = await scout.async_apply(msg["proposals"])
    except ScoutError as err:
        connection.send_error(msg["id"], str(err), str(err))
    except Exception:
        _LOGGER.exception("Could not finish adding Energy Scout devices")
        connection.send_error(msg["id"], "write_failed", "Check Energy settings before retrying")
    else:
        connection.send_result(msg["id"], {"count": count})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        probatio.Required("type"): "energy_scout/manage",
        probatio.Required("action"): probatio.In(["ignore", "restore", "remove"]),
        probatio.Required("keys"): [str],
    }
)
@websocket_api.async_response
async def ws_manage(hass, connection, msg):
    scout = current_scout(hass)
    if scout is None:
        connection.send_error(msg["id"], "not_loaded", "Energy Scout is not loaded")
        return
    try:
        keys = msg["keys"]
        if not keys:
            raise ScoutError("empty_selection")
        if msg["action"] == "remove":
            count = await scout.async_remove(keys)
        else:
            await scout.async_ignore(keys, restore=msg["action"] == "restore")
            count = len(keys)
    except ScoutError as err:
        connection.send_error(msg["id"], str(err), str(err))
    except Exception:
        _LOGGER.exception("Could not finish managing Energy Scout devices")
        connection.send_error(msg["id"], "write_failed", "Check Energy settings before retrying")
    else:
        connection.send_result(msg["id"], {"count": count})


async def async_register(hass: HomeAssistant) -> None:
    """Install routes once; the sidebar entry is attached per config-entry load."""
    if not hass.data.get("energy_scout_panel_routes"):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(ASSET_URL, str(Path(__file__).parent / "frontend"), True),
            ]
        )
        for command in (ws_list, ws_apply, ws_manage):
            websocket_api.async_register_command(hass, command)
        hass.data["energy_scout_panel_routes"] = True
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name="energy-scout-panel",
        sidebar_title=NAME,
        sidebar_icon="mdi:lightning-bolt",
        module_url=f"{ASSET_URL}/energy-scout-panel.js?v={VERSION}",
        require_admin=True,
    )


@callback
def async_unregister(hass: HomeAssistant) -> None:
    """Static code routes may remain; APIs reject requests without a live runtime."""
    frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)

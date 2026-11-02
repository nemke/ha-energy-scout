"""Disposable real HA frontend with simulated energy metadata, bound to localhost.

Used by Playwright; never connects to the user's HA. State lives in a temporary
directory. Credentials are written only to its private auth file, never logged.
"""

import asyncio
import json
import logging
import os
import signal
import tempfile
from dataclasses import replace
from pathlib import Path

from homeassistant import loader
from homeassistant.auth.const import GROUP_ID_ADMIN
from homeassistant.bootstrap import async_from_config_dict
from homeassistant.components.http.config import async_get_and_load_store
from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from custom_components.energy_scout.const import DOMAIN
from custom_components.energy_scout.models import Source
from custom_components.energy_scout.scout import Scout

ROOT = Path(__file__).resolve().parents[1]
AUTH_PATH = Path(os.environ.get("SCOUT_PREVIEW_AUTH", "/tmp/energy-scout-preview-auth.json"))


def fixtures() -> list[Source]:
    rows = []
    for index in range(1, 36):
        base = Source(
            key=f"device-{index}-energy",
            entity_id=f"sensor.appliance_{index}_energy_total",
            name=f"Appliance {index:02d}",
            device_id=f"device-{index}",
            area=["Kitchen", "Utility", "Living room", "Bedroom"][index % 4],
            device_class="energy",
            unit="kWh",
            state_class="total_increasing",
            value=f"{index * 12.4:.1f}",
            has_sum=True,
        )
        if index == 1:
            base = replace(base, name="Washing machine", area="Utility")
        rows.extend(
            [
                base,
                replace(
                    base,
                    key=f"device-{index}-power",
                    entity_id=f"sensor.appliance_{index}_power",
                    device_class="power",
                    unit="W",
                    state_class="measurement",
                    value="50",
                    has_sum=False,
                    has_mean=True,
                ),
            ]
        )
    rows.append(
        replace(
            rows[0],
            key="washer-daily",
            entity_id="sensor.appliance_1_energy_today",
            name="Washing machine today",
        )
    )
    rows.append(
        replace(
            rows[2],
            key="invalid-counter",
            entity_id="sensor.unavailable_energy",
            name="Offline meter",
            value="unavailable",
            has_sum=False,
        )
    )
    return rows


async def main() -> None:
    logging.basicConfig(level=logging.WARNING)
    with tempfile.TemporaryDirectory(prefix="energy-scout-preview-") as config_dir:
        path = Path(config_dir)
        (path / "custom_components").mkdir()
        (path / "custom_components" / DOMAIN).symlink_to(
            ROOT / "custom_components" / DOMAIN, target_is_directory=True
        )
        hass = HomeAssistant(config_dir)
        loader.async_setup(hass)
        hass.config.skip_pip = True
        # Mark this isolated preview onboarded before loading its frontend.
        await Store(hass, 4, "onboarding").async_save(
            {"done": ["user", "core_config", "integration", "analytics"]}
        )
        await async_from_config_dict(
            {
                "homeassistant": {
                    "name": "Energy Scout Preview",
                    "latitude": 44.8,
                    "longitude": 20.4,
                    "elevation": 100,
                    "unit_system": "metric",
                    "time_zone": "Europe/Belgrade",
                },
                "http": {"server_host": "127.0.0.1", "server_port": 8814},
                "frontend": {},
                "recorder": {},
            },
            hass=hass,
        )
        user = await hass.auth.async_create_user("Preview admin", group_ids=[GROUP_ID_ADMIN])
        refresh = await hass.auth.async_create_refresh_token(
            user, client_id="http://127.0.0.1:8814/"
        )
        token = hass.auth.async_create_access_token(refresh)
        await asyncio.to_thread(
            AUTH_PATH.write_text,
            json.dumps(
                {
                    "hassUrl": "http://127.0.0.1:8814",
                    "access_token": token,
                    "refresh_token": refresh.token,
                    "token_type": "Bearer",
                    "expires_in": 1800,
                }
            ),
        )
        await asyncio.to_thread(AUTH_PATH.chmod, 0o600)

        async def simulated_sources(self):
            return fixtures()

        Scout.async_sources = simulated_sources
        result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
        await hass.config_entries.flow.async_configure(
            result["flow_id"], {"notify_new_devices": False}
        )
        await hass.async_start()
        # Confirm this disposable localhost listener before opening the browser;
        # HTTP setup dialogs are unrelated to the Energy Scout tests.
        http_store = await async_get_and_load_store(hass)
        if http_store.pending is not None:
            await http_store.async_promote_pending()
        print("Energy Scout preview ready at http://127.0.0.1:8814/energy-scout", flush=True)
        done = asyncio.Event()
        for signum in (signal.SIGINT, signal.SIGTERM):
            asyncio.get_running_loop().add_signal_handler(signum, done.set)
        try:
            await done.wait()
        finally:
            await hass.async_stop()
            await asyncio.to_thread(AUTH_PATH.unlink, missing_ok=True)


if __name__ == "__main__":
    asyncio.run(main())

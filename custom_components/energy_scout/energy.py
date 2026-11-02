"""HA Energy adapter. This is the only module using its internal preferences API."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from homeassistant.components.energy.data import (
    DEVICE_CONSUMPTION_SCHEMA,
    EnergyManager,
    async_get_manager,
)
from homeassistant.core import HomeAssistant


class EnergyAdapter:
    """Keep HA's changing Energy API behind a small boundary."""

    def __init__(self, manager: EnergyManager) -> None:
        self.manager = manager

    @classmethod
    async def async_create(cls, hass: HomeAssistant) -> EnergyAdapter:
        """Use the same manager as HA's own Energy configuration UI."""
        return cls(await async_get_manager(hass))

    def preferences(self) -> dict[str, Any]:
        """Never hand mutable manager data to callers."""
        return deepcopy(self.manager.data or self.manager.default_preferences())

    async def async_write_devices(self, devices: list[dict[str, str]]) -> None:
        """Update only device consumption; all other top-level keys stay intact.

        HA 2026.10 sets manager.data before its first await. The caller reads and
        merges synchronously immediately before this call, with no I/O in between.
        """
        validated = [DEVICE_CONSUMPTION_SCHEMA(item) for item in devices]
        await self.manager.async_update({"device_consumption": validated})

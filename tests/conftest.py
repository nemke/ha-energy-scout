"""HA fixtures and representative metering sources."""

from dataclasses import replace
from unittest.mock import AsyncMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_scout.const import DOMAIN
from custom_components.energy_scout.models import Source
from custom_components.energy_scout.scout import Scout


@pytest.fixture
def mock_recorder_before_hass(recorder_db_url):
    """HA's Recorder fixture must prepare its database before HA is constructed."""


@pytest.fixture(autouse=True)
def custom_integrations(enable_custom_integrations):
    """Load this repository's integration instead of a built-in domain."""


@pytest.fixture
def sources():
    energy = Source(
        key="washer-energy-id",
        entity_id="sensor.washer_energy_total",
        name="Washer energy total",
        device_id="washer",
        area="Utility",
        device_class="energy",
        unit="kWh",
        state_class="total_increasing",
        value="123.4",
        has_sum=True,
    )
    return [
        energy,
        replace(
            energy,
            key="washer-power-id",
            entity_id="sensor.washer_power",
            name="Washer power",
            device_class="power",
            unit="W",
            state_class="measurement",
            value="50",
            has_sum=False,
            has_mean=True,
        ),
    ]


@pytest.fixture
async def loaded(hass, recorder_mock, sources):
    """Real HA setup, config entry, Energy manager, storage, and native flows."""
    entry = MockConfigEntry(
        domain=DOMAIN, unique_id=DOMAIN, data={}, options={"notify_new_devices": True}
    )
    entry.add_to_hass(hass)
    with patch.object(Scout, "async_sources", AsyncMock(return_value=sources)):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        yield entry, entry.runtime_data
        await hass.config_entries.async_unload(entry.entry_id)
        await hass.async_block_till_done()

"""Discovery and channel pairing without any device or network access."""

from dataclasses import replace

import pytest

from custom_components.energy_scout.models import discover, numeric, referenced_statistics


def scan(sources, preferences=None, ignored=None):
    return discover(sources, preferences or {}, ignored or set(), {"Wh", "kWh", "MWh"}, {"W", "kW"})


def test_tasmota_total_and_matching_power(sources):
    result = scan(sources)
    assert len(result) == 1
    assert result[0].selectable
    assert result[0].suggested_power == "sensor.washer_power"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("unit", "W"),
        ("state_class", "measurement"),
        ("state_class", None),
        ("has_sum", False),
        ("recorded", False),
        ("disabled", True),
        ("value", "unknown"),
        ("value", "unavailable"),
        ("value", "NaN"),
        ("value", "inf"),
        ("value", "-1"),
        ("value", ""),
    ],
)
def test_invalid_energy_is_explained(sources, field, value):
    result = scan([replace(sources[0], **{field: value})])[0]
    assert not result.selectable
    assert result.status == "needs_attention"
    assert result.reasons


def test_zero_and_legacy_reset_counters(sources):
    assert scan([replace(sources[0], value="0")])[0].selectable
    assert scan([replace(sources[0], state_class="measurement", last_reset=True)])[0].selectable


def test_tracked_in_grid_or_device_roles_is_not_added_twice(sources):
    for prefs in (
        {"device_consumption": [{"stat_consumption": sources[0].entity_id}]},
        {
            "energy_sources": [
                {"type": "grid", "flow_from": [{"stat_energy_from": sources[0].entity_id}]}
            ]
        },
        {"energy_sources": [{"type": "solar", "stat_energy_from": sources[0].entity_id}]},
    ):
        assert scan(sources, prefs)[0].status == "tracked"


def test_ignored_identity_survives_an_entity_rename(sources):
    renamed = replace(sources[0], entity_id="sensor.utility_washer_total")
    assert scan([renamed], ignored={sources[0].key})[0].status == "ignored"


def test_multi_outlet_pairs_channels_not_device_total(sources):
    rows = []
    for outlet in (1, 2):
        for source in sources:
            suffix = "energy_total" if source.device_class == "energy" else "power"
            rows.append(
                replace(
                    source,
                    key=f"{source.key}-{outlet}",
                    entity_id=f"sensor.strip_outlet_{outlet}_{suffix}",
                    device_id="strip",
                )
            )
    result = scan(rows)
    assert len(result) == 2
    assert {item.suggested_power for item in result} == {
        "sensor.strip_outlet_1_power",
        "sensor.strip_outlet_2_power",
    }
    total_power = replace(sources[1], device_id="strip", entity_id="sensor.strip_power")
    for item in scan([row for row in rows if row.device_class == "energy"] + [total_power]):
        assert item.suggested_power is None


def test_daily_total_are_both_reviewable_but_flagged(sources):
    daily = replace(sources[0], key="daily", entity_id="sensor.washer_energy_today")
    result = scan(sources + [daily])
    assert len(result) == 2
    assert all(item.selectable for item in result)
    assert all(any("same consumption" in reason for reason in item.reasons) for item in result)
    assert any("Period counter" in reason for item in result for reason in item.reasons)


def test_power_only_and_ignored_power_only(sources):
    assert scan([sources[1]])[0].status == "power_only"
    assert scan([sources[1]], ignored={sources[1].key})[0].status == "ignored"


def test_unmetered_outlet_is_reported_when_a_sibling_has_energy(sources):
    first = [
        replace(source, entity_id=source.entity_id.replace("washer", "outlet_1"))
        for source in sources
    ]
    second = replace(sources[1], key="outlet-2-power", entity_id="sensor.outlet_2_power")
    result = scan(first + [second])
    assert len(result) == 2
    assert {item.status for item in result} == {"ready", "power_only"}


def test_same_name_on_other_device_is_not_paired(sources):
    assert scan([sources[0], replace(sources[1], device_id="different")])[0].suggested_power is None


def test_unregistered_entities_cannot_be_paired_by_name(sources):
    result = scan([replace(source, device_id=None) for source in sources])
    assert all(item.suggested_power is None for item in result)


@pytest.mark.parametrize("value", ["nan", "-inf", "unavailable", None, "invalid"])
def test_invalid_numeric_never_becomes_zero(value):
    assert not numeric(value)


def test_referenced_statistics_ignores_names_and_parent_links():
    prefs = {
        "device_consumption": [
            {
                "stat_consumption": "sensor.total",
                "name": "sensor.fake",
                "included_in_stat": "sensor.parent",
            }
        ]
    }
    assert referenced_statistics(prefs) == {"sensor.total"}

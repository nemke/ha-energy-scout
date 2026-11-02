"""Discovery rules, kept independent of HA I/O for regression testing."""

import math
import re
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class Source:
    """One existing HA sensor and the metadata needed to assess it."""

    key: str
    entity_id: str
    name: str
    device_id: str | None = None
    area: str = "No area"
    device_class: str | None = None
    unit: str | None = None
    state_class: str | None = None
    value: str = "unknown"
    recorded: bool = True
    has_sum: bool = False
    has_mean: bool = False
    disabled: bool = False
    last_reset: bool = False


@dataclass(slots=True)
class Candidate:
    """A candidate is a sensor, not an entire physical multi-outlet device."""

    source: Source
    status: str
    reasons: list[str] = field(default_factory=list)
    power_choices: list[Source] = field(default_factory=list)
    suggested_power: str | None = None

    @property
    def selectable(self) -> bool:
        """Only currently valid counters can be submitted."""
        return self.status == "ready"

    @property
    def label(self) -> str:
        """Native selectors can show area, name, and the actual entity."""
        return f"{self.source.area} · {self.source.name} ({self.source.entity_id})"


def numeric(value: str, *, nonnegative: bool = False) -> bool:
    """Unknown, NaN, infinity, and invalid readings must never become zero."""
    try:
        number = float(value)
    except TypeError, ValueError:
        return False
    return math.isfinite(number) and (not nonnegative or number >= 0)


def channel_name(entity_id: str) -> str:
    """A naming hint only; device membership is always required as well."""
    words = re.split(r"[_\W]+", entity_id.split(".", 1)[-1].lower())
    return "_".join(
        word
        for word in words
        if word not in {"energy", "power", "total", "consumption", "today", "yesterday", "daily"}
    )


def referenced_statistics(preferences: dict[str, Any]) -> set[str]:
    """Find existing device and source usage without interpreting tariffs."""
    result: set[str] = set()

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                if key.startswith("stat_") and isinstance(item, str):
                    result.add(item)
                elif isinstance(item, (list, dict)):
                    walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(preferences)
    return result


def discover(
    sources: list[Source],
    preferences: dict[str, Any],
    ignored: set[str],
    energy_units: set[str],
    power_units: set[str],
) -> list[Candidate]:
    """Assess counters; suggestions never infer import/export or upstream roles."""
    tracked = referenced_statistics(preferences)
    power = [
        source
        for source in sources
        if source.device_class == "power"
        and source.unit in power_units
        and source.state_class == "measurement"
        and source.recorded
        and source.has_mean
        and not source.disabled
        and numeric(source.value, nonnegative=True)
        and source.entity_id not in tracked
    ]
    energy = [source for source in sources if source.device_class == "energy"]
    results: list[Candidate] = []
    for source in energy:
        candidate = Candidate(source, "ready")
        if source.entity_id in tracked:
            candidate.status = "tracked"
            candidate.reasons.append("Already used in Energy settings")
        elif source.key in ignored:
            candidate.status = "ignored"
            candidate.reasons.append("Ignored; restore it from Energy Scout options")
        else:
            if source.disabled:
                candidate.reasons.append("Entity is disabled")
            if source.unit not in energy_units:
                candidate.reasons.append("Unsupported energy unit")
            if source.state_class not in {"total", "total_increasing"} and not (
                source.state_class == "measurement" and source.last_reset
            ):
                candidate.reasons.append("Missing a supported cumulative state class")
            if not source.recorded:
                candidate.reasons.append("Excluded from Recorder")
            if not source.has_sum:
                candidate.reasons.append("Waiting for valid Recorder sum statistics")
            if not numeric(source.value, nonnegative=True):
                candidate.reasons.append("Current reading is unavailable or invalid")
            if candidate.reasons:
                candidate.status = "needs_attention"
        if candidate.selectable:
            alternatives = [
                other
                for other in energy
                if other.key != source.key
                and source.device_id is not None
                and other.device_id == source.device_id
                and channel_name(other.entity_id) == channel_name(source.entity_id)
            ]
            if alternatives:
                candidate.reasons.append(
                    "Other counters may cover the same consumption; choose one"
                )
            if re.search(
                r"\b(today|yesterday|daily|monthly|weekly)\b", source.entity_id.replace("_", " ")
            ):
                candidate.reasons.append("Period counter; prefer its lifetime total when available")
            candidate.reasons.append(
                "Verify this measures appliance consumption, not production or a whole-house total"
            )
            candidate.power_choices = [
                other for other in power if source.device_id and other.device_id == source.device_id
            ]
            matches = [
                other
                for other in candidate.power_choices
                if channel_name(other.entity_id) == channel_name(source.entity_id)
            ]
            # An entire power strip's one meter must not be assigned to every outlet.
            if len(matches) == 1:
                candidate.suggested_power = matches[0].entity_id
            elif (
                len(candidate.power_choices) == 1
                and sum(other.device_id == source.device_id for other in energy) == 1
            ):
                candidate.suggested_power = candidate.power_choices[0].entity_id
        results.append(candidate)

    for source in power:
        device_energy = [
            other for other in energy if source.device_id and other.device_id == source.device_id
        ]
        matches = [
            other
            for other in device_energy
            if channel_name(other.entity_id) == channel_name(source.entity_id)
        ]
        single_pair = (
            len(device_energy) == 1
            and sum(other.device_id == source.device_id for other in power) == 1
        )
        if not matches and not single_pair:
            results.append(
                Candidate(
                    source,
                    "ignored" if source.key in ignored else "power_only",
                    ["No confidently matched energy counter; no sensor is created automatically"],
                )
            )
    return sorted(
        results,
        key=lambda candidate: (
            candidate.source.area.casefold(),
            candidate.source.name.casefold(),
            candidate.source.entity_id,
        ),
    )

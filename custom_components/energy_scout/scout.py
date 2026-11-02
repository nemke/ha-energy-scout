"""Local discovery, reviewed changes, and integration-owned bookkeeping."""

import asyncio
import logging
from copy import deepcopy
from datetime import timedelta
from functools import partial
from typing import Any

from homeassistant.components import persistent_notification, recorder
from homeassistant.components.recorder.statistics import get_metadata
from homeassistant.const import UnitOfEnergy, UnitOfPower
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .const import CONF_NOTIFY, NOTIFICATION_ID
from .energy import EnergyAdapter
from .models import Candidate, Source, channel_name, discover, referenced_statistics

_LOGGER = logging.getLogger(__name__)


class ScoutError(Exception):
    """A review cannot be applied safely; show a translated flow error."""


class Scout:
    """One runtime per HA instance. No network connection or device polling."""

    def __init__(
        self, hass: HomeAssistant, adapter: EnergyAdapter, store: Store, options: dict
    ) -> None:
        self.hass = hass
        self.adapter = adapter
        self.store = store
        self.options = options
        self.ignored: set[str] = set()
        self.added: dict[str, dict[str, Any]] = {}
        self.candidates: list[Candidate] = []
        self.lock = asyncio.Lock()
        self._notification_keys: set[str] = set()
        self.closed = False

    async def async_load(self) -> None:
        """Persist only exclusions and ownership; Energy remains the source of truth."""
        saved = await self.store.async_load() or {}
        self.ignored = set(saved.get("ignored", []))
        self.added = saved.get("added", {})

    async def _async_save(self) -> None:
        await self.store.async_save({"ignored": sorted(self.ignored), "added": self.added})

    async def async_sources(self) -> list[Source]:
        """Read HA metadata, with SQL work on Recorder's executor."""
        registry = er.async_get(self.hass)
        devices = dr.async_get(self.hass)
        areas = ar.async_get(self.hass)
        # Include disabled registered energy sensors so the report explains them.
        entries = {
            entry.entity_id: entry
            for entry in registry.entities.values()
            if entry.domain == "sensor"
        }
        entity_ids = set(entries) | {
            state.entity_id for state in self.hass.states.async_all("sensor")
        }
        metadata = await recorder.get_instance(self.hass).async_add_executor_job(
            partial(get_metadata, self.hass, statistic_ids=entity_ids)
        )
        sources: list[Source] = []
        for entity_id in sorted(entity_ids):
            entry = entries.get(entity_id)
            state = self.hass.states.get(entity_id)
            attributes = state.attributes if state else {}
            device_class = attributes.get("device_class") or (
                entry.device_class or entry.original_device_class if entry else None
            )
            if device_class not in {"energy", "power"}:
                continue
            device = devices.async_get(entry.device_id) if entry and entry.device_id else None
            area_id = (entry.area_id if entry else None) or (device.area_id if device else None)
            area = areas.async_get_area(area_id) if area_id else None
            data = metadata.get(entity_id, (None, {}))[1]
            device_name = (device.name_by_user or device.name) if device else None
            name = (
                attributes.get("friendly_name")
                or (entry.name or entry.original_name if entry else None)
                or device_name
                or entity_id
            )
            sources.append(
                Source(
                    key=entry.id if entry else entity_id,
                    entity_id=entity_id,
                    name=name,
                    device_id=entry.device_id if entry else None,
                    area=area.name if area else "No area",
                    device_class=device_class,
                    unit=attributes.get("unit_of_measurement"),
                    state_class=attributes.get("state_class"),
                    value=state.state if state else "unknown",
                    recorded=recorder.is_entity_recorded(self.hass, entity_id),
                    has_sum=data.get("has_sum", False),
                    has_mean=bool(data.get("has_mean") or data.get("mean_type")),
                    disabled=bool(entry and entry.disabled),
                    last_reset=bool(attributes.get("last_reset")),
                    original_name=entry.original_name if entry else None,
                    translation_key=entry.translation_key if entry else None,
                )
            )
        return sources

    async def _async_scan(self) -> list[Candidate]:
        sources = await self.async_sources()
        self.candidates = discover(
            sources, self.adapter.preferences(), self.ignored, set(UnitOfEnergy), set(UnitOfPower)
        )
        return self.candidates

    async def async_scan(self, *, notify: bool = False) -> list[Candidate]:
        """Serialize scans with writes; never poll a physical device."""
        async with self.lock:
            result = await self._async_scan()
        if notify and not self.closed:
            self.update_notification()
        return result

    def update_notification(self) -> None:
        """One replaceable notification, only when the candidate set changes."""
        keys = {item.source.key for item in self.candidates if item.selectable}
        if not self.options.get(CONF_NOTIFY, True) or not keys:
            persistent_notification.async_dismiss(self.hass, NOTIFICATION_ID)
        elif keys != self._notification_keys:
            persistent_notification.async_create(
                self.hass,
                f"{len(keys)} energy counter(s) are ready for review. "
                "Open [Energy Scout](/energy-scout) "
                "to select devices for the Energy dashboard. Nothing has been added automatically.",
                title="Energy Scout found energy counters",
                notification_id=NOTIFICATION_ID,
            )
        self._notification_keys = keys

    async def async_background_scan(self, _now=None) -> None:
        """A transient startup/Recorder failure must not crash the integration."""
        if self.closed:
            return
        try:
            await self.async_scan(notify=True)
        except Exception:  # HA reports the failure in logs; later local scans can retry.
            _LOGGER.exception("Could not scan local Energy metadata; next scan will retry")

    async def async_apply(self, proposals: dict[str, dict[str, str]]) -> int:
        """Revalidate the review, then merge into freshly read Energy settings."""
        async with self.lock:
            if self.closed:
                raise ScoutError("stale_review")
            candidates = {item.source.key: item for item in await self._async_scan()}
            if self.closed:
                raise ScoutError("stale_review")
            additions: list[tuple[str, dict[str, str]]] = []
            channels: set[tuple[str, str]] = set()
            used_power: set[str] = set()
            for key, proposal in proposals.items():
                item = candidates.get(key)
                if item is None or not item.selectable:
                    raise ScoutError("stale_review")
                source = item.source
                if proposal.get("entity_id", source.entity_id) != source.entity_id:
                    raise ScoutError("stale_review")
                if source.device_id:
                    channel = (source.device_id, channel_name(source.entity_id))
                    if channel in channels:
                        raise ScoutError("duplicate_counter")
                    channels.add(channel)
                config = {"stat_consumption": source.entity_id}
                if name := proposal.get("name", "").strip():
                    config["name"] = name[:100]
                if power := proposal.get("power"):
                    if power in used_power or power not in {
                        choice.entity_id for choice in item.power_choices
                    }:
                        raise ScoutError("invalid_power")
                    config["stat_rate"] = power
                    used_power.add(power)
                if parent := proposal.get("upstream"):
                    config["included_in_stat"] = parent
                additions.append((key, config))
            if not additions:
                raise ScoutError("empty_selection")
            # No await from this read to manager.async_update's synchronous merge.
            current = self.adapter.preferences()
            devices = current.get("device_consumption", [])
            existing = {device["stat_consumption"] for device in devices}
            if any(
                config.get("included_in_stat") not in existing
                for _, config in additions
                if "included_in_stat" in config
            ):
                raise ScoutError("invalid_upstream")
            # Already covered counters on a device must remain a review decision.
            # Exact IDs are always rejected, including roles outside Individual devices.
            if any(
                config["stat_consumption"] in referenced_statistics(current)
                for _, config in additions
            ):
                raise ScoutError("stale_review")
            await self.adapter.async_write_devices(devices + [config for _, config in additions])
            for key, config in additions:
                self.added[key] = deepcopy(config)
            await self._async_save()
            await self._async_scan()
        self.update_notification()
        return len(additions)

    async def async_remove(self, keys: list[str]) -> int:
        """Remove only exact entries still matching the integration's ownership log."""
        async with self.lock:
            if self.closed:
                raise ScoutError("stale_review")
            current = self.adapter.preferences()
            devices = current.get("device_consumption", [])
            selected = [self.added[key] for key in keys if key in self.added]
            if len(selected) != len(set(keys)) or not selected:
                raise ScoutError("stale_review")
            if any(config not in devices for config in selected):
                raise ScoutError("modified_entry")
            ids = {config["stat_consumption"] for config in selected}
            remaining = [device for device in devices if device not in selected]
            if any(device.get("included_in_stat") in ids for device in remaining):
                raise ScoutError("has_children")
            await self.adapter.async_write_devices(remaining)
            for key in keys:
                self.added.pop(key, None)
            await self._async_save()
            await self._async_scan()
        self.update_notification()
        return len(selected)

    async def async_ignore(self, keys: list[str], *, restore: bool = False) -> None:
        """Registry IDs keep exclusions intact across entity renames."""
        async with self.lock:
            if self.closed:
                raise ScoutError("stale_review")
            if restore:
                self.ignored.difference_update(keys)
            else:
                allowed = {
                    item.source.key
                    for item in self.candidates
                    if item.status not in {"tracked", "ignored"}
                }
                if not set(keys) <= allowed:
                    raise ScoutError("stale_review")
                self.ignored.update(keys)
            await self._async_save()
            await self._async_scan()
        self.update_notification()

    def report(self) -> str:
        """Native flow Markdown, bounded for large installations."""
        labels = {
            "ready": "Ready to review",
            "tracked": "Already tracked",
            "needs_attention": "Needs attention",
            "power_only": "Power only",
            "ignored": "Ignored",
        }
        sections = []
        for status, label in labels.items():
            items = [item for item in self.candidates if item.status == status]
            if not items:
                continue
            lines = [f"**{label} ({len(items)})**"]
            for item in items[:30]:
                # Names are displayed as text, not links or user-supplied Markdown.
                name = item.source.name.replace("[", "").replace("]", "").replace("\n", " ")
                lines.append(f"- {item.source.area} · {name} — `{item.source.entity_id}`")
                if item.reasons:
                    lines.append("  " + "; ".join(item.reasons))
            if len(items) > 30:
                lines.append(f"…and {len(items) - 30} more; the selector includes all results.")
            sections.append("\n".join(lines))
        return (
            "\n\n".join(sections)
            or "No energy or power sensors found. Check that the device integration exposes metering entities."
        )


RESCAN_INTERVAL = timedelta(minutes=5)

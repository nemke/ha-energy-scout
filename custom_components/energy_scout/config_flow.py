"""Native HA dialogs: scan, select, customize, review, and apply."""

import logging
from typing import Any

import probatio
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import CONF_NOTIFY, DOMAIN, NAME
from .scout import Scout, ScoutError

_LOGGER = logging.getLogger(__name__)


def select(options: list[dict[str, str]], *, multiple: bool = False):
    """Use native selectors with stable registry IDs as values."""
    return selector.SelectSelector(
        selector.SelectSelectorConfig(
            options=options,
            multiple=multiple,
            mode=selector.SelectSelectorMode.DROPDOWN,
        )
    )


class EnergyScoutConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Only enable discovery at setup. No Energy edits happen here."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(
                title=NAME, data={}, options={CONF_NOTIFY: user_input.get(CONF_NOTIFY, True)}
            )
        return self.async_show_form(
            step_id="user",
            data_schema=probatio.Schema(
                {
                    probatio.Optional(CONF_NOTIFY, default=True): selector.BooleanSelector(),
                }
            ),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return EnergyScoutOptionsFlow()


class EnergyScoutOptionsFlow(config_entries.OptionsFlow):
    """Keep review drafts in this flow, never rebuilt by state refreshes."""

    def __init__(self) -> None:
        self.proposals: dict[str, dict[str, str]] = {}
        self.edit_key: str | None = None
        self.remove_keys: list[str] = []

    @property
    def scout(self) -> Scout:
        return self.config_entry.runtime_data

    async def async_step_init(self, user_input=None):
        if self.config_entry.state is not config_entries.ConfigEntryState.LOADED:
            return self.async_abort(reason="not_loaded")
        try:
            await self.scout.async_scan()
        except Exception:
            _LOGGER.exception("Could not read local sensor statistics")
            return self.async_abort(reason="scan_failed")
        options = ["report", "settings"]
        if any(item.selectable for item in self.scout.candidates):
            options.insert(0, "review")
        if any(item.status not in {"tracked", "ignored"} for item in self.scout.candidates):
            options.append("ignore")
        if self.scout.ignored:
            options.append("restore")
        if self.scout.added:
            options.append("remove")
        return self.async_show_menu(step_id="init", menu_options=options)

    async def async_step_report(self, user_input=None):
        if user_input is not None:
            return await self.async_step_init()
        return self.async_show_form(
            step_id="report",
            data_schema=probatio.Schema({}),
            description_placeholders={"report": self.scout.report()},
        )

    async def async_step_review(self, user_input=None):
        errors = {}
        items = {item.source.key: item for item in self.scout.candidates if item.selectable}
        if user_input is not None:
            keys = user_input.get("sensors", [])
            if not keys or not set(keys) <= items.keys():
                errors["base"] = "empty_selection"
            else:
                self.proposals = {
                    key: {
                        "entity_id": items[key].source.entity_id,
                        "name": items[key].source.name,
                        "power": items[key].suggested_power or "",
                        "upstream": "",
                    }
                    for key in keys
                }
                return await self.async_step_confirm()
        return self.async_show_form(
            step_id="review",
            errors=errors,
            data_schema=probatio.Schema(
                {
                    probatio.Required("sensors", default=[]): select(
                        [{"value": key, "label": item.label} for key, item in items.items()],
                        multiple=True,
                    ),
                }
            ),
            description_placeholders={"report": self.scout.report()},
        )

    def summary(self) -> str:
        lines = []
        for proposal in self.proposals.values():
            name = proposal["name"].replace("`", "").replace("\n", " ")
            if name:
                lines.append(f"{name}")
            lines.append(f"- `{proposal['entity_id']}`")
            lines.append(
                f"  Power: `{proposal['power']}`" if proposal["power"] else "  Power: none"
            )
            if proposal["upstream"]:
                lines.append(f"  Included in: `{proposal['upstream']}`")
        return "\n".join(lines)

    async def async_step_confirm(self, user_input=None):
        errors = {}
        if user_input is not None:
            action = user_input.get("action")
            if action == "customize":
                return await self.async_step_customize()
            if action == "back":
                return await self.async_step_review()
            if action == "apply":
                try:
                    count = await self.scout.async_apply(self.proposals)
                except ScoutError as err:
                    errors["base"] = str(err)
                except Exception:
                    _LOGGER.exception("Could not finish adding reviewed Energy devices")
                    errors["base"] = "write_failed"
                else:
                    return self.async_abort(
                        reason="devices_added", description_placeholders={"count": str(count)}
                    )
        return self.async_show_form(
            step_id="confirm",
            errors=errors,
            data_schema=probatio.Schema(
                {
                    probatio.Required("action", default="apply"): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=["apply", "customize", "back"],
                            translation_key="review_action",
                        )
                    ),
                }
            ),
            description_placeholders={"summary": self.summary(), "count": str(len(self.proposals))},
        )

    async def async_step_customize(self, user_input=None):
        errors = {}
        if user_input is not None:
            key = user_input.get("sensor")
            if key in self.proposals:
                self.edit_key = key
                return await self.async_step_mapping()
            errors["base"] = "empty_selection"
        return self.async_show_form(
            step_id="customize",
            errors=errors,
            data_schema=probatio.Schema(
                {
                    probatio.Required("sensor"): select(
                        [
                            {"value": key, "label": proposal["entity_id"]}
                            for key, proposal in self.proposals.items()
                        ]
                    ),
                }
            ),
        )

    async def async_step_mapping(self, user_input=None):
        if self.edit_key not in self.proposals:
            return await self.async_step_confirm()
        item = next(
            (item for item in self.scout.candidates if item.source.key == self.edit_key), None
        )
        if item is None:
            return self.async_abort(reason="stale_review")
        current = self.proposals[self.edit_key]
        if user_input is not None:
            current.update(
                {
                    "name": user_input.get("name", ""),
                    "power": user_input.get("power", ""),
                    "upstream": user_input.get("upstream", ""),
                }
            )
            return await self.async_step_confirm()
        power = [{"value": "", "label": "None — energy only"}] + [
            {"value": source.entity_id, "label": f"{source.name} ({source.entity_id})"}
            for source in item.power_choices
        ]
        upstream = [{"value": "", "label": "None — independent device"}] + [
            {
                "value": device["stat_consumption"],
                "label": device.get("name", device["stat_consumption"]),
            }
            for device in self.scout.adapter.preferences().get("device_consumption", [])
        ]
        return self.async_show_form(
            step_id="mapping",
            data_schema=probatio.Schema(
                {
                    probatio.Optional("name", default=current["name"]): selector.TextSelector(
                        selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT)
                    ),
                    probatio.Required("power", default=current["power"]): select(power),
                    probatio.Required("upstream", default=current["upstream"]): select(upstream),
                }
            ),
            description_placeholders={"entity_id": current["entity_id"]},
        )

    async def _async_exclusions(self, step: str, user_input: dict[str, Any] | None):
        restoring = step == "restore"
        choices = {
            item.source.key: item.label
            for item in self.scout.candidates
            if item.status not in {"tracked", "ignored"}
        }
        if restoring:
            labels = {item.source.key: item.label for item in self.scout.candidates}
            choices = {
                key: labels.get(key, f"Saved suggestion ({key})") for key in self.scout.ignored
            }
        errors = {}
        if user_input is not None:
            keys = user_input.get("sensors", [])
            if not keys or not set(keys) <= choices.keys():
                errors["base"] = "empty_selection"
            else:
                try:
                    await self.scout.async_ignore(keys, restore=restoring)
                except Exception:
                    _LOGGER.exception("Could not save suggestion exclusions")
                    errors["base"] = "write_failed"
                else:
                    return await self.async_step_init()
        return self.async_show_form(
            step_id=step,
            errors=errors,
            data_schema=probatio.Schema(
                {
                    probatio.Required("sensors", default=[]): select(
                        [{"value": key, "label": label} for key, label in choices.items()],
                        multiple=True,
                    ),
                }
            ),
        )

    async def async_step_ignore(self, user_input=None):
        return await self._async_exclusions("ignore", user_input)

    async def async_step_restore(self, user_input=None):
        return await self._async_exclusions("restore", user_input)

    async def async_step_remove(self, user_input=None):
        errors = {}
        if user_input is not None:
            keys = user_input.get("sensors", [])
            if keys and set(keys) <= self.scout.added.keys():
                self.remove_keys = keys
                return await self.async_step_confirm_remove()
            errors["base"] = "empty_selection"
        return self.async_show_form(
            step_id="remove",
            errors=errors,
            data_schema=probatio.Schema(
                {
                    probatio.Required("sensors", default=[]): select(
                        [
                            {"value": key, "label": entry["stat_consumption"]}
                            for key, entry in self.scout.added.items()
                        ],
                        multiple=True,
                    ),
                }
            ),
        )

    async def async_step_confirm_remove(self, user_input=None):
        errors = {}
        if user_input is not None:
            if not user_input.get("confirm", False):
                return await self.async_step_init()
            try:
                count = await self.scout.async_remove(self.remove_keys)
            except ScoutError as err:
                errors["base"] = str(err)
            except Exception:
                _LOGGER.exception("Could not finish removing Energy Scout entries")
                errors["base"] = "write_failed"
            else:
                return self.async_abort(
                    reason="devices_removed", description_placeholders={"count": str(count)}
                )
        summary = "\n".join(
            f"- `{self.scout.added[key]['stat_consumption']}`"
            for key in self.remove_keys
            if key in self.scout.added
        )
        return self.async_show_form(
            step_id="confirm_remove",
            errors=errors,
            data_schema=probatio.Schema(
                {
                    probatio.Required("confirm", default=False): selector.BooleanSelector(),
                }
            ),
            description_placeholders={"summary": summary},
        )

    async def async_step_settings(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(
                title="", data={CONF_NOTIFY: user_input.get(CONF_NOTIFY, True)}
            )
        return self.async_show_form(
            step_id="settings",
            data_schema=probatio.Schema(
                {
                    probatio.Optional(
                        CONF_NOTIFY, default=self.config_entry.options.get(CONF_NOTIFY, True)
                    ): selector.BooleanSelector(),
                }
            ),
        )

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { loadHAComponents } from './ha-components';

interface Hass {
  user?: { is_admin: boolean };
  connection: unknown;
  callWS<T>(message: unknown): Promise<T>;
}
interface Source {
  key: string;
  entity_id: string;
  name: string;
  area: string;
  value: string;
  unit: string;
}
interface Candidate {
  source: Source;
  status: string;
  reasons: string[];
  power_choices: Source[];
  suggested_power: string | null;
  recommended: boolean;
  review_reason?: string;
}
interface Device {
  stat_consumption: string;
  name?: string;
  stat_rate?: string;
  included_in_stat?: string;
}
interface Payload {
  candidates: Candidate[];
  devices: Device[];
  added: Record<string, Device>;
  ignored: string[];
}
interface Draft {
  entity_id: string;
  name: string;
  power: string;
  upstream: string;
}
interface Table extends HTMLElement {
  selectAll(filter?: (row: Row) => boolean): void;
  clearSelection(): void;
}
interface Row {
  id: string;
  item: Candidate;
  name: string;
  area: string;
  energy: string;
  power: string;
  upstream: string;
  status: string;
  selectable: boolean;
  recommended: boolean;
}
const labels: Record<string, string> = {
  ready: 'Ready',
  tracked: 'Already tracked',
  needs_attention: 'Needs attention',
  power_only: 'Power only',
  ignored: 'Ignored',
};
const errors: Record<string, string> = {
  stale_review:
    'Sensors or Energy settings changed. Rescan and review the selection again.',
  duplicate_counter:
    'Two selected counters appear to measure the same channel. Select one, preferably its lifetime total.',
  invalid_power:
    'A power mapping is unavailable or shared by several selected counters. Edit those mappings.',
  invalid_upstream:
    'An upstream device changed. Edit the mapping before adding.',
  modified_entry:
    'An entry was changed outside Energy Scout. Manage it in Energy settings.',
  has_children:
    'A selected entry is an upstream device for another entry. Adjust that relationship in Energy settings first.',
  not_loaded: 'Energy Scout is not loaded. Reload the integration in Settings.',
  unauthorized: 'An administrator account is required.',
  write_failed:
    'The operation could not finish. Rescan and check Energy settings before retrying.',
};

@customElement('energy-scout-panel')
export class EnergyScoutPanel extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @property({ type: Boolean }) narrow = false;
  @state() private payload?: Payload;
  @state() private ready = false;
  @state() private compact = false;
  @state() private filtersOpen = false;
  private resize?: ResizeObserver;
  private get isNarrow() {
    return this.narrow || this.compact;
  }
  @state() private busy = false;
  @state() private selecting = false;
  private selectionId = 0;
  @state() private error = '';
  @state() private notice = '';
  @state() private filters = { status: 'all', area: 'all' };
  @state() private search = '';
  @state() private selected: string[] = [];
  @state() private drafts: Record<string, Draft> = {};
  @state() private editing?: string;
  @state() private reviewing: 'add' | 'remove' | null = null;
  private loading?: Promise<void>;
  private alive = false;
  private request = 0;
  private started = false;
  private lastConnection?: unknown;

  connectedCallback() {
    super.connectedCallback();
    this.alive = true;
    this.resize = new ResizeObserver((entries) => {
      this.compact = entries[0].contentRect.width < 700;
    });
    this.resize.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.alive = false;
    this.request++;
    this.selectionId++;
    this.started = false;
    this.resize?.disconnect();
  }
  protected updated(changes: PropertyValues) {
    if (
      changes.has('hass') &&
      this.hass &&
      this.alive &&
      !this.loading &&
      (!this.started || this.lastConnection !== this.hass.connection)
    ) {
      this.started = true;
      this.lastConnection = this.hass.connection;
      this.loading = this.start().finally(() => {
        this.loading = undefined;
      });
    }
  }
  private async start() {
    this.busy = true;
    try {
      await loadHAComponents(this);
      this.ready = true;
      await this.load();
    } catch (err) {
      this.error = this.message(err);
    } finally {
      this.busy = false;
    }
  }
  private message(err: unknown) {
    const issue = err as { code?: string; message?: string };
    return (
      errors[issue?.code || ''] ||
      issue?.message ||
      'The operation could not finish. Please retry.'
    );
  }
  private async load() {
    if (!this.hass) return;
    const request = ++this.request;
    const data = await this.hass.callWS<Payload>({ type: 'energy_scout/list' });
    if (!this.alive || request !== this.request) return;
    this.payload = data;
    // Rescans never replace edited draft values. Apply revalidates their source IDs.
  }
  private async rescan() {
    this.busy = true;
    this.error = '';
    try {
      await this.load();
    } catch (err) {
      this.error = this.message(err);
    } finally {
      this.busy = false;
    }
  }
  private get table() {
    return this.renderRoot.querySelector<Table>('ha-data-table');
  }
  private draft(item: Candidate): Draft {
    return (
      this.drafts[item.source.key] || {
        entity_id: item.source.entity_id,
        name: item.source.name,
        power: item.suggested_power || '',
        upstream: '',
      }
    );
  }
  private get chosen() {
    return (this.payload?.candidates || []).filter((item) =>
      this.selected.includes(item.source.key),
    );
  }
  private get visible() {
    const query = this.search.trim().toLowerCase();
    return (this.payload?.candidates || []).filter((item) => {
      const state = this.filters.status;
      return (
        (this.filters.area === 'all' ||
          item.source.area === this.filters.area) &&
        (state === 'all' ||
          state === item.status ||
          (state === 'recommended' && item.recommended) ||
          (state === 'choice' &&
            item.status === 'ready' &&
            !item.recommended)) &&
        (!query ||
          `${item.source.name} ${item.source.entity_id} ${item.source.area} ${item.suggested_power || ''}`
            .toLowerCase()
            .includes(query))
      );
    });
  }
  private rows(items: Candidate[]): Row[] {
    return items.map((item) => {
      const existing = this.payload?.devices.find(
        (device) => device.stat_consumption === item.source.entity_id,
      );
      return {
        id: item.source.key,
        item,
        name: existing?.name || this.draft(item).name || item.source.name,
        area: item.source.area,
        energy: item.source.entity_id,
        power: existing?.stat_rate || this.draft(item).power,
        upstream: existing?.included_in_stat || this.draft(item).upstream,
        status: item.recommended
          ? 'Recommended'
          : item.status === 'ready'
            ? 'Review choice'
            : labels[item.status],
        recommended: item.recommended,
        selectable:
          !this.busy &&
          (item.status !== 'tracked' || !!this.payload?.added[item.source.key]),
      };
    });
  }
  private selectionChanged(ev: CustomEvent<{ value: string[] }>) {
    if (
      ev.detail.value.length === this.selected.length &&
      ev.detail.value.every((key, index) => key === this.selected[index])
    )
      return;
    this.selected = ev.detail.value;
    const drafts = { ...this.drafts };
    for (const item of this.chosen)
      if (!drafts[item.source.key]) drafts[item.source.key] = this.draft(item);
    this.drafts = drafts;
  }
  private clear() {
    this.selectionId++;
    this.selecting = false;
    this.table?.clearSelection();
    this.selected = [];
  }
  private async selectBatch(recommended: boolean) {
    if (this.busy || this.selecting) return;
    const desired = new Set(
      this.visible
        .filter((item) =>
          recommended ? item.recommended : item.status === 'ready',
        )
        .map((item) => item.source.key),
    );
    if (!desired.size) {
      this.clear();
      return;
    }
    const token = ++this.selectionId;
    this.selecting = true;
    this.error = '';
    try {
      await this.updateComplete;
      const deadline = performance.now() + 2000;
      // HA sorts/filters its table asynchronously. Use only public selection
      // methods and its selection-changed event, rather than private row state
      // or a fixed delay that could select rows from the previous scan.
      while (this.alive && token === this.selectionId && !this.busy) {
        this.table?.selectAll((row) => desired.has(row.id));
        if (
          this.selected.length === desired.size &&
          this.selected.every((key) => desired.has(key))
        )
          return;
        if (performance.now() > deadline)
          throw new Error(
            'The device list changed. Review the current view and try selecting again.',
          );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }
    } catch (err) {
      this.error = this.message(err);
    } finally {
      if (token === this.selectionId) this.selecting = false;
    }
  }
  private updateFilters(
    ev: CustomEvent<{ value: { status: string; area: string } }>,
  ) {
    this.clear();
    this.filters = {
      status: ev.detail.value.status || 'all',
      area: ev.detail.value.area || 'all',
    };
  }
  private columns(review = false) {
    const columns = {
      name: {
        title: 'Device / counter',
        sortable: true,
        flex: 1,
        main: true,
        minWidth: this.isNarrow ? '170px' : '260px',
        template: (row: Row) =>
          html`<div>${row.name}</div>
            <div
              style="font-size:11px;color:var(--secondary-text-color);overflow-wrap:anywhere;white-space:normal;line-height:15px"
            >
              ${row.energy}${this.isNarrow ? html`<div>${review ? `Power: ${row.power || 'None'}` : `${row.item.source.value} ${row.item.source.unit || ''} · ${row.area}`}</div>` : nothing}${this.isNarrow && review ? html`<div>Upstream: ${row.upstream || 'None'}</div>` : nothing}
            </div>`,
      },
      area: { title: 'Room', sortable: true, minWidth: '110px' },
      power: {
        title: 'Power source',
        minWidth: '210px',
        template: (row: Row) =>
          html`<span class="entity">${row.power || 'Energy only'}</span>`,
      },
      status: {
        title: review ? 'Upstream' : 'Status',
        sortable: !review,
        minWidth: '150px',
        template: (row: Row) =>
          review
            ? html`${row.upstream || 'Independent device'}`
            : html`<span
                class="badge ${row.item.recommended ? 'recommended' : row.item.status}"
                >${row.status}</span
              >`,
      },
      edit: {
        title: review ? '' : 'Mapping',
        showNarrow: true,
        minWidth: '64px',
        template: (row: Row) =>
          row.item.status === 'ready'
            ? html`<ha-button
                appearance="plain"
                size="small"
                .disabled=${this.busy || this.selecting}
                @click=${() => this.openEditor(row.id)}
                >Edit</ha-button
              >`
            : nothing,
      },
    };
    return this.isNarrow ? { name: columns.name, edit: columns.edit } : columns;
  }
  private openEditor(key: string) {
    const item = this.payload?.candidates.find(
      (item) => item.source.key === key,
    );
    if (!item) return;
    if (!this.drafts[key])
      this.drafts = { ...this.drafts, [key]: this.draft(item) };
    this.editing = key;
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector('.editor')
        ?.scrollIntoView({ block: 'nearest' }),
    );
  }
  private editForm() {
    const item = this.payload?.candidates.find(
      (item) => item.source.key === this.editing,
    );
    if (!item) return nothing;
    const draft = this.draft(item);
    const schema = [
      { name: 'name', required: true, selector: { text: {} } },
      {
        name: 'power',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: '', label: 'None — energy only' },
              ...item.power_choices.map((source) => ({
                value: source.entity_id,
                label: `${source.name} (${source.entity_id})`,
              })),
            ],
          },
        },
      },
      {
        name: 'upstream',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: '', label: 'None — independent device' },
              ...(this.payload?.devices || []).map((device) => ({
                value: device.stat_consumption,
                label: device.name || device.stat_consumption,
              })),
            ],
          },
        },
      },
    ];
    return html`<ha-card class="editor"
      ><div class="editor-heading">
        <h2>Edit ${item.source.name}</h2>
        <ha-button
          appearance="plain"
          @click=${() => {
            this.editing = undefined;
          }}
          >Done</ha-button
        >
      </div>
      <p class="entity">${item.source.entity_id}</p>
      <ha-form
        .hass=${this.hass}
        .data=${draft}
        .schema=${schema}
        .disabled=${this.busy || this.selecting}
        .computeLabel=${(field: { name: string }) => ({ name: 'Display name', power: 'Power sensor', upstream: 'Upstream device' })[field.name]}
        @value-changed=${(ev: CustomEvent<{ value: Draft }>) => {
          this.drafts = {
            ...this.drafts,
            [item.source.key]: { ...draft, ...ev.detail.value },
          };
        }}
      ></ha-form>
      ${item.review_reason ? html`<ha-alert alert-type="warning">${item.review_reason}</ha-alert>` : nothing}
      <p class="secondary">
        Edits stay in this review until you add the selected devices.
      </p></ha-card
    >`;
  }
  private async apply() {
    if (!this.hass || this.busy || !this.selected.length) return;
    this.busy = true;
    this.error = '';
    try {
      let result: { count: number };
      if (this.reviewing === 'remove')
        result = await this.hass.callWS({
          type: 'energy_scout/manage',
          action: 'remove',
          keys: this.selected,
        });
      else {
        const proposals = Object.fromEntries(
          this.chosen.map((item) => [item.source.key, this.draft(item)]),
        );
        result = await this.hass.callWS({
          type: 'energy_scout/apply',
          proposals,
        });
      }
      this.notice = `${this.reviewing === 'remove' ? 'Removed' : 'Added'} ${result.count} device${result.count === 1 ? '' : 's'}.`;
      this.clear();
      this.reviewing = null;
      this.editing = undefined;
      this.drafts = {};
      await this.load();
    } catch (err) {
      this.error = this.message(err);
    } finally {
      this.busy = false;
    }
  }
  private async manage(action: 'ignore' | 'restore') {
    if (!this.hass || this.busy || !this.selected.length) return;
    this.busy = true;
    this.error = '';
    try {
      await this.hass.callWS({
        type: 'energy_scout/manage',
        action,
        keys: this.selected,
      });
      this.notice =
        action === 'ignore' ? 'Suggestions ignored.' : 'Suggestions restored.';
      this.clear();
      await this.load();
    } catch (err) {
      this.error = this.message(err);
    } finally {
      this.busy = false;
    }
  }
  protected render() {
    const all = this.payload?.candidates || [];
    const chosen = this.chosen;
    const canAdd =
      chosen.length > 0 && chosen.every((item) => item.status === 'ready');
    const canIgnore =
      chosen.length > 0 &&
      chosen.every((item) => !['tracked', 'ignored'].includes(item.status));
    const canRestore =
      chosen.length > 0 && chosen.every((item) => item.status === 'ignored');
    const canRemove =
      chosen.length > 0 &&
      chosen.every(
        (item) =>
          item.status === 'tracked' && this.payload?.added[item.source.key],
      );
    const recommended = all.filter((item) => item.recommended).length;
    return html`<ha-top-app-bar-fixed
      ><ha-menu-button
        slot="navigationIcon"
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></ha-menu-button>
      <div slot="title">Energy Scout</div>
      <ha-button slot="actionItems" appearance="plain" href="/energy"
        >Energy dashboard</ha-button
      >
      <main>
        <header>
          <div>
            <h1>
              ${this.reviewing === 'add' ? `Review ${chosen.length} additions` : this.reviewing === 'remove' ? `Remove ${chosen.length} entries` : 'Your energy devices'}
            </h1>
            <p class="secondary">
              ${all.length} counters · ${recommended} recommended ·
              ${all.filter((item) => item.status === 'tracked').length} already
              tracked
            </p>
          </div>
          <ha-button
            appearance="outlined"
            .disabled=${this.busy || this.selecting}
            @click=${() => (this.ready ? this.rescan() : this.start())}
            >${this.busy ? 'Scanning…' : 'Rescan'}</ha-button
          >
        </header>
        ${this.error ? html`<ha-alert alert-type="error">${this.error}</ha-alert>` : nothing}
        ${this.notice ? html`<ha-alert alert-type="success">${this.notice} <a href="/energy">Open Energy dashboard</a></ha-alert>` : nothing}
        ${
          !this.ready
            ? html`<p role="status">
                  ${this.busy ? 'Loading Home Assistant controls…' : 'The page is unavailable.'}
                </p>
                <a href="/config/integrations/integration/energy_scout"
                  >Open integration options</a
                >`
            : html` ${
                  this.reviewing
                    ? html`<ha-alert
                        alert-type=${this.reviewing === 'remove' ? 'warning' : 'info'}
                        >${this.reviewing === 'remove' ? 'Only unchanged entries added by Energy Scout will be removed. Sensors and history are kept.' : 'Check the selected counters measure appliance consumption. Review overlapping meters and upstream relationships before adding. No changes have been made yet.'}</ha-alert
                      >`
                    : html` <div class="filters">
                        <ha-input-search
                          aria-label="Search devices"
                          placeholder="Search devices, rooms, or entity IDs"
                          .value=${this.search}
                          @input=${(ev: Event) => {
                  this.clear();
                  this.search = (ev.target as HTMLInputElement).value;
                }}
                        ></ha-input-search>
                        <ha-button
                          class="filter-toggle"
                          appearance="plain"
                          @click=${() => {
                  this.filtersOpen = !this.filtersOpen;
                }}
                          >${this.filtersOpen ? 'Hide filters' : 'Show filters'}</ha-button
                        >
                        <ha-form
                          ?hidden=${this.isNarrow && !this.filtersOpen}
                          .hass=${this.hass}
                          .data=${this.filters}
                          .disabled=${this.busy || this.selecting}
                          .schema=${[
                  {
                    type: 'grid',
                    schema: [
                      {
                        name: 'status',
                        selector: {
                          select: {
                            mode: 'dropdown',
                            options: [
                              { value: 'all', label: 'All statuses' },
                              { value: 'recommended', label: 'Recommended' },
                              { value: 'choice', label: 'Review choice' },
                              ...Object.entries(labels).map(
                                ([value, label]) => ({
                                  value,
                                  label,
                                }),
                              ),
                            ],
                          },
                        },
                      },
                      {
                        name: 'area',
                        selector: {
                          select: {
                            mode: 'dropdown',
                            options: [
                              { value: 'all', label: 'All rooms' },
                              ...Array.from(
                                new Set(all.map((item) => item.source.area)),
                              )
                                .sort()
                                .map((area) => ({ value: area, label: area })),
                            ],
                          },
                        },
                      },
                    ],
                  },
                ]}
                          .computeLabel=${(field: { name: string }) => (field.name === 'area' ? 'Room' : 'Status')}
                          @value-changed=${this.updateFilters}
                        ></ha-form>
                      </div>`
                }
                <div class="toolbar">
                  ${
                  this.reviewing
                    ? html`<ha-button
                          appearance="outlined"
                          .disabled=${this.busy || this.selecting}
                          @click=${() => {
                  this.reviewing = null;
                }}
                          >Back to devices</ha-button
                        ><span>${chosen.length} selected</span>
                        <ha-button
                          appearance="accent"
                          .disabled=${this.busy || !chosen.length}
                          @click=${this.apply}
                          >${this.busy ? 'Applying…' : this.reviewing === 'remove' ? 'Remove entries' : `Add ${chosen.length} devices`}</ha-button
                        >`
                    : html` <ha-button
                          appearance="outlined"
                          .disabled=${this.busy || this.selecting}
                          @click=${() => this.selectBatch(true)}
                          >Select recommended</ha-button
                        >
                        <ha-button
                          class="select-ready"
                          appearance="plain"
                          .disabled=${this.busy || this.selecting}
                          @click=${() => this.selectBatch(false)}
                          >Select all ready</ha-button
                        >
                        <ha-button
                          appearance="plain"
                          .disabled=${this.busy || !this.selected.length}
                          @click=${this.clear}
                          >Clear</ha-button
                        >
                        <span aria-live="polite"
                          >${this.selecting ? 'Selecting…' : `${this.selected.length} selected`}</span
                        >
                        ${canRestore ? html`<ha-button .disabled=${this.busy || this.selecting} @click=${() => this.manage('restore')}>Restore selected</ha-button>` : nothing}
                        ${canIgnore ? html`<ha-button appearance="plain" .disabled=${this.busy || this.selecting} @click=${() => this.manage('ignore')}>Ignore selected</ha-button>` : nothing}
                        ${
                canRemove
                  ? html`<ha-button
                      .disabled=${this.busy || this.selecting}
                      @click=${() => {
                  this.reviewing = 'remove';
                }}
                      >Review removal</ha-button
                    >`
                  : html`<ha-button
                      appearance="accent"
                      .disabled=${this.busy || this.selecting || !canAdd}
                      @click=${() => {
                  this.reviewing = 'add';
                  this.notice = '';
                }}
                      >Review additions</ha-button
                    >`
              }`
                }
                </div>
                ${this.editForm()}
                <ha-data-table
                  class=${this.reviewing ? 'review' : ''}
                  .hass=${this.hass}
                  .narrow=${this.isNarrow}
                  .id=${'id'}
                  .columns=${this.columns(!!this.reviewing)}
                  .data=${this.rows(this.reviewing ? chosen : this.visible)}
                  .selectable=${!this.reviewing}
                  .loading=${this.busy && !this.payload}
                  .noDataText=${this.search ? 'No matching devices' : 'No counters in this view'}
                  @selection-changed=${this.selectionChanged}
                ></ha-data-table>
                ${
                !this.reviewing
                  ? html`<details>
                      <summary>
                        About recommendations and sensors needing attention
                      </summary>
                      <p>
                        Recommendations choose one counter per channel and
                        prefer a lifetime total. They do not determine physical
                        meter relationships. An existing tracked sibling,
                        ambiguous total, or whole-house/production name requires
                        manual review.
                      </p>
                      ${this.visible.filter((item) => item.review_reason || item.status === 'needs_attention' || item.status === 'power_only').map((item) => html`<p><strong>${item.source.name}</strong>: ${item.review_reason || item.reasons.join('; ')}</p>`)}
                    </details>`
                  : nothing
              }`
        }
      </main></ha-top-app-bar-fixed
    >`;
  }
  static styles = css`
    :host {
      display: block;
      height: 100%;
      color: var(--primary-text-color);
      background: var(--primary-background-color);
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    header > div {
      flex: 1;
      min-width: 180px;
    }
    .filter-toggle {
      display: none;
    }
    [hidden] {
      display: none !important;
    }
    main {
      padding: 20px 24px 40px;
      max-width: 1600px;
      margin: auto;
    }
    header,
    .toolbar,
    .editor-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    header {
      justify-content: space-between;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 500;
      margin: 0 0 8px;
    }
    h2 {
      font-size: 18px;
      margin: 0;
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: 13px;
      margin: 4px 0;
    }
    .name {
      font-weight: 500;
    }
    .entity {
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(200px, 1fr) minmax(300px, 1fr);
      gap: 16px;
      align-items: center;
      margin: 16px 0;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--primary-background-color);
      padding: 12px 0;
      min-height: 44px;
    }
    .toolbar > span {
      margin-inline-start: auto;
    }
    ha-data-table {
      display: block;
      height: calc(100vh - 350px);
      min-height: 320px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      --data-table-row-height: 66px;
    }
    ha-alert {
      display: block;
      margin: 12px 0;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--secondary-background-color);
      font-size: 12px;
    }
    .recommended {
      color: var(--primary-color);
    }
    .needs_attention {
      color: var(--warning-color, #ef9f00);
    }
    .editor {
      padding: 20px;
      margin-top: 16px;
    }
    .editor-heading {
      justify-content: space-between;
    }
    .editor ha-form {
      margin-top: 12px;
    }
    details {
      padding: 16px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    summary {
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    a {
      color: var(--primary-color);
    }
    @media (max-width: 700px) {
      main {
        padding: 16px 12px;
      }
      .filters {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .filter-toggle {
        display: inline-flex;
        justify-self: start;
      }
      .select-ready {
        display: none;
      }
      .toolbar {
        gap: 8px;
      }
      .toolbar > span {
        margin-inline-start: 0;
      }
      ha-data-table {
        height: calc(100vh - 430px);
        --data-table-row-height: 84px;
      }
      ha-data-table.review {
        --data-table-row-height: 128px;
      }
      h1 {
        font-size: 21px;
      }
    }
  `;
}

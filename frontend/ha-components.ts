/** Reuse HA's own lazy route loaders, without navigating or connecting Settings.
 * Isolated because HA does not publish these controls as a standalone SDK.
 * Checked against frontend 20260930.5 (HA 2026.10.4).
 */
type Routes = {
  routerOptions?: { routes: Record<string, { load?: () => Promise<unknown> }> };
};
const required = [
  'ha-data-table',
  'ha-form',
  'ha-button',
  'ha-checkbox',
  'ha-input-search',
];
export async function loadHAComponents(panel: HTMLElement): Promise<void> {
  if (required.every((tag) => customElements.get(tag))) return;
  let current: Node | null = panel;
  let resolver: (HTMLElement & Routes) | undefined;
  while (current) {
    if (
      current instanceof HTMLElement &&
      current.localName === 'partial-panel-resolver'
    ) {
      resolver = current;
      break;
    }
    current =
      current.parentNode ??
      ((current.getRootNode() as ShadowRoot).host || null);
  }
  const load = resolver?.routerOptions?.routes?.config?.load;
  if (!load)
    throw new Error(
      'HA controls could not load. Retry, or use Energy Scout integration options.',
    );
  await load();
  const config = document.createElement('ha-panel-config') as HTMLElement &
    Routes;
  const entities = config.routerOptions?.routes.entities?.load;
  const general = config.routerOptions?.routes.general?.load;
  if (!entities || !general)
    throw new Error(
      'HA controls are unavailable. Use Energy Scout integration options.',
    );
  await Promise.all([entities(), general()]);
  if (!required.every((tag) => customElements.get(tag)))
    throw new Error(
      'Some HA controls are unavailable. Use Energy Scout integration options.',
    );
}

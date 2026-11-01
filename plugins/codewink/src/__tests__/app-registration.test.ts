// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { CODEWINK_STYLES, ensureStylesInjected, STYLE_ELEMENT_ID } from '../app/styles.ts';

/** Mirrors the host's slot validation so a bad registration fails here instead of as "Failed" in Zana. */
const SLOT_ID = /^[a-zA-Z0-9_-]+$/;

type Registration = Record<string, unknown>;

function strictSlots(registered: Record<string, Registration[]>) {
  const record = (kind: string, registration: Registration) => {
    if (typeof registration.id !== 'string' || !SLOT_ID.test(registration.id)) throw new Error(`${kind}: bad id ${String(registration.id)}`);
    (registered[kind] ??= []).push(registration);
  };
  return {
    navPanel(registration: Registration) {
      const path = registration.path ?? registration.id;
      if (typeof path !== 'string' || !SLOT_ID.test(path)) throw new Error(`navPanel: "path" must be a URL segment, got ${JSON.stringify(path)}`);
      if (typeof registration.title !== 'string' || !registration.title) throw new Error('navPanel: title');
      if (typeof registration.icon !== 'string' || !registration.icon) throw new Error('navPanel: icon');
      if (typeof registration.component !== 'function') throw new Error('navPanel: component');
      record('navPanel', registration);
    },
    projectTab(registration: Registration) {
      if (typeof registration.label !== 'string' || !registration.label) throw new Error('projectTab: label');
      if (typeof registration.component !== 'function') throw new Error('projectTab: component');
      record('projectTab', registration);
    },
    settingsSection(registration: Registration) {
      if (typeof registration.component !== 'function') throw new Error('settingsSection: component');
      record('settingsSection', registration);
    },
    commandPaletteAction(registration: Registration) {
      if (typeof registration.run !== 'function') throw new Error('commandPaletteAction: run');
      if (registration.isAvailable !== undefined && typeof registration.isAvailable !== 'function') throw new Error('commandPaletteAction: isAvailable');
      record('commandPaletteAction', registration);
    }
  };
}

describe('app registration', () => {
  it('replaces stale styles when a rebuilt plugin is loaded', () => {
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = '.old-style {}';
    document.getElementById(STYLE_ELEMENT_ID)?.remove();
    document.head.appendChild(style);
    ensureStylesInjected();
    expect(style.textContent).toBe(CODEWINK_STYLES);
    ensureStylesInjected();
    expect(document.querySelectorAll(`#${STYLE_ELEMENT_ID}`)).toHaveLength(1);
  });
  it('registers slots the host accepts and opens the panel by its path', async () => {
    const { default: app } = (await import('../../app.tsx')) as unknown as { default: { setup(app: { slots: unknown }): void } };
    const registered: Record<string, Registration[]> = {};
    app.setup({ slots: strictSlots(registered) });

    expect(registered.navPanel).toHaveLength(1);
    expect(registered.settingsSection).toHaveLength(1);
    const panelPath = registered.navPanel[0].path;

    const toPluginPanel = vi.fn();
    (registered.commandPaletteAction[0].run as (ctx: unknown) => void)({ toPluginPanel });
    expect(toPluginPanel).toHaveBeenCalledWith(panelPath);

    expect(registered.projectTab).toHaveLength(1);
    const tabId = registered.projectTab[0].id;
    const projectAction = registered.commandPaletteAction[1] as { isAvailable(ctx: unknown): boolean; run(ctx: unknown): void };
    expect(projectAction.isAvailable({})).toBe(false);
    expect(projectAction.isAvailable({ projectId: 'p1' })).toBe(true);
    const toProject = vi.fn();
    projectAction.run({ projectId: 'p1', toProject });
    expect(toProject).toHaveBeenCalledWith('p1', { tabId });
  });
});

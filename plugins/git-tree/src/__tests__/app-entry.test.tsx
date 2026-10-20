// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { loadPluginApp } from '@zana-ai/zcc-plugin-sdk/testing/app';

afterEach(() => {
  document.getElementById('zcc-ext-git-tree-styles')?.remove();
});

describe('app.tsx plugin entry', () => {
  it('injects the stylesheet once and skips it when already present', async () => {
    await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const first = document.querySelectorAll('#zcc-ext-git-tree-styles');
    expect(first).toHaveLength(1);

    await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    expect(document.querySelectorAll('#zcc-ext-git-tree-styles')).toHaveLength(1);
  });

  it('opens the project tab for the current project from the command palette', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const cmd = registrations.commandPaletteActions[0];
    const calls: Array<[string, unknown]> = [];
    const ctx = {
      projectId: 'proj-9',
      threadId: null,
      openPanel: () => false,
      toPluginPanel: () => false,
      toProject: (projectId: string, options: unknown) => {
        calls.push([projectId, options]);
        return true;
      }
    };
    cmd.run?.(ctx as never);
    expect(calls).toEqual([['proj-9', { tabId: 'git-tree' }]]);
  });

  it('does nothing when the command runs without a project', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const cmd = registrations.commandPaletteActions[0];
    let called = false;
    cmd.run?.({
      projectId: null,
      threadId: null,
      openPanel: () => false,
      toPluginPanel: () => false,
      toProject: () => {
        called = true;
        return true;
      }
    } as never);
    expect(called).toBe(false);
  });
});

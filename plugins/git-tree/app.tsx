import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { GIT_GRAPH_STYLES } from './src/app/styles.js';
import {
  GitTreeProjectTab,
  GitTreeDetachedPlaceholder
} from './src/app/GitTreeProjectTab.js';

const STYLE_ELEMENT_ID = 'zcc-ext-git-tree-styles';

function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ELEMENT_ID;
  styleEl.textContent = GIT_GRAPH_STYLES;
  document.head.appendChild(styleEl);
}

export default definePluginApp((app) => {
  ensureStylesInjected();

  // Project Tab (left menu inside each project)
  app.slots.projectTab({
    id: 'git-tree',
    label: 'Git Tree',
    icon: 'GitBranch',
    order: 40,
    global: false,
    header: 'custom',
    detachable: true,
    component: GitTreeProjectTab,
    detachedPlaceholder: GitTreeDetachedPlaceholder
  });

  // Command Palette Quick Open Action (available when viewing a project)
  app.slots.commandPaletteAction({
    id: 'open-git-tree',
    title: 'Git Tree: View Git Tree',
    isAvailable: (ctx) => Boolean(ctx.projectId),
    run: (ctx) => {
      if (ctx.projectId) {
        ctx.toProject(ctx.projectId, { tabId: 'git-tree' });
      }
    }
  });
});

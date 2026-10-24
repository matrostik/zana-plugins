# Zana Plugin Development Guide: Creation, Usage, & Best Practices

This guide provides an end-to-end reference for authoring, testing, deploying, and maintaining community plugins for **Zana Command Center (ZCC)**. It reflects the architecture, APIs, and runtime invariants reviewed from `salesforce/zana` (v2.4.0+).

---

## 1. Core Architecture & Mental Model

Zana is a runtime for autonomous agent workflows, conversation threads, and project management. A plugin is a modular, full-trust TypeScript extension that adds views, tools, and background capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│                    ZCC Host Application                     │
├──────────────────────────────┬──────────────────────────────┤
│     Frontend (Renderer)      │       Backend (Server)       │
│  - Host React 19 Runtime     │  - In-process TypeScript     │
│  - App Slots (Nav, Tab, Side)│  - RPC Methods & Realtime    │
│  - Host Design Tokens (CSS)  │  - Isolated SQLite / KV      │
│  - Thread Chat & Composers   │  - Product SDK (Threads/AI)  │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │       callPluginRpc / WS      │
               └───────────────────────────────┘
```

### Key Principles
1. **Full-Trust Server, Sandboxed Client**: Plugins run in-process on the server with full access to disk and network, but do **not** receive host-daemon authentication tokens. The frontend is client-side React mounted into host slots.
2. **Explicit over Implicit**: Use typed RPC, explicit schemas for agent tools (`Zod` or JSON Schema), and strict manifest declarations.
3. **Fail Closed**: If a requested AI harness, required plugin, or user approval is unavailable, fail closed with an actionable message rather than guessing or silently degrading.
4. **Clean Teardown**: Always register teardown hooks with `zcc.onDispose` to prevent zombie cron jobs, leaks, or open file locks on reload.

---

## 2. Anatomy of a Plugin

Every plugin lives in its own directory (`plugins/<id>/`) containing:

```
plugins/<id>/
├── package.json          # Manifest declaring the strict 'zcc' block & engines
├── server.ts             # Backend entrypoint (export default function(zcc: ZccPluginApi))
├── app.tsx               # Frontend entrypoint (export default definePluginApp(...))
├── styles.css            # Scoped vanilla CSS leveraging host design tokens
├── skills/               # Optional agent instruction directories (SKILL.md)
│   └── <skill-name>/
│       └── SKILL.md
├── server.test.ts        # Unit tests using @zana-ai/zcc-plugin-sdk/testing
└── app.test.tsx          # Component tests using @zana-ai/zcc-plugin-sdk/testing/app
```

---

## 3. Step-by-Step Plugin Creation

### Step 1: Scaffold the Plugin
Use the built-in ZCC CLI toolchain to scaffold a new TypeScript plugin:

```bash
zcc plugin new my-tool --app
```
* Omitting `--app` creates a server-only plugin (ideal for background crons or agent tools without UI).

### Step 2: Configure `package.json` (`zcc` block)
The `zcc` block is validated against a strict schema. Unknown root keys cause installation failure (use `extra` for arbitrary data):

```json
{
  "name": "zcc-plugin-my-tool",
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "zcc": ">=1.0.0",
    "zccPluginSdk": ">=0.1.0"
  },
  "zcc": {
    "name": "My Tool",
    "description": "Productivity dashboard and automated code quality tools",
    "branding": {
      "icon": "Wrench"
    },
    "server": "./server.ts",
    "app": "./app.tsx",
    "skills": ["skills"],
    "requires": []
  }
}
```

* **Plugin ID Derivation**: The plugin ID is automatically derived by stripping `zcc-plugin-`, `zana-plugin-`, or npm scope prefixes. `zcc-plugin-my-tool` resolves to `my-tool`.
* **Icons**: Use canonical [Lucide](https://lucide.dev/) icon names (e.g. `Wrench`, `Sparkles`, `Terminal`) or relative SVGs (`./assets/icon.svg`).

---

## 4. Server Logic (`ZccPluginApi`)

The default export in `server.ts` receives the `ZccPluginApi` instance:

```ts
import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';

export default async function plugin(zcc: ZccPluginApi): Promise<void> {
  zcc.log.info(`${zcc.pluginId} initialized`);

  // 1. RPC Methods (communicating with frontend app)
  zcc.rpc.method('getItems', async ({ projectId }: { projectId: string }) => {
    const db = zcc.storage.database();
    return db.prepare('SELECT * FROM items WHERE project_id = ?').all(projectId);
  });

  // 2. Persistent Storage (Isolated KV or SQLite)
  const db = zcc.storage.database();
  db.runScript(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 3. Agent Tool Registration (Available in Threads)
  zcc.agents.registerTool({
    name: 'create_item',
    description: 'Creates a new item in the project database',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' }
      },
      required: ['projectId', 'title']
    },
    execute: async ({ projectId, title }) => {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO items (id, project_id, title, created_at) VALUES (?, ?, ?, ?)').run(
        id, projectId, title, Date.now()
      );
      zcc.realtime.publish('items:changed', { projectId });
      return { success: true, id };
    }
  });

  // 4. Background Cron Schedules
  zcc.background.schedule('nightly-sync', '0 2 * * *', async () => {
    zcc.log.info('Executing nightly sync');
  });

  // 5. Cleanup on Teardown
  zcc.onDispose(() => {
    zcc.log.info('Disposing plugin resources');
  });
}
```

### Delegation via Product SDK (`zcc.sdk`)
Plugins can spawn threads and interact with the host workspace through `zcc.sdk`:

```ts
// Attributed Thread Spawning
const { threadId } = await zcc.sdk.threads.spawn({
  projectId,
  prompt: 'Review test coverage for modified files',
  harness: 'project-default',  // Uses effective project AI harness
  visibility: 'hidden',         // 'hidden' hides background workers from UI thread list
  pluginMetadata: { origin: 'my-tool', stage: 1 } // Per-thread isolated metadata (max 256KB)
});

// Per-Thread Metadata Manipulation
await zcc.sdk.threads.updatePluginMetadata({
  threadId,
  set: { stage: 2, status: 'completed' },
  remove: ['temporaryNotes']
});

// Search visible threads
const results = await zcc.sdk.threads.search({ query: 'coverage', limit: 10 });
```

---

## 5. UI Application (`definePluginApp`)

The frontend bundle exports `definePluginApp` from `@zana-ai/zcc-plugin-sdk/app`:

```tsx
import { definePluginApp, useRpc, useRealtime, useWindowTitle } from '@zana-ai/zcc-plugin-sdk/app';
import React, { useState, useEffect } from 'react';

function MyOverviewPanel({ pluginId, subPath }: { pluginId: string; subPath: string }) {
  const [items, setItems] = useState<any[]>([]);
  const rpc = useRpc();

  const loadData = async () => {
    const data = await rpc.call('getItems', { projectId: 'global' });
    setItems(data as any[]);
  };

  useEffect(() => { loadData(); }, []);

  // Listen for realtime backend notifications
  useRealtime('items:changed', () => {
    loadData();
  });

  return (
    <div className="mytool-container">
      <header className="mytool-header">
        <h2>My Tool Dashboard</h2>
        <button onClick={loadData}>Refresh</button>
      </header>
      <ul className="mytool-list">
        {items.map(item => (
          <li key={item.id} className="mytool-card">{item.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default definePluginApp((app) => {
  // Global sidebar page
  app.slots.navPanel({
    id: 'main',
    title: 'My Tool',
    icon: 'Wrench',
    path: '/overview',
    placement: 'sidebar',
    component: MyOverviewPanel
  });

  // Project workbench tab
  app.slots.projectTab({
    id: 'tab',
    label: 'Tool Data',
    icon: 'Folder',
    order: 30,
    detachable: true, // Enables opening in standalone OS window
    component: ({ projectId, headerActions }) => (
      <div className="mytool-tab">
        <header>{headerActions}</header>
        <p>Project context: {projectId}</p>
      </div>
    )
  });

  // Thread side-panel tab
  app.slots.threadPanelAction({
    id: 'side-view',
    title: 'Item Inspector',
    icon: 'Info',
    layout: 'padded',
    scopes: ['thread', 'plugin-page'],
    component: ({ threadId }) => <div>Thread inspection for {threadId}</div>
  });
});
```

---

## 6. Recommendations & Best Practices

### A. Frontend Runtime & Bundling
- **Never Bundle React**: The host provides React at runtime via `globalThis.__ZCC_HOST_REACT__`. Your build system must treat `react` and `react-dom` as externals.
- **Root Panel Slot Fill**: The host wraps plugin views in `.module-panel-slot`. Ensure your top-level container has:
  ```css
  .mytool-container {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
  ```
- **Design Tokens**: Do not inject Tailwind or heavy CSS libraries. Use host theme variables:
  - Text: `var(--text-normal)`, `var(--text-muted)`, `var(--text-accent)`
  - Surfaces: `var(--background-base)`, `var(--background-card)`, `var(--background-hover)`
  - Borders: `var(--border-subtle)`, `var(--border-strong)`
  - Radii: `var(--radius-sm)`, `var(--radius-md)`

### B. Structured User Questions
- Avoid writing custom dialog forms in the chat stream.
- Register `pendingInteraction` with `questionForm`:
  ```tsx
  app.slots.pendingInteraction({
    id: 'ask-config',
    questionForm: (interaction) => ({
      questions: [
        {
          id: 'tier',
          prompt: 'Select deployment tier',
          multiSelect: false,
          options: [
            { value: 'staging', label: 'Staging' },
            { value: 'prod', label: 'Production', description: 'Requires approval' }
          ]
        }
      ],
      toResponse: (answers) => ({ selectedTier: answers.tier?.selected[0] })
    })
  });
  ```
  The host automatically manages focus, keyboard shortcuts, draft retention, submission, and styling.

### C. Host-Signed Approvals
- For destructive actions initiated from the UI (Publish, Delete, Deploy), require a host-signed confirmation token:
  1. UI requests user sign-off:
     ```ts
     const result = await experimental_requestApproval(pluginId, {
       binding: { action: 'deploy', target: orgId, targetLabel: 'prod', subject: 'SchemaV2' },
       title: 'Deploy Schema Changes',
       confirmLabel: 'Deploy'
     });
     if (result.approved) {
       await rpc.call('deploy', { token: result.token });
     }
     ```
  2. Server verifies and burns the single-use token:
     ```ts
     const valid = await zcc.ui.experimental_consumeApproval({ token, binding });
     if (!valid) throw new Error('Action not approved');
     ```

### D. Safe Storage & Upgrades
- In Zana 2.4.0+, the host creates private SQLite-safe backups before upgrading plugins.
- **Snapshot Limits**: Storage snapshots are capped at 256 MiB and 1,024 entries. Keep volatile caches, large temporary files, or logs outside persistent SQLite/KV stores.
- Always perform schema updates inside an explicit migration or `db.transaction()` block.

### E. AI Harness Spawning
- Pass `harness: 'project-default'` to use the project's configured AI harness.
- Be prepared for rejection: ZCC fails closed if the selected harness is disabled, offline, or unavailable. Do not assume silent fallback.

---

## 7. Verification & Testing

Unit tests require no running Zana desktop app:

### Server Unit Tests (`server.test.ts`)
```ts
import { describe, it, expect } from 'vitest';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import plugin from './server.js';

describe('my-tool server', () => {
  it('registers RPC methods and queries database', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'my-tool' });
    await plugin(zcc);

    const result = await harness.callRpc('getItems', { projectId: 'p1' });
    expect(Array.isArray(result)).toBe(true);
  });
});
```

### App Slot Tests (`app.test.tsx`)
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';

const app = await loadPluginApp(() => import('./app.js'), 'my-tool');

describe('my-tool app', () => {
  it('renders navigation panel slot', async () => {
    const slot = renderSlot(app.navPanels[0]!, { pluginId: 'my-tool', subPath: '' }, {
      rpc: { getItems: () => [{ id: '1', title: 'Task 1' }] }
    });

    await slot.findByText('My Tool Dashboard');
    slot.lifecycle.unmount();
  });
});
```

---

## 8. Publishing to the Community Marketplace

1. Build your bundle:
   ```bash
   zcc plugin build
   ```
2. Verify all artifacts (`server.mjs`, `app.js`, `*.meta`, `*.map`) are committed in `plugins/<id>/`.
3. Add your entry to `marketplace/marketplace.json`:
   ```json
   {
     "id": "my-tool",
     "displayName": "My Tool",
     "description": "Productivity dashboard and automated code quality tools",
     "overview": "Detailed markdown explanation of the plugin...",
     "icon": { "lucide": "Wrench" },
     "tags": ["productivity", "developer-tools"],
     "source": {
       "git": {
         "url": "https://github.com/<owner>/zana-plugins",
         "subdir": "plugins/my-tool",
         "ref": "master"
       }
     }
   }
   ```
4. Follow the branching and worktree rules in [`WORKFLOW.md`](../WORKFLOW.md) and submit a pull request.

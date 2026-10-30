import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');
const sdkRoot = join(root, '.zana-sdk');
const packages = ['plugin-sdk', 'agent-process-utils', 'domain', 'host-daemon-contract',
  'provider-bridge-acp', 'provider-bridge-protocol', 'server-contract', 'hono-typed-routes', 'tsconfig'];
const scope = join(root, 'node_modules', '@zana-ai');
mkdirSync(scope, { recursive: true });
for (const directory of packages) {
  const source = join(sdkRoot, 'packages', directory);
  const pkg = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  const target = join(scope, pkg.name.split('/')[1]);
  if (!existsSync(target)) symlinkSync(source, target, 'junction');
  else if (realpathSync(target) !== realpathSync(source)) throw new Error(`SDK link points outside the pinned checkout: ${target}`);
}
execFileSync(process.execPath, [join(sdkRoot, 'packages/plugin-sdk/scripts/build-runtime.mjs')], {
  cwd: root, stdio: 'inherit'
});

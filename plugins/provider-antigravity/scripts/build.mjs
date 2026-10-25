import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const pluginRoot = join(dirname(__filename), '..');

function resolveEsbuild() {
  const candidates = [
    'esbuild',
    resolve(pluginRoot, '../../node_modules/esbuild'),
    resolve(pluginRoot, '../../../zana/node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild')
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try next candidate
    }
  }
  throw new Error('Could not resolve "esbuild". Ensure esbuild is installed.');
}

const esbuild = resolveEsbuild();
const pkg = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8'));
const pluginVersion = pkg.version || '0.2.0';

const NODE_ESM_REQUIRE_BANNER = [
  'import { createRequire as __createRequire } from "node:module";',
  'import { dirname as __pathDirname } from "node:path";',
  'import { fileURLToPath as __fileURLToPath } from "node:url";',
  'const require = __createRequire(import.meta.url);',
  'var __filename = __fileURLToPath(import.meta.url);',
  'var __dirname = __pathDirname(__filename);'
].join('\n');

function hostReactPlugin() {
  const namespace = 'zcc-host-react';
  const reactShim = `const React = globalThis.__ZCC_HOST_REACT__;
export default React;
export const Children = React.Children;
export const Component = React.Component;
export const Fragment = React.Fragment;
export const StrictMode = React.StrictMode;
export const Suspense = React.Suspense;
export const cloneElement = React.cloneElement;
export const createContext = React.createContext;
export const createElement = React.createElement;
export const createRef = React.createRef;
export const forwardRef = React.forwardRef;
export const isValidElement = React.isValidElement;
export const lazy = React.lazy;
export const memo = React.memo;
export const startTransition = React.startTransition;
export const useCallback = React.useCallback;
export const useContext = React.useContext;
export const useDebugValue = React.useDebugValue;
export const useDeferredValue = React.useDeferredValue;
export const useEffect = React.useEffect;
export const useId = React.useId;
export const useImperativeHandle = React.useImperativeHandle;
export const useInsertionEffect = React.useInsertionEffect;
export const useLayoutEffect = React.useLayoutEffect;
export const useMemo = React.useMemo;
export const useReducer = React.useReducer;
export const useRef = React.useRef;
export const useState = React.useState;
export const useSyncExternalStore = React.useSyncExternalStore;
export const useTransition = React.useTransition;
export const version = React.version;
`;
  const jsxShim = `const React = globalThis.__ZCC_HOST_REACT__;
export const Fragment = React.Fragment;
export function jsx(type, props, key) {
  return React.createElement(type, key === undefined ? props : { ...props, key });
}
export const jsxs = jsx;
export const jsxDEV = jsx;
`;
  const reactDomShim = `const ReactDOM = globalThis.__ZCC_HOST_REACT_DOM__;
if (ReactDOM == null) {
  throw new Error('host react-dom is not available');
}
export default ReactDOM;
export const createPortal = ReactDOM.createPortal;
export const flushSync = ReactDOM.flushSync;
export const hydrate = ReactDOM.hydrate;
export const render = ReactDOM.render;
export const unmountComponentAtNode = ReactDOM.unmountComponentAtNode;
export const findDOMNode = ReactDOM.findDOMNode;
export const version = ReactDOM.version;
`;
  const reactDomClientShim = `const ReactDOMClient = globalThis.__ZCC_HOST_REACT_DOM_CLIENT__;
if (ReactDOMClient == null) {
  throw new Error('host react-dom/client is not available');
}
export default ReactDOMClient;
export const createRoot = ReactDOMClient.createRoot;
export const hydrateRoot = ReactDOMClient.hydrateRoot;
`;
  return {
    name: 'zcc-host-react',
    setup(build) {
      build.onResolve(
        { filter: /^(react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime)$/ },
        (args) => ({
          path: args.path,
          namespace
        })
      );
      build.onLoad({ filter: /.*/, namespace }, (args) => {
        if (args.path === 'react') return { contents: reactShim, loader: 'js' };
        if (args.path === 'react/jsx-runtime' || args.path === 'react/jsx-dev-runtime') {
          return { contents: jsxShim, loader: 'js' };
        }
        if (args.path === 'react-dom') return { contents: reactDomShim, loader: 'js' };
        if (args.path === 'react-dom/client') return { contents: reactDomClientShim, loader: 'js' };
        throw new Error(`unhandled react resolve: ${args.path}`);
      });
    }
  };
}

async function build() {
  console.log(`Building @zcc-ext/provider-antigravity v${pluginVersion}...`);

  console.log('Building server.mjs...');
  await esbuild.build({
    absWorkingDir: pluginRoot,
    entryPoints: [join(pluginRoot, 'server.ts')],
    outfile: join(pluginRoot, 'server.mjs'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    minify: true,
    banner: { js: NODE_ESM_REQUIRE_BANNER },
    external: ['@zana-ai/zcc-plugin-sdk', '@zana-ai/zcc-plugin-sdk/server']
  });

  const meta = {
    sdkMajor: 0,
    sdkVersion: '0.1.0',
    artifactFormatVersion: 1,
    pluginId: 'provider-antigravity',
    pluginVersion,
    builtWith: { zccVersion: '0.1.0', pluginSdkVersion: '0.1.0' }
  };
  writeFileSync(join(pluginRoot, 'server.meta.json'), JSON.stringify(meta, null, 2) + '\n');

  console.log('Building app.js...');
  await esbuild.build({
    absWorkingDir: pluginRoot,
    entryPoints: [join(pluginRoot, 'app.tsx')],
    outfile: join(pluginRoot, 'app.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: true,
    loader: { '.css': 'text' },
    plugins: [hostReactPlugin()],
    external: ['@zana-ai/zcc-plugin-sdk/server']
  });
  writeFileSync(join(pluginRoot, 'app.meta.json'), JSON.stringify(meta, null, 2) + '\n');

  console.log('Building dist/host.js...');
  const distDir = join(pluginRoot, 'dist');
  mkdirSync(distDir, { recursive: true });

  const hostOutfile = join(distDir, 'host.js');
  await esbuild.build({
    absWorkingDir: pluginRoot,
    entryPoints: [join(pluginRoot, 'host.ts')],
    outfile: hostOutfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    sourcemap: true,
    banner: { js: NODE_ESM_REQUIRE_BANNER },
    external: []
  });

  const hostBytes = readFileSync(hostOutfile, 'utf8')
    // Enable third-party models (Claude Opus 5.5, Claude Sonnet 5.5, GPT-OSS 120B) in
    // agy_acp_server's `model_selection.supports_third_party_models` check during ACP initialize.
    .replaceAll(
      'clientInfo: { name: "zcc", version: "1.0.0" }',
      'clientInfo: { name: "zed", title: "Zana Command Center (zcc)", version: "1.0.0" }'
    );
  writeFileSync(hostOutfile, hostBytes, 'utf8');
  const hostDigest = createHash('sha256').update(Buffer.from(hostBytes, 'utf8')).digest('hex');
  const hostMeta = {
    sdkMajor: 1,
    sdkVersion: '0.1.0',
    artifactFormatVersion: 1,
    pluginId: 'provider-antigravity',
    pluginVersion,
    builtWith: { zccVersion: '2.4.0', pluginSdkVersion: '0.1.0' },
    artifactDigest: hostDigest
  };
  writeFileSync(join(distDir, 'host.meta.json'), JSON.stringify(hostMeta, null, 2) + '\n');

  console.log('Build completed successfully!');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

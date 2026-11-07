import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const pluginRoot = join(dirname(__filename), '..');
const repoRoot = resolve(pluginRoot, '../..');

function resolveEsbuild() {
  const searchPaths = [pluginRoot, repoRoot];
  try {
    return require(require.resolve('esbuild', { paths: searchPaths }));
  } catch {
    throw new Error('Could not resolve "esbuild". Ensure dependencies are installed.');
  }
}

const esbuild = resolveEsbuild();
const pkg = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8'));
const pluginVersion = pkg.version || '0.1.0';

const NODE_ESM_REQUIRE_BANNER = [
  'import { createRequire as __createRequire } from "node:module";',
  'import { dirname as __pathDirname } from "node:path";',
  'import { fileURLToPath as __fileURLToPath } from "node:url";',
  'const require = __createRequire(import.meta.url);',
  'var __filename = __fileURLToPath(import.meta.url);',
  'var __dirname = __pathDirname(__filename);'
].join('\n');

const REACT_SHIM = `const React = globalThis.__ZCC_HOST_REACT__;
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

const JSX_SHIM = `const React = globalThis.__ZCC_HOST_REACT__;
export const Fragment = React.Fragment;
export function jsx(type, props, key) {
  return React.createElement(type, key === undefined ? props : { ...props, key });
}
export const jsxs = jsx;
export const jsxDEV = jsx;
`;

function hostReactPlugin() {
  const namespace = 'zcc-host-react';
  const filter = /^(react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime)$/;
  return {
    name: 'zcc-host-react',
    setup(build) {
      build.onResolve({ filter }, (args) => ({ path: args.path, namespace }));
      build.onLoad({ filter: /.*/, namespace }, (args) => {
        if (args.path === 'react') return { contents: REACT_SHIM, loader: 'js' };
        if (args.path === 'react/jsx-runtime' || args.path === 'react/jsx-dev-runtime') {
          return { contents: JSX_SHIM, loader: 'js' };
        }
        throw new Error(`unhandled react resolve: ${args.path}`);
      });
    }
  };
}

function writeArtifactMetadata(filePath) {
  const meta = {
    sdkMajor: 1,
    sdkVersion: '0.1.0',
    artifactFormatVersion: 1,
    pluginId: 'prompt-voice',
    pluginVersion,
    builtWith: { zccVersion: '1.0.0', pluginSdkVersion: '0.1.0' }
  };
  writeFileSync(filePath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

/**
 * Source contents inherit the Git checkout's line endings (CRLF on Windows). They are
 * JSON-escaped inside the map, so `git diff --ignore-space-at-eol` cannot hide them.
 * Canonicalize to LF so committed maps match across platforms.
 */
function normalizeSourceMap(mapPath) {
  const sourceMap = JSON.parse(readFileSync(mapPath, 'utf8'));
  sourceMap.sourcesContent = (sourceMap.sourcesContent ?? []).map((source) =>
    typeof source === 'string' ? source.replace(/\r\n/g, '\n') : source
  );
  writeFileSync(mapPath, JSON.stringify(sourceMap) + '\n', 'utf8');
}

async function buildServerArtifact() {
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
    sourcemap: true,
    banner: { js: NODE_ESM_REQUIRE_BANNER },
    external: ['@zana-ai/zcc-plugin-sdk', '@zana-ai/zcc-plugin-sdk/server']
  });
  normalizeSourceMap(join(pluginRoot, 'server.mjs.map'));
  writeArtifactMetadata(join(pluginRoot, 'server.meta.json'));
}

async function buildAppArtifact() {
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
    sourcemap: true,
    loader: { '.css': 'text' },
    plugins: [hostReactPlugin()],
    external: ['@zana-ai/zcc-plugin-sdk/server']
  });
  normalizeSourceMap(join(pluginRoot, 'app.js.map'));
  writeArtifactMetadata(join(pluginRoot, 'app.meta.json'));
}

await buildServerArtifact();
await buildAppArtifact();
console.log('Build completed successfully.');

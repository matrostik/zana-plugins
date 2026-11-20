import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // The host provides `@zana-ai/zcc-plugin-sdk/app` at runtime; tests use this stub instead.
      '@zana-ai/zcc-plugin-sdk/app': fileURLToPath(new URL('./src/__tests__/sdk-app-stub.ts', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx', '*.test.ts']
  }
});

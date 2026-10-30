import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'server.ts',
        'host.ts',
        'app.js',
        'src/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.mjs',
        '**/test-environment.ts',
        '**/fake-acp-server.ts',
        'dist/**',
        'node_modules/**',
        'types/**'
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        functions: 80
      }
    }
  }
});

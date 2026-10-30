import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
      ...defaultExclude,
      "**/*.spec.ts",
      "src/config/**",
      "**/node_modules/**",
      "src/services/interfaces/**",
      "src/index.ts",
      ]
      }
  },
  
});

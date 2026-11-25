import { defaultExclude, defineConfig } from 'vitest/config';

// Keep this list in sync with sonar.coverage.exclusions (sonar-project.properties) and the frontend one in
// frontend/vite.config.ts. Rationale per group: docs/testing/cobertura.md.
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
        "**/node_modules/**",
        // Already excluded before this review (tested guards, kept as is; see docs/testing/cobertura.md, section "Pendiente de decisión").
        "src/config/**",
        // Generated code (Prisma client).
        "src/generated/**",
        // Entry point and composition root: wiring only, no logic.
        "src/server.ts",
        "src/infrastructure/container.ts",
        "src/infrastructure/prisma/client.ts",
        // Pure types and ports: no executable statements.
        "src/domain/repositories/**",
        "src/domain/pagination.ts",
        "src/application/services.ts",
        "src/application/**/index.ts",
        "**/*.d.ts",
      ],
    },
  },
});

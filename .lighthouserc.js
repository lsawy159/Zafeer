export default {
  ci: {
    collect: {
      url: ['http://localhost:5173/login', 'http://localhost:5173/employees'],
      startServerCommand: 'pnpm --filter @workspace/sawtracker run dev',
      startServerReadyPattern: 'Local.*:5173',
      startServerReadyTimeout: 30000,
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
        'categories:seo': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}

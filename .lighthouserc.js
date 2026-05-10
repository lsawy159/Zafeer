export default {
  ci: {
    collect: {
      staticDistDir: 'artifacts/sawtracker/dist',
      url: ['/login', '/'],
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}

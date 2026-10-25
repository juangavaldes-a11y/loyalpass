const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/', 'backups/', 'tmp-backups/', 'loyalpass-portal/', 'certs/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_|^next$', caughtErrors: 'none' }],
      'no-console': 'error',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.js', 'jest.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: { 'no-console': 'off' },
  },
];

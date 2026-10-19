module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  modulePathIgnorePatterns: ['<rootDir>/loyalpass-portal/'],
  testPathIgnorePatterns: ['<rootDir>/loyalpass-portal/'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    // CLI-only database tooling; exercised by `npm run db:migrate`, not by Jest.
    '!src/database/migrations/**',
    '!src/database/sequelize-cli.config.js',
  ],
  coverageThreshold: {
    global: { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
};

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  modulePathIgnorePatterns: ['<rootDir>/loyalpass-portal/'],
  testPathIgnorePatterns: ['<rootDir>/loyalpass-portal/'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};

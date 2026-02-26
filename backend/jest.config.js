module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverageFrom: [
    'models/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    '!node_modules/**',
  ],
  verbose: true,
};
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  // Ne jamais exécuter la copie compilée des tests présente dans dist/
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/env.setup.ts'],
  globalSetup: '<rootDir>/tests/global.setup.ts',
  testTimeout: 20000,
};

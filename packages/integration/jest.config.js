module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  // Jornadas longas, em série, contra um Supabase local de verdade.
  testTimeout: 120000,
  maxWorkers: 1,
};

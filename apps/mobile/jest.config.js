module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  // Só lógica pura (tema, formatadores): nada de React Native aqui.
  transform: {
    '^.+\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['jest', 'node'],
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
        },
      },
    ],
  },
};

import type { JestConfigWithTsJest } from 'ts-jest';

const baseConfig: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};

const config: JestConfigWithTsJest = {
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
    },
    {
      ...baseConfig,
      displayName: 'integration',
      testMatch: [
        '<rootDir>/tests/integration/**/*.test.ts',
        '<rootDir>/tests/security/**/*.test.ts'
      ],
    },
  ],
};

export default config;

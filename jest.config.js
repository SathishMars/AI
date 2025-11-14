/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock MongoDB to avoid ES module issues
    '^mongodb$': '<rootDir>/src/test/__mocks__/mongodb.ts',
    // Mock jose to avoid ES module issues
    '^jose$': '<rootDir>/src/test/__mocks__/jose.ts',
    // Mock next/server for NextRequest/NextResponse
    '^next/server$': '<rootDir>/src/test/__mocks__/next-server.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
  ],
  testMatch: [
    '<rootDir>/src/test/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}

module.exports = config
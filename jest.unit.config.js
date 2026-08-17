module.exports = {
  displayName: 'PAEC - Pruebas unitarias',
  rootDir: 'src',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],

  testMatch: [
    '**/alumnos/alumnos.service.spec.ts',
    '**/grupos/grupos.service.spec.ts',
    '**/auth/auth.service.spec.ts',
  ],

  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleNameMapper: {
  '^src/(.*)$': '<rootDir>/$1',
},

  // OJO: solo los 3 servicios que sí tienen prueba
  collectCoverageFrom: [
    'alumnos/alumnos.service.ts',
    'grupos/grupos.service.ts',
    'auth/auth.service.ts',
  ],
  coverageDirectory: '../coverage/unitarias',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
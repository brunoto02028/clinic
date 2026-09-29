/**
 * Os testes rodam em **UTC**, que é o fuso do contêiner de produção.
 *
 * A máquina do Bruno é `Europe/London`, e ali um `toLocaleTimeString` **com** e
 * **sem** `timeZone` dá a mesma resposta durante o inverno e horários
 * diferentes no verão — mas o teste que compara com o relógio de Londres passa
 * nos dois casos. Foi assim que um e-mail uma hora atrasado sobreviveu a uma
 * suíte verde, e assim que um teste meu sobre esse mesmo defeito passou sem
 * medir nada.
 *
 * Tem de ser **aqui** e não num `setupFile`: o worker do jest já fez contas com
 * datas antes de um setup correr, e o Node cacheia o fuso no primeiro uso.
 * Este arquivo é lido no processo principal, antes de os workers nascerem, e
 * eles herdam o ambiente.
 *
 * Medido antes de ligar: a suíte inteira passa em UTC — 188 suítes, 2807 testes.
 */
process.env.TZ = 'UTC'

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)

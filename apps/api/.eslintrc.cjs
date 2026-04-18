/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist/', 'node_modules/', '**/*.d.ts'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-console': 'off',
    'no-var': 'off',
    'no-case-declarations': 'off',
    'prefer-const': 'warn',
    'no-empty': 'off',
  },
};

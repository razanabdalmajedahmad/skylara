/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'babel.config.js',
    'metro.config.js',
    'tailwind.config.js',
    'nativewind-env.d.ts',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'import/order': 'off',
    // Optional native modules (installed per-platform / CI)
    'import/no-unresolved': [
      'error',
      { ignore: ['^expo-linear-gradient$', '^expo-apple-authentication$'] },
    ],
  },
  overrides: [
    {
      files: ['src/lib/oauth.ts'],
      rules: {
        // useAuthRequest runs only when AuthSession is loaded; structure is intentional
        'react-hooks/rules-of-hooks': 'off',
      },
    },
    {
      files: ['src/app/checkin/scan.tsx'],
      rules: {
        // Camera hook loaded dynamically when expo-camera is available
        'react-hooks/rules-of-hooks': 'off',
      },
    },
  ],
};

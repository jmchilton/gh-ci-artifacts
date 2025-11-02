export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'error',
      'prefer-const': 'error',
      'consistent-return': 'error',
      'no-dupe-keys': 'error',
      'no-eval': 'error',
      'comma-dangle': ['error', 'never'],
    },
  },
]

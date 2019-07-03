module.exports = {
  env: {
    node: true,
    es6: true,
    mocha: true,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  extends: [
    "airbnb-base",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
    "prettier/@typescript-eslint"
  ],
  rules: {
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-object-literal-type-assertion': [
      'error',
      {
        allowAsParameter: true, // Allow type assertion in call and new expression, default false
      },
    ],
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    'array-callback-return': 'off',
    'consistent-return': 'off',
    'eqeqeq': 'error',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'no-console': 'warn',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'no-unused-vars': 'warn',
    'no-var': 'error',
    'prettier/prettier': 'warn',
    'radix': 'off'
  }
}

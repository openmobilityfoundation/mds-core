// https://github.com/eslint/eslint/issues/8813#issuecomment-456034732const typescriptEslintRecommended = require('@typescript-eslint/eslint-plugin/dist/configs/recommended.json')

const typescriptEslintRecommended = require('@typescript-eslint/eslint-plugin/dist/configs/recommended.json')
const typescriptEslintPrettier = require('eslint-config-prettier/@typescript-eslint')
const eslintPrettier = require('eslint-config-prettier')

module.exports = {
  env: {
    node: true,
    es6: true,
    mocha: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'airbnb-base'],
  rules: {
    'array-callback-return': 'off',
    'consistent-return': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'no-console': 'warn',
    'no-restricted-syntax': 'off',
    'no-unused-vars': 'warn',
    'prettier/prettier': 'warn',
    radix: 'off',
  },
  overrides: [
    {
      files: ['*.js'],
      plugins: ['only-warn', 'prettier'],
      rules: {
        ...eslintPrettier.rules,
        camelcase: 'off',
        'no-inner-declarations': 'off',
      },
    },
    {
      files: ['*.ts'],
      plugins: ['only-warn', '@typescript-eslint', 'prettier'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        // avoid unsupported typescript version warnings
        loggerFn: () => {},
      },
      rules: {
        ...typescriptEslintRecommended.rules,
        ...eslintPrettier.rules,
        ...typescriptEslintPrettier.rules,
        '@typescript-eslint/no-object-literal-type-assertion': [
          'error',
          {
            allowAsParameter: true, // Allow type assertion in call and new expression, default false
          },
        ],
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
        eqeqeq: 'error',
        'no-var': 'error',
      },
    },
  ],
}

module.exports = {
  env: {
    node: true,
    es6: true,
    mocha: true
  },
  plugins: ['import', 'prettier', '@typescript-eslint', 'promise'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: 'tsconfig.settings.json'
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint'
  ],
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, args: 'none' }],
    'array-callback-return': 'off',
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
    eqeqeq: 'error',
    'import/extensions': ['error', 'ignorePackages', { ts: 'never' }],
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
    'no-console': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'no-var': 'error',
    'prettier/prettier': 'warn',
    radix: 'off',
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-native': 'off',
    'promise/no-nesting': 'error',
    'promise/no-promise-in-callback': 'error',
    'promise/no-callback-in-promise': 'error',
    'promise/avoid-new': 'error',
    'promise/no-new-statics': 'error',
    'promise/no-return-in-finally': 'error',
    'promise/valid-params': 'error',
    'promise/prefer-await-to-then': 'error',
    'promise/prefer-await-to-callbacks': 'error'
  }
}

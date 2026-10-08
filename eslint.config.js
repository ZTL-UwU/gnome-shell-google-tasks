import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    semi: true,
  },
  rules: {
    'prefer-rest-params': 'warn',
  },
}, {
  files: ['dist/**/*.js'],
  rules: {
    // Compiled JS is parsed by espree, which does not set `isValueReference`.
    // typescript-eslint then treats every binding as type-only.
    'unused-imports/no-unused-vars': 'off',
  },
});

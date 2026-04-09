import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    semi: true,
  },
  rules: {
    'prefer-rest-params': 'warn',
    'e18e/prefer-static-regex': 'warn',
  },
});

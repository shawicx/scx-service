import { base } from 'eslint-config-ali';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.remember/**',
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      'test/**',
    ],
  },
  ...base,
  prettier,
];

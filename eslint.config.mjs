import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import boundaries from 'eslint-plugin-boundaries';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

// Quy tắc phân lớp (00-CONG-NGHE-QUY-UOC mục 2): app → services → domain; infra hiện thực interface.
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'prisma/migrations/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/elements': [
        { type: 'app', pattern: 'app/**' },
        { type: 'components', pattern: 'components/**' },
        { type: 'services', pattern: 'lib/services/**' },
        { type: 'domain', pattern: 'lib/domain/**' },
        { type: 'infra', pattern: 'lib/infra/**' },
        { type: 'http', pattern: 'lib/http/**' },
        { type: 'config', pattern: 'lib/config/**' },
        { type: 'utils', pattern: 'lib/utils/**' },
        { type: 'worker', pattern: 'worker/**' },
        { type: 'middleware', pattern: 'middleware.ts', mode: 'file' },
      ],
      'boundaries/include': ['app/**', 'components/**', 'lib/**', 'worker/**', 'middleware.ts'],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app', allow: ['components', 'services', 'domain', 'http', 'config', 'utils'] },
            { from: 'components', allow: ['components', 'domain', 'config', 'utils'] },
            { from: 'services', allow: ['services', 'domain', 'infra', 'config', 'utils'] },
            { from: 'domain', allow: ['domain'] },
            { from: 'infra', allow: ['infra', 'domain', 'config', 'utils'] },
            { from: 'http', allow: ['domain', 'infra', 'config'] },
            { from: 'config', allow: ['config'] },
            { from: 'utils', allow: ['utils'] },
            { from: 'worker', allow: ['worker', 'services', 'domain', 'infra', 'config', 'utils'] },
            { from: 'middleware', allow: ['infra'] },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['prisma/**', 'tests/**', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
];

export default config;

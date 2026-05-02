import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'

export default [
  { ignores: ['dist/', 'node_modules/'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettier,
]

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/database.types.ts', '**/node_modules/**', '**/dist/**', '**/coverage/**', '**/*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

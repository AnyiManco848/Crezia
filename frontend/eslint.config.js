import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results', 'scripts/out'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The project rule: never inject raw HTML.
      'no-restricted-syntax': [
        'error',
        { selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]', message: 'No uses dangerouslySetInnerHTML.' },
      ],
    },
  },
);

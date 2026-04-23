import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export const reactRouter = defineConfig(
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat["jsx-runtime"],
    languageOptions: {
      ...reactPlugin.configs.flat.recommended?.languageOptions,
      ...reactPlugin.configs.flat["jsx-runtime"]?.languageOptions,
      globals: {
        React: "writable",
      },
    },
		rules: {
			'no-unexpected-multiline': 'error',
			'no-warning-comments': [
				'error',
				{ terms: ['FIXME'], location: 'anywhere' },
			],
			'import/no-duplicates': ['warn', { 'prefer-inline': true }],
			'import/order': [
				'warn',
				{
					alphabetize: { order: 'asc', caseInsensitive: true },
					pathGroups: [{ pattern: '#*/**', group: 'internal' }],
					groups: [
						'builtin',
						'external',
						'internal',
						'parent',
						'sibling',
						'index',
					],
				},
			],
			'no-unused-vars': [
				'warn',
				{
					args: 'after-used',
					argsIgnorePattern: '^(_|ignored)',
					ignoreRestSiblings: true,
					varsIgnorePattern: '^(_|ignored)',
				},
			],
		}
  },
  reactHooks.configs.flat["recommended-latest"]!,
);

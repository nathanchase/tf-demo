/**
 * ESLint Configuration File
 * This file configures ESLint to enforce coding standards and catch errors.
 * It includes settings for parser options, environments, and specific rules.
 */
import antfu from '@antfu/eslint-config';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  antfu(
    {
      ignores: [
        '**/.bkup/**',
        '**/.nuxt/**',
        '**/.output/**',
        '**/node_modules/**',
        '**/*.md',
        '**/scripts/movie-verification/**',
        'public/widget-assets/**',
      ],
    },
    {
      // Remember to specify the file glob here, otherwise it might cause the vue plugin to handle non-vue files
      files: ['**/*.vue'],
      rules: {
        // Custom rule: enforce blank lines between commented properties in type literals
        'custom/blank-line-between-commented-props': 'error',
        // Enforce placing each property on a new line
        // '@stylistic/object-property-newline': [
        //   'error',
        //   { allowAllPropertiesOnSameLine: false },
        // ],

        // Enforce <template> at top of file, then script, then style
        'vue/block-order': [
          'error',
          { order: ['template', 'script', 'style'] },
        ],

        // Enforce new line between each attribute
        'vue/max-attributes-per-line': [
          'error',
          {
            singleline: { max: 1 },
            multiline: { max: 1 },
          },
        ],

        'vue/first-attribute-linebreak': [
          'error',
          {
            singleline: 'beside',
            multiline: 'below',
          },
        ],

        // Enforce new line between each tag
        'vue/padding-line-between-tags': [
          'error',
          [{
            blankLine: 'always',
            prev: '*',
            next: '*',
          }],
        ],

        // Enforce new line after single line elements
        'vue/singleline-html-element-content-newline': [
          'error',
          {
            ignoreWhenNoAttributes: true,
            ignoreWhenEmpty: true,
          },
        ],

        // Enforce use of useTemplateRef
        'vue/prefer-use-template-ref': ['error'],

        // Enforce new line between multi-line properties
        'vue/new-line-between-multi-line-property': ['error', { minLineOfMultilineProperty: 2 }],

        // Enforce defineOptions for component naming
        'vue/prefer-define-options': ['error'],

        // Enforce PascalCase for component names
        'vue/component-name-in-template-casing': [
          'error',
          'PascalCase',
          {
            registeredComponentsOnly: true,
            ignores: [],
          },
        ],

        // Enforce <script setup lang="ts"> on .vue files
        'vue/block-lang': [
          'error',
          { script: { lang: 'ts' } },
        ],

        // Enforce <script setup> on .vue files
        'vue/component-api-style': [
          'error',
          ['script-setup'],
        ],

        // Enforce typed emits
        'vue/define-emits-declaration': ['error', 'type-based'],

        // Enforce order of define macros
        'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],

        // Enforce typed props
        'vue/define-props-declaration': ['error', 'type-based'],

        // Make sure <button> has type attribute
        'vue/html-button-has-type': ['error', {
          button: true,
          submit: true,
          reset: true,
        }],

        // Enforce whitespace around comment content
        'vue/html-comment-content-spacing': ['error', 'always'],

        // Check for reactivity loss
        // 'vue/no-ref-object-reactivity-loss': ['error'],

        // Enforce all props with default values be optional
        'vue/no-required-prop-with-default': ['error', { autofix: false }],

        // Enforce no template roots with v-if (use parent v-if instead)
        // 'vue/no-root-v-if': ['warn'],

        // Enforce refs to have defined types
        'vue/require-typed-ref': ['error'],
      },
    },
    {
      // Rules for all files
      plugins: {
        custom: customRules,
      },
      rules: {
        // Custom rule: enforce blank lines between commented properties in type literals
        'custom/blank-line-between-commented-props': 'error',
        'vitest/prefer-lowercase-title': 'off',
        'style/semi': ['error', 'always'],
        'style/operator-linebreak': ['error', 'after', {
          overrides: {
            '?': 'before',
            ':': 'before',
            '|': 'before',
          },
        }],
        'style/member-delimiter-style': ['error', {
          singleline: {
            delimiter: 'comma',
            requireLast: false,
          },
          multiline: {
            delimiter: 'none',
            requireLast: false,
          },
          multilineDetection: 'brackets',
        }],
        'style/no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': 'warn',
        '@stylistic/operator-linebreak': ['error', 'after', {
          overrides: {
            '?': 'before',
            ':': 'before',
            '|': 'before',
          },
        }],
        '@stylistic/object-curly-newline': ['error', {
          ObjectExpression: {
            multiline: true,
            consistent: true,
            minProperties: 5,
          },
        }],
        'perfectionist/sort-imports': [
          'error',
          {
            type: 'alphabetical',
            order: 'asc',
            newlinesBetween: 'ignore',
            groups: [
              'type',
              ['builtin', 'external'],
              'type-internal',
              'internal',
              ['type-parent', 'type-sibling', 'type-index'],
              ['parent', 'sibling', 'index'],
              'unknown',
            ],
          },
        ],
      },
    },
  ),
  ...eslintPluginVueScopedCSS.configs['flat/recommended'],
  // Scripts run outside the app — allow console logging
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // k6 test files have special globals
  {
    files: ['tests/k6/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly', // k6 environment variables
        __VU: 'readonly', // Virtual user number
        __ITER: 'readonly', // Iteration number
        open: 'readonly', // k6 open function
      },
    },
  },
  ...oxlint.configs['flat/recommended'],
);

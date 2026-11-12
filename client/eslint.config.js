import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // JSX component references are not counted by ESLint's core rule.
      // Ignore uppercase component-style bindings while checking other variables.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z][A-Za-z0-9]* }],
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuth'] },
      ],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
,
        argsIgnorePattern: '^(Eyebrow|ProjectCard) }],
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuth'] },
      ],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
 }],
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuth'] },
      ],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])

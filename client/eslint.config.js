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
      // React component names are referenced through JSX, which the core
      // no-unused-vars rule does not recognize without a React JSX plugin.
      // Keep checking ordinary variables and functions.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z][A-Za-z0-9]*
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

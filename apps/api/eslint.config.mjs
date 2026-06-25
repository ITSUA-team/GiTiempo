import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const explicitDrizzleSelectionRule = {
  selector:
    'CallExpression[arguments.length=0][callee.type="MemberExpression"][callee.property.name="select"]',
  message: 'Use an explicit Drizzle selection map instead of select().',
};

const dtoMustExtendCreateZodDtoRule = {
  selector:
    'ClassDeclaration[id.name=/Dto$/]:not([superClass.type="CallExpression"][superClass.callee.name="createZodDto"])',
  message: 'DTO classes must extend createZodDto(...).',
};

const noPlainErrorInServicesRule = {
  selector: 'ThrowStatement > NewExpression[callee.name="Error"]',
  message: 'Throw a typed Nest exception or DomainError from services.',
};

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        explicitDrizzleSelectionRule,
      ],
    },
  },
  {
    files: ['src/**/*.dto.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        explicitDrizzleSelectionRule,
        dtoMustExtendCreateZodDtoRule,
      ],
    },
  },
  {
    files: ['src/**/services/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        explicitDrizzleSelectionRule,
        noPlainErrorInServicesRule,
      ],
    },
  },
);

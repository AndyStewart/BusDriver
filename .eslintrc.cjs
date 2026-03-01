module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking'
    ],
    rules: {
        '@typescript-eslint/naming-convention': [
            'error',
            {
                selector: 'import',
                format: ['camelCase', 'PascalCase']
            }
        ],
        '@typescript-eslint/semi': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-redundant-type-constituents': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-unsafe-argument': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'error',
        '@typescript-eslint/require-await': 'error',
        curly: 'error',
        eqeqeq: 'error',
        'no-throw-literal': 'error',
        semi: 'off'
    },
    overrides: [
        {
            files: [
                'src/test/shared/fakes/**/*.ts',
                'src/test/features/**/adapters/**/*.test.ts',
                'src/test/features/**/application/**/*.test.ts',
                'src/test/features/**/integration/**/*.test.ts',
                'src/test/shared/adapters/**/*.test.ts',
                'src/test/acceptance/dsl/**/*.ts'
            ],
            rules: {
                '@typescript-eslint/require-await': 'off'
            }
        }
    ],
    ignorePatterns: ['out', 'dist', '**/*.d.ts']
};

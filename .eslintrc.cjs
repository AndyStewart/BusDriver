module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname
    },
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
        curly: 'error',
        eqeqeq: 'error',
        'no-throw-literal': 'error',
        semi: 'off'
    },
    overrides: [
        {
            files: ['src/features/connections/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['../queues/**', '../queueMessages/**', 'src/features/queues/**', 'src/features/queueMessages/**'],
                                message: 'Cross-feature imports are not allowed. Move shared contracts to src/features/common/**.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/queues/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['../connections/**', '../queueMessages/**', 'src/features/connections/**', 'src/features/queueMessages/**'],
                                message: 'Cross-feature imports are not allowed. Move shared contracts to src/features/common/**.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/queueMessages/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['../connections/**', '../queues/**', 'src/features/connections/**', 'src/features/queues/**'],
                                message: 'Cross-feature imports are not allowed. Move shared contracts to src/features/common/**.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: [
                            {
                                name: 'vscode',
                                message: 'Application layer must remain framework-agnostic.'
                            }
                        ],
                        patterns: [
                            {
                                group: ['@azure/*', '../adapters/**', '../../adapters/**', '../../../adapters/**', 'src/adapters/**'],
                                message: 'Application layer must not depend on SDK or adapter implementations.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/ports/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: [
                            {
                                name: 'vscode',
                                message: 'Port contracts must remain framework-agnostic.'
                            }
                        ],
                        patterns: [
                            {
                                group: ['@azure/*', '../adapters/**', '../../adapters/**', '../../../adapters/**', 'src/adapters/**'],
                                message: 'Port contracts must not depend on adapter implementations or SDK types.'
                            }
                        ]
                    }
                ],
                'port-interface-application-types': 'error'
            }
        },
        {
            files: ['src/**/*.ts'],
            excludedFiles: [
                'src/test/**/*.ts',
                'src/extension.ts',
                'src/adapters/secondary/VsCodeLoggerAdapter.ts',
                'src/adapters/secondary/AzureMessageOperationsAdapter.ts'
            ],
            rules: {
                'no-console': 'error'
            }
        },
        {
            files: ['src/adapters/primary/WebviewQueueMessagesPanelAdapter.ts'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    {
                        selector: "CallExpression[callee.object.name='JSON'][callee.property.name='stringify']",
                        message: 'Use serializeForInlineScript for webview inline-script data embedding.'
                    }
                ]
            }
        },
        {
            files: [
                'src/test/features/common/fakes/**/*.ts',
                'src/test/adapters/**/*.test.ts',
                'src/test/features/**/application/**/*.test.ts',
                'src/test/features/**/integration/**/*.test.ts',
                'src/test/acceptance/dsl/**/*.ts'
            ],
            rules: {
                '@typescript-eslint/require-await': 'off'
            }
        }
    ],
    ignorePatterns: ['out', 'dist', '**/*.d.ts']
};

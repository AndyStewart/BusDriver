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
            files: ['src/features/connections/application/**/*.ts', 'src/features/connections/ports/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['../../queues/**', '../../queueMessages/**', 'src/features/**'],
                                message: 'Cross-feature imports are not allowed. Move shared contracts to src/shared/**.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/queues/application/**/*.ts', 'src/features/queues/ports/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['../../connections/**', '../../queueMessages/**', 'src/features/**'],
                                message: 'Cross-feature imports are not allowed. Move shared contracts to src/shared/**.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/queueMessages/application/**/*.ts', 'src/features/queueMessages/ports/**/*.ts'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['../../connections/**', '../../queues/**', 'src/features/**'],
                                message: 'Cross-feature imports are not allowed. Move shared contracts to src/shared/**.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/**/application/**/*.ts'],
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
                                group: ['@azure/*', '../adapters/**', '../../*/adapters/**', '../../../shared/adapters/**'],
                                message: 'Application layer must not depend on SDK or adapter implementations.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/**/ports/**/*.ts', 'src/shared/ports/**/*.ts'],
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
                                group: ['@azure/*', '../application/**', '../../*/application/**', '../adapters/**', '../../*/adapters/**', '../../../shared/adapters/**'],
                                message: 'Port contracts must not depend on application/adapters or SDK implementations.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/features/**/adapters/**/*.ts'],
            excludedFiles: [
                'src/features/connections/adapters/TreeConnectionsAdapter.ts',
                'src/features/queueMessages/adapters/WebviewQueueMessagesPanelAdapter.ts',
                'src/features/queueMessages/adapters/WebviewQueuePanelContextAdapter.ts',
                'src/features/queueMessages/adapters/WebviewQueueMessageCommandAdapter.ts'
            ],
            rules: {
                'no-restricted-imports': [
                    'warn',
                    {
                        patterns: [
                            {
                                group: ['../../connections/**', '../../queues/**', '../../queueMessages/**', 'src/features/**'],
                                message: 'Adapters should not import from other features; move shared behavior to src/shared/**.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/**/*.ts'],
            excludedFiles: [
                'src/test/**/*.ts',
                'src/extension.ts',
                'src/shared/adapters/vscode/VsCodeLoggerAdapter.ts',
                'src/features/queueMessages/adapters/AzureMessageOperationsAdapter.ts'
            ],
            rules: {
                'no-console': 'error'
            }
        },
        {
            files: ['src/features/queueMessages/adapters/WebviewQueueMessagesPanelAdapter.ts'],
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

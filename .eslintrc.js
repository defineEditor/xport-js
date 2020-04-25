module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'standard-with-typescript'
    ],
    parserOptions: {
        ecmaVersion: 8,
        project: "./tsconfig.json",
        ecmaFeatures: {
            es6: true,
            modules: true
        }
    },
    rules: {
        // enable additional rules
        '@typescript-eslint/indent': ['error', 4, { SwitchCase: 1 }],
        indent: ['error', 4, { SwitchCase: 1 }],
        'linebreak-style': ['error', 'unix'],
        semi: ['error', 'always'],
        '@typescript-eslint/semi': ['error', 'always'],
        'comma-dangle': 0,
    }
};

import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import tseslint from 'typescript-eslint';
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default tseslint.config([...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
), {
    files: ["**/*.ts"],
    ignores: ["node_modules/*", "dist/*", "docs/*"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 8,
        sourceType: "script",

        parserOptions: {
            project: "./tsconfig.json",

            ecmaFeatures: {
                es6: true,
                modules: true,
            },
        },
    },

    rules: {
        indent: ["error", 4, {
            SwitchCase: 1,
        }],

        "linebreak-style": ["error", "unix"],
        semi: ["error", "always"],
        "comma-dangle": 0,
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
}]);
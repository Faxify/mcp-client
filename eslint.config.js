import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "**/.DS_Store",
      "coverage/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-console": "warn",
      "prefer-const": "warn",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      ...prettierConfig.rules,
    },
  },
];

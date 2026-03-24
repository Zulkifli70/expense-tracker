// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    "vue/no-multiple-template-root": "off",
    "vue/max-attributes-per-line": ["error", { singleline: 3 }],
    quotes: "off",
    semi: "off",
    "@stylistic/quotes": "off",
    "@stylistic/semi": "off",
    "@stylistic/comma-dangle": "off",
    "@stylistic/operator-linebreak": "off",
    "@stylistic/arrow-parens": "off",
    "@stylistic/member-delimiter-style": "off",
    "vue/singleline-html-element-content-newline": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
});

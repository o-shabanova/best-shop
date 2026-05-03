module.exports = {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['dist/**/*.css', 'node_modules/**'],
  rules: {
    'scss/comment-no-empty': true,
    'selector-class-pattern': null,
    'scss/at-extend-no-missing-placeholder': null,
    'scss/no-global-function-names': null,
    'scss/dollar-variable-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'rule-empty-line-before': null,
    'declaration-empty-line-before': null,
    'declaration-block-single-line-max-declarations': null,
    'property-no-deprecated': null,
    'value-keyword-case': [
      'lower',
      {
        ignoreKeywords: ['currentColor']
      }
    ]
  }
};


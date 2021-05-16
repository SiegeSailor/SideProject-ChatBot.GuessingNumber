module.exports = {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  quoteProps: 'consistent',
  bracketSpacing: true,
  printWidth: 180,
  arrowParens: 'always',
  overrides: [
    {
      files: ['.firebaserc'],
      options: {
        parser: 'json',
      },
    },
    {
      files: ['.prettierignore'],
      options: {
        parser: 'yaml',
      },
    },
  ],
};

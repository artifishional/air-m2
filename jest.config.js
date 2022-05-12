module.exports = {

  // An array of file extensions your modules use
  moduleFileExtensions: [
    'mjs',
    'js',
    'json',
    'jsx',
    'ts',
    'tsx',
    'node',
  ],

  testEnvironment: 'node',

  testMatch: [
    // "**/test/**/*.(js|mjs)",
    // "**/test/**/index.mjs",
    '**/__tests__/**/*.[jt]s?(x)',
    // "**/?(*.)+(spec|test).[tj]s?(x)"
  ],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },

  // An array of regexp pattern strings that are matched against
  // all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    '/node_modules/.*',
  ],

};

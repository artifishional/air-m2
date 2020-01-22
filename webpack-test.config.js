module.exports = {
  devtool: '(none)',
  mode: 'development',
  entry: {
    'm2': './src/index.js'
  },
  externals: { m2: '__M2' },
  output: {
    libraryTarget: 'commonjs-module',
    path: `${__dirname}/dist/`
  },
};

const path = require('path');
const ReloadServerPlugin = require('reload-server-webpack-plugin');

const defaults = require('./webpack.config.defaults');

module.exports = Object.assign({}, defaults, {
  entry: {
    server: './src/server.js',
  },

  externals: defaults.externals.concat([
    // Every non-relative module is external
    /^[a-z\-0-9]+$/,
  ]),

  output: Object.assign({}, defaults.output, {
    libraryTarget: 'commonjs2',
    path: path.join(defaults.context, 'build/server'),
  }),

  plugins: defaults.plugins.concat([
    new ReloadServerPlugin({
      script: 'build/server/server.js',
    }),
  ]),

  target: 'node',
});

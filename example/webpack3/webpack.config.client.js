const path = require('path');
const webpack = require('webpack');

const defaults = require('./webpack.config.defaults');

module.exports = Object.assign({}, defaults, {
  entry: {
    client: ['webpack-hot-middleware/client?reload=true', './src/client.js'],
  },

  output: Object.assign({}, defaults.output, {
    libraryTarget: 'var',
    path: path.join(defaults.context, 'build/client'),
    publicPath: '/',
  }),

  plugins: defaults.plugins.concat([new webpack.HotModuleReplacementPlugin()]),

  target: 'web',
});

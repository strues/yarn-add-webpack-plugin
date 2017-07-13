const path = require('path');
const YarnAddWebpackPlugin = require('yarn-add-webpack-plugin');

module.exports = {
  context: process.cwd(),

  externals: [],

  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader' },
      {
        test: /\.css$/,
        loader: 'css-loader',
        options: { localIdentName: '[name]-[local]--[hash:base64:5]' },
      },
      { test: /\.eot$/, loader: 'file-loader' },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: { cacheDirectory: true },
        exclude: /node_modules/,
      },
      { test: /\.(png|jpg)$/, loader: 'url-loader', options: { limit: 8192 } },
      { test: /\.svg$/, loader: 'url-loader', options: { mimetype: 'image/svg+xml' } },
      { test: /\.ttf$/, loader: 'url-loader', options: { mimetype: 'application/octet-stream' } },
      {
        test: /\.(woff|woff2)$/,
        loader: 'url-loader',
        options: { mimetype: 'application/font-woff' },
      },
    ],
  },

  output: {
    chunkFilename: '[id].[hash:5]-[chunkhash:7].js',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    filename: '[name].js',
  },

  plugins: [
    new YarnAddWebpackPlugin({
      dev: function(module, path) {
        return (
          ['babel-preset-react-hmre', 'webpack-dev-middleware', 'webpack-hot-middleware'].indexOf(
            module,
          ) !== -1
        );
      },
    }),
  ],

  resolve: {
    modules: [path.join(process.cwd(), 'lib'), 'node_modules'],
  },
};

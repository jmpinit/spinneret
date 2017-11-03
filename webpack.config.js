const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  name: 'client-side',
  entry: './src/main.js',
  devtool: 'inline-cheap-module-source-map',
  output: {
    path: __dirname,
    filename: 'public/js/app.js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          plugins: [],
          presets: ['es2015'],
        },
      },
      {
        test: /\.(vert|frag|csv)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'public/assets/',
          publicPath: filePath => `/assets/${path.basename(filePath)}`,
        },
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: 'src/html/index.html', to: 'public/index.html' },
    ]),
  ],
};

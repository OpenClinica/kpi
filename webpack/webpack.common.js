const BundleTracker = require('webpack-bundle-tracker');
const ExtractTranslationKeysPlugin = require('webpack-extract-translation-keys-plugin');
const fs = require('fs');
const lodash = require('lodash');
const path = require('path');
const webpack = require('webpack');

const outputPath = path.resolve(__dirname, '../jsapp/compiled/');
// ExtractTranslationKeysPlugin, for one, just fails if this directory doesn't exist
fs.mkdirSync(outputPath, {recursive: true});

// HACK: we needed to define this postcss-loader because of a problem with
// including CSS files from node_modules directory, i.e. this build error:
// `Error: No PostCSS Config found in: /srv/node_modules/…`
const postCssLoader = {
  loader: 'postcss-loader',
  options: {
    sourceMap: true,
    postcssOptions: {
      plugins: ['autoprefixer'],
    },
  },
};

const commonOptions = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|es6)$/,
        exclude: /node_modules/,
        use: ['swc-loader'],
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        // Find TypeScript errors on CI and local builds
        // Allow skipping to save resources.
        use: !process.env.SKIP_TS_CHECK
          ? ['swc-loader', 'ts-loader']
          : ['swc-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', postCssLoader],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: ['style-loader', 'css-loader', postCssLoader, 'sass-loader'],
      },
      {
        test: /\.module\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
              sourceMap: true,
            },
          },
          postCssLoader,
          'sass-loader',
        ],
      },
      {
        test: /\.coffee$/,
        use: {
          loader: 'coffee-loader',
        },
      },
      {
        test: /\.(png|jpg|gif|ttf|eot|svg|woff(2)?)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.jsx', '.js', '.es6', '.coffee', '.ts', '.tsx', '.scss'],
    alias: {
      app: path.join(__dirname, '../app'),
      jsapp: path.join(__dirname, '../jsapp'),
      js: path.join(__dirname, '../jsapp/js'),
      scss: path.join(__dirname, '../jsapp/scss'),
      utils: path.join(__dirname, '../jsapp/js/utils'),
      test: path.join(__dirname, '../test'),
      // Dedupe React across kpi and any linked package (e.g. @openclinica/logic-builder).
      // Without this, a sibling package with its own node_modules/react in devDeps gets
      // bundled twice, causing React error #321 (invalid hook call).
      react: path.join(__dirname, '../node_modules/react'),
      'react-dom': path.join(__dirname, '../node_modules/react-dom'),
    },
  },
  plugins: [
    new BundleTracker({path: __dirname, filename: 'webpack-stats.json'}),
    new ExtractTranslationKeysPlugin({
      functionName: 't',
      output: path.join(outputPath, 'extracted-strings.json'),
    }),
    new webpack.ProvidePlugin({$: 'jquery'}),
  ],
};

module.exports = function (options) {
  options = lodash.mergeWith(
    commonOptions,
    options || {},
    (objValue, srcValue) => {
      if (lodash.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    }
  );
  return options;
};

const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    favicon: path.resolve(__dirname, 'assets/favicon.png')
  }, argv);

  // Add a rule to handle react-native-reanimated
  config.module.rules.push({
    test: /react-native-reanimated/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['last 2 versions']
            }
          }],
          '@babel/preset-react'
        ],
        plugins: [
          '@babel/plugin-transform-class-properties',
          '@babel/plugin-transform-nullish-coalescing-operator',
          '@babel/plugin-transform-optional-chaining'
        ]
      }
    }
  });

  // Add a rule to handle all JavaScript files
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['last 2 versions']
            }
          }],
          '@babel/preset-react',
          '@babel/preset-typescript'
        ],
        plugins: [
          '@babel/plugin-transform-class-properties',
          '@babel/plugin-transform-nullish-coalescing-operator',
          '@babel/plugin-transform-optional-chaining'
        ]
      }
    }
  });

  // Customize the config before returning it.
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
  };

  return config;
};
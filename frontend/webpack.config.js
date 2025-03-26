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
        presets: ['@babel/preset-env', '@babel/preset-react'],
        plugins: ['@babel/plugin-proposal-class-properties']
      }
    }
  });

  return config;
};
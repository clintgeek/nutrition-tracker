module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      '@babel/preset-typescript'
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@services': './src/services',
            '@utils': './src/utils',
            '@assets': './src/assets',
            '@hooks': './src/hooks',
            '@contexts': './src/contexts',
            '@types': './src/types'
          }
        }
      ],
      'react-native-reanimated/plugin',
      '@babel/plugin-transform-nullish-coalescing-operator',
      '@babel/plugin-transform-optional-chaining'
    ],
    env: {
      production: {
        plugins: ['react-native-paper/babel']
      }
    }
  };
};
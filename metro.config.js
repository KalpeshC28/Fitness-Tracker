// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Add resolution for .cjs files and handle reanimated
config.resolver.sourceExts.push('cjs');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'ts');
config.resolver.sourceExts.push('ts', 'tsx');

// Set blockList directly
config.resolver.blockList = [
  new RegExp(`${__dirname}/node_modules/react-native-reanimated/mock`),
];

module.exports = config; 
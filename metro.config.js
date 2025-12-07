// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-i18next gibi paketler için dosya uzantılarını genişlet
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;


// See babel.config.js — the NativeWind wrapper is removed because the app
// uses StyleSheet throughout and never a className, and its JSX interop
// broke function-form `style` props on Pressable.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);

// NativeWind was wired in here (jsxImportSource + the nativewind/babel preset)
// but nothing in the app ever used a className. Its JSX wrapper silently
// discards the function form of the `style` prop —
// style={({ pressed }) => [...]} — which is what every Pressable in this
// codebase uses, so those buttons rendered with no styling at all: no fill,
// no row layout, children stacked. Removed rather than worked around; if
// Tailwind classes are wanted later, re-add this preset and the metro
// wrapper together and convert those Pressables to the array form first.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [],
  };
};

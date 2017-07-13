/**
 * Ensure loaders end with `-loader` (e.g. `babel` => `babel-loader`)
 */
module.exports = function normalizeLoader(loader) {
  return (
    // e.g. react-hot-loader/webpack
    loader
      // ["react-hot-loader", "webpack"]
      .split('/')
      // "react-hot-loader"
      .shift()
      // ["react-hot", ""]
      .split('-loader')
      // "react-hot"
      .shift()
      // "react-hot-loader"
      .concat('-loader')
  );
};

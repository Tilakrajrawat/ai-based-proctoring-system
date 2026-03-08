module.exports = function autoprefixer() {
  return {
    postcssPlugin: "autoprefixer",
    Once() {},
  };
};
module.exports.postcss = true;

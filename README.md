<div align="center">
<img src="http://i.magaimg.net/img/z3q.png" alt="yarn logo" height="100"/>
</div>

# yarn-add-webpack-plugin

[![Build Status](https://travis-ci.org/strues/yarn-add-webpack-plugin.svg?branch=master)](https://travis-ci.org/strues/yarn-add-webpack-plugin) [![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![codecov](https://codecov.io/gh/strues/yarn-add-webpack-plugin/branch/master/graph/badge.svg)](https://codecov.io/gh/strues/yarn-add-webpack-plugin)

Allows packages to be installed using Yarn during development. Webpack wont error for any missing dependencies, rather, the missing packages are installed without skipping a beat.


This plugin is heavily based off of [`npm-install-webpack-plugin`](https://github.com/webpack-contrib/npm-install-webpack-plugin). npm-install-webpack-plugin doesn't support Yarn and there are no plans to at this time.

There are **no** plans to support NPM. There's already a nice plugin for that :)

### Usage

```javascript
  plugins: [
  new YarnAddWebpackPlugin({
    // save dependencies as development or regular dependencies.
    dev: false,
    // Generate a lock file or don't. It's up to you!
    pure: false,
    // Install missing peerDependencies
    peerDependencies: true,
    // Reduce amount of console logging
    quiet: false,
  });
```

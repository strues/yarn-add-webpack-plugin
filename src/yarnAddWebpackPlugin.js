const MemoryFS = require('memory-fs');
const webpack = require('webpack');

const installer = require('./installer');
const normalizeLoader = require('./normalizeLoader');

class YarnAddWebpackPlugin {
  constructor(options) {
    this.preCompiler = null;
    this.compiler = null;
    this.options = Object.assign(installer.defaultOptions, options);
    this.resolving = {};

    installer.checkBabel();
  }

  apply(compiler) {
    this.compiler = compiler;

    // Recursively install missing dependencies so primary build doesn't fail
    compiler.plugin('watch-run', this.preCompile.bind(this));

    // Install externals that wouldn't normally be resolved
    if (Array.isArray(compiler.options.externals)) {
      compiler.options.externals.unshift(this.resolveExternal.bind(this));
    }

    compiler.plugin('after-resolvers', compiler => {
      // Install loaders on demand
      compiler.resolvers.loader.plugin('module', this.resolveLoader.bind(this));

      // Install project dependencies on demand
      compiler.resolvers.normal.plugin('module', this.resolveModule.bind(this));
    });
  }

  install(result) {
    if (!result) {
      return;
    }

    const dep = installer.check(result.request);

    if (dep) {
      let { dev } = this.options;

      if (typeof this.options.dev === 'function') {
        dev = !!this.options.dev(result.request, result.path);
      }

      installer.install(dep, Object.assign({}, this.options, { dev }));
    }
  }

  preCompile(compilation, next) {
    if (!this.preCompiler) {
      const { options } = this.compiler;
      const config = Object.assign(
        // Start with new config object
        {},
        // Inherit the current config
        options,
        {
          // Ensure fresh cache
          cache: {},
          // Register plugin to install missing deps
          plugins: [new YarnAddWebpackPlugin(this.options)],
        },
      );

      this.preCompiler = webpack(config);
      this.preCompiler.outputFileSystem = new MemoryFS();
    }

    this.preCompiler.run(next);
  }

  resolveExternal(context, request, callback) {
    // Only install direct dependencies, not sub-dependencies
    if (context.match('node_modules')) {
      return callback();
    }

    // Ignore !!bundle?lazy!./something
    if (request.match(/(\?|!)/)) {
      return callback();
    }

    const result = {
      context: {},
      path: context,
      request,
    };

    this.resolve('normal', result, (err, filepath) => {
      if (err) {
        this.install(Object.assign({}, result, { request: extractDepFromError(err) }));
      }

      callback();
    });
  }

  resolve(resolver, result, callback) {
    const { version } = require('webpack/package.json');
    const major = version.split('.').shift();

    if (major === '2' || major === '3') {
      return this.compiler.resolvers[resolver].resolve(
        result.context || {},
        result.path,
        result.request,
        callback,
      );
    }

    throw new Error(`Unsupported Webpack version: ${version}`);
  }

  resolveLoader(result, next) {
    // Only install direct dependencies, not sub-dependencies
    if (result.path.match('node_modules')) {
      return next();
    }

    if (this.resolving[result.request]) {
      return next();
    }

    this.resolving[result.request] = true;

    this.resolve('loader', result, (err, filepath) => {
      this.resolving[result.request] = false;

      if (err) {
        const loader = normalizeLoader(result.request);
        this.install(Object.assign({}, result, { request: loader }));
      }

      return next();
    });
  }

  resolveModule(result, next) {
    // Only install direct dependencies, not sub-dependencies
    if (result.path.match('node_modules')) {
      return next();
    }

    if (this.resolving[result.request]) {
      return next();
    }

    this.resolving[result.request] = true;

    this.resolve('normal', result, (err, filepath) => {
      this.resolving[result.request] = false;

      if (err) {
        this.install(Object.assign({}, result, { request: extractDepFromError(err) }));
      }

      return next();
    });
  }
}

const extractDepFromError = err => {
  if (!err) {
    return undefined;
  }
  const matches = /(?:(?:Cannot resolve module)|(?:Can't resolve)) '([@\w\\.-]+)' in/.exec(err);

  if (!matches) {
    return undefined;
  }

  return matches[1];
};

module.exports = YarnAddWebpackPlugin;

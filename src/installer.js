/* eslint-disable max-statements, block-scoped-var, no-var, vars-on-top */
const fs = require('fs');
const path = require('path');
const util = require('util');
const resolve = require('resolve');
const pkgUp = require('pkg-up');
const spawn = require('cross-spawn');
const json5 = require('json5');

// Match "react", "path", "fs", "lodash.random", etc.
const EXTERNAL_PKGS = /^\w[a-z\-0-9.]+$/;
const PEER_DEPS = /UNMET PEER DEPENDENCY ([a-z\-0-9.]+)@(.+)/gm;

const defaultOptions = {
  dev: false,
  pure: false,
  peerDependencies: true,
  quiet: false,
  yarn: 'yarn',
};
const erroneous = [];

function normalizeBabelPlugin(plugin, prefix) {
  // Babel plugins can be configured as [plugin, options]
  if (Array.isArray(plugin)) {
    plugin = plugin[0];
  }
  if (plugin.indexOf(prefix) === 0) {
    return plugin;
  }
  return prefix + plugin;
}

module.exports.loadPkgJson = function loadPkgJson() {
  const pkgPath = pkgUp();
  try {
    require.resolve(pkgPath);
    // Remove cached copy for future checks
    delete require.cache[pkgPath];
    return true;
  } catch (e) {
    return false;
  }
};

module.exports.check = function check(request) {
  if (!request) {
    return;
  }

  const namespaced = request.charAt(0) === '@';
  const dep = request.split('/').slice(0, namespaced ? 2 : 1).join('/');

  // Ignore relative modules, which aren't installed by NPM
  if (!dep.match(EXTERNAL_PKGS) && !namespaced) {
    return;
  }

  // Ignore modules which can be resolved using require.resolve()'s algorithm
  try {
    resolve.sync(dep, { basedir: process.cwd() });
    return;
  } catch (e) {
    // Module is not resolveable
  }

  return dep;
};

module.exports.checkBabel = function checkBabel() {
  try {
    var babelrc = require.resolve(path.resolve('.babelrc'));
    var babelOpts = json5.parse(fs.readFileSync(babelrc, 'utf8'));
  } catch (e) {
    if (babelrc) {
      console.info('.babelrc is invalid JSON5, babel deps are skipped');
    }
    // Babel isn't installed, don't install deps
    return;
  }

  // Default plugins/presets
  var options = Object.assign(
    {
      plugins: [],
      presets: [],
    },
    babelOpts,
  );

  if (!options.env) {
    options.env = {};
  }

  if (!options.env.development) {
    options.env.development = {};
  }

  // Default env.development plugins/presets
  options.env.development = Object.assign(
    {
      plugins: [],
      presets: [],
    },
    options.env.development,
  );

  // Accumulate babel-core (required for babel-loader)+ all dependencies
  const deps = ['babel-core']
    .concat(
      options.plugins.map(plugin => {
        return normalizeBabelPlugin(plugin, 'babel-plugin-');
      }),
    )
    .concat(
      options.presets.map(preset => {
        return normalizeBabelPlugin(preset, 'babel-preset-');
      }),
    )
    .concat(
      options.env.development.plugins.map(plugin => {
        return normalizeBabelPlugin(plugin, 'babel-plugin-');
      }),
    )
    .concat(
      options.env.development.presets.map(preset => {
        return normalizeBabelPlugin(preset, 'babel-preset-');
      }),
    );

  // Check for missing dependencies
  const missing = deps.filter(dep => {
    return this.check(dep);
  });

  // Install missing dependencies
  this.install(missing);
};

module.exports.defaultOptions = defaultOptions;

module.exports.install = function install(deps, options) {
  if (!deps) {
    return;
  }

  if (!Array.isArray(deps)) {
    deps = [deps];
  }

  options = Object.assign({}, defaultOptions, options);

  // Ignore known, erroneous modules
  deps = deps.filter(dep => {
    return erroneous.indexOf(dep) === -1;
  });

  if (!deps.length) {
    return;
  }

  const args = ['add'].concat(deps).filter(Boolean);

  if (module.exports.loadPkgJson()) {
    args.push(options.dev ? '--dev' : null);
  }
  if (options.pure) {
    args.push('--pure-lockfile');
  }
  if (options.quiet) {
    args.push('--silent', '--no-progress');
  }

  deps.forEach(dep => {
    console.info('Installing %s...', dep);
  });

  // Ignore input, capture output, show errors
  const output = spawn.sync(options.yarn, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  if (output.status) {
    deps.forEach(dep => {
      erroneous.push(dep);
    });
  }

  let matches = null;
  const peerDeps = [];

  // RegExps track return a single result each time
  while ((matches = PEER_DEPS.exec(output.stdout))) {
    const dep = matches[1];
    const version = matches[2];

    // Ranges don't work well, so let NPM pick
    if (version.match(' ')) {
      peerDeps.push(dep);
    } else {
      peerDeps.push(util.format('%s@%s', dep, version));
    }
  }

  if (options.peerDependencies && peerDeps.length) {
    console.info('Installing peerDependencies...');
    this.install(peerDeps, options);
    console.info('');
  }

  return output;
};

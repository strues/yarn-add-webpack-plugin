/* eslint-disable babel/no-invalid-this, func-names */
const util = require('util');
const expect = require('expect');
const webpack = require('webpack');
const installer = require('../src/installer');
const YarnAddWebpackPlugin = require('../src/yarnAddWebpackPlugin');

describe('YarnAddWebpackPlugin', () => {
  beforeEach(function() {
    this.check = expect.spyOn(installer, 'check').andCall(dep => {
      return dep;
    });

    this.checkBabel = expect.spyOn(installer, 'checkBabel');

    this.compiler = {
      // Webpack >= 2 will reject config without an entry
      options: {
        entry: function() {
          return {};
        },
      },
      plugin: expect.createSpy().andCall((event, cb) => {
        if (event === 'after-resolvers') {
          cb(this.compiler);
        }
      }),
      resolvers: {
        loader: {
          plugin: expect.createSpy(),
          resolve: expect.createSpy(),
        },
        normal: {
          plugin: expect.createSpy(),
          resolve: expect.createSpy(),
        },
      },
    };

    this.install = expect.spyOn(installer, 'install');
    this.next = expect.createSpy();

    this.options = {
      dev: false,
      pure: false,
      peerDependencies: true,
      quiet: false,
      yarn: 'yarn',
    };

    this.plugin = new YarnAddWebpackPlugin(this.options);

    this.plugin.apply(this.compiler);
  });

  afterEach(function() {
    this.check.restore();
    this.checkBabel.restore();
    this.install.restore();
    this.next.restore();
  });

  it('should checkBabel', function() {
    expect(this.checkBabel).toHaveBeenCalled();
  });

  it('should accept options', function() {
    expect(this.plugin.options).toEqual(this.options);
  });

  describe('.apply', () => {
    it('should hook into `watch-run`', function() {
      expect(this.compiler.plugin.calls.length).toBe(2);
      expect(this.compiler.plugin.calls[0].arguments).toEqual([
        'watch-run',
        this.plugin.preCompile.bind(this.plugin),
      ]);
    });

    it('should hook into `after-resolvers`', function() {
      expect(this.compiler.plugin.calls.length).toBe(2);
      expect(this.compiler.plugin.calls[1].arguments[0]).toEqual('after-resolvers');
      expect(this.compiler.resolvers.loader.plugin.calls.length).toBe(1);
      expect(this.compiler.resolvers.loader.plugin.calls[0].arguments).toEqual([
        'module',
        this.plugin.resolveLoader.bind(this.plugin),
      ]);
      expect(this.compiler.resolvers.normal.plugin.calls.length).toBe(1);
      expect(this.compiler.resolvers.normal.plugin.calls[0].arguments).toEqual([
        'module',
        this.plugin.resolveModule.bind(this.plugin),
      ]);
    });
  });

  describe('.preCompile', () => {
    beforeEach(function() {
      this.run = expect.spyOn(webpack.Compiler.prototype, 'run').andCall(callback => {
        callback();
      });
    });

    afterEach(function() {
      this.run.restore();
    });

    it('should perform dryrun', function(done) {
      const compilation = {};

      this.plugin.preCompile(compilation, () => {
        expect(this.run).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('.resolveExternal', () => {
    beforeEach(function() {
      this.resolve = expect.spyOn(this.plugin, 'resolve').andCall((resolver, result, callback) => {
        callback(new Error(util.format("Can't resolve '%s' in '%s'", result.request, result.path)));
      });
    });

    afterEach(function() {
      this.resolve.restore();
    });

    it('should ignore node_modules', function(done) {
      this.plugin.resolveExternal('node_modules', 'express', () => {
        expect(this.resolve).toNotHaveBeenCalled();
        done();
      });
    });

    it('should ignore inline-loaders', function(done) {
      this.plugin.resolveExternal('src', 'bundle?lazy!express', () => {
        expect(this.resolve).toNotHaveBeenCalled();
        done();
      });
    });

    it('should resolve external deps', function(done) {
      this.plugin.resolveExternal('src', 'express', () => {
        expect(this.resolve).toHaveBeenCalled();
        expect(this.check).toHaveBeenCalled();
        expect(this.install).toHaveBeenCalled();

        expect(this.check.calls[0].arguments[0]).toEqual('express');
        expect(this.install.calls[0].arguments[0]).toEqual('express');
        done();
      });
    });
  });

  describe('.resolveLoader', () => {
    it('should call .resolve', function() {
      const result = { path: '/', request: 'babel-loader' };

      this.compiler.resolvers.loader.resolve.andCall((context, path, request, callback) => {
        callback(null);
      });

      const install = expect.spyOn(this.plugin, 'install');

      this.plugin.resolveLoader(result, this.next);

      expect(this.compiler.resolvers.loader.resolve.calls.length).toBe(1);
      expect(install.calls.length).toBe(0);
      expect(this.next.calls.length).toBe(1);
      expect(this.next.calls[0].arguments).toEqual([]);
    });
    it('should call .resolve and install if not resolved', function() {
      const result = { path: '/', request: 'babel-loader' };

      this.compiler.resolvers.loader.resolve.andCall((context, path, request, callback) => {
        callback(new Error("Can't resolve 'babel-loader' in 'node_modules'"));
      });

      const install = expect.spyOn(this.plugin, 'install');

      this.plugin.resolveLoader(result, this.next);

      expect(this.compiler.resolvers.loader.resolve.calls.length).toBe(1);
      expect(install.calls.length).toBe(1);
      expect(this.next.calls.length).toBe(1);
      expect(this.next.calls[0].arguments).toEqual([]);
    });
  });

  describe('.resolveModule', () => {
    it('should prevent cyclical installs', function() {
      const result = { path: '/', request: 'foo' };

      this.plugin.resolving.foo = true;

      this.plugin.resolveModule(result, this.next);

      expect(this.compiler.resolvers.normal.resolve.calls.length).toBe(0);
      expect(this.next.calls.length).toBe(1);
    });

    it('should call .resolve if direct dependency', function() {
      const result = { path: '/', request: 'foo' };

      this.compiler.resolvers.normal.resolve.andCall((context, path, request, callback) => {
        callback(new Error("Can't resolve '@cycle/core' in '/'"));
      });

      this.plugin.resolveModule(result, this.next);

      expect(this.compiler.resolvers.normal.resolve.calls.length).toBe(1);
      expect(this.next.calls.length).toBe(1);
      expect(this.next.calls[0].arguments).toEqual([]);
    });

    it('should call not .resolve if sub-dependency', function() {
      const result = { path: 'node_modules', request: 'foo' };

      this.plugin.resolveModule(result, this.next);

      expect(this.compiler.resolvers.normal.resolve.calls.length).toBe(0);
      expect(this.next.calls.length).toBe(1);
    });
  });
});

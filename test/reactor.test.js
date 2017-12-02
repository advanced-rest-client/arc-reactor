'use strict';

const {ArcReactor} = require('../lib/reactor');
const assert = require('chai').assert;
const fs = require('fs-extra');

const logger = {
  log: function() {},
  warn: function() {},
  error: function() {}
};

const opts = {
  dest: 'test/build/',
  webComponent: 'test/bundle.html',
  // verbose: true,
  logger: logger
};

describe('Reactor test', function() {

  describe('Creates separated components', function() {

    var analyzer;
    before(() => {
      analyzer = new ArcReactor(opts);
    });

    after(function() {
      return fs.remove(opts.dest);
    });

    it('Builds the compoennts', function() {
      var result = analyzer.build();
      assert.typeOf(result, 'promise');
      return result;
    });

    it('Contains build folder', function() {
      return fs.pathExists(opts.dest)
      .then(exists => assert.isTrue(exists));
    });

    it('Component #1 exists', function() {
      return fs.pathExists(opts.dest + 'TestElement/TestElement.js')
      .then(exists => assert.isTrue(exists))
      .then(() => fs.pathExists(opts.dest + 'TestElement/index.js'))
      .then(exists => assert.isTrue(exists));
    });

    it('Component #2 exists', function() {
      return fs.pathExists(opts.dest + 'OtherElement/OtherElement.js')
      .then(exists => assert.isTrue(exists))
      .then(() => fs.pathExists(opts.dest + 'OtherElement/index.js'))
      .then(exists => assert.isTrue(exists));
    });

    it('Import file exists', function() {
      return fs.pathExists(opts.dest + 'WebComponentsImports.js')
      .then(exists => assert.isTrue(exists));
    });
  });

  describe('Creates bundle component', function() {
    var analyzer;
    before(() => {
      opts.bundle = true;
      opts.bundleName = 'TestComponent.js';
      analyzer = new ArcReactor(opts);
    });

    after(function() {
      return fs.remove(opts.dest);
    });

    it('Builds the compoennts', function() {
      return analyzer.build();
    });

    it('Contains build folder', function() {
      return fs.pathExists(opts.dest)
      .then(exists => assert.isTrue(exists));
    });

    it('Component bundle exists', function() {
      return fs.pathExists(opts.dest + opts.bundleName)
      .then(exists => assert.isTrue(exists));
    });
  });
});

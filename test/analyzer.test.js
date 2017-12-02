'use strict';

const {ArcComponentsAnalyzer} = require('../lib/analyzer');
const assert = require('chai').assert;

const singleFile = 'test/single.html';
const bundleFile = 'test/bundle.html';
const logger = {
  log: function() {},
  warn: function() {},
  error: function() {}
};

describe('Analyzer test', () => {

  it('Analysis single file', function() {
    var analysis = new ArcComponentsAnalyzer(singleFile, logger);
    return analysis.analyze()
    .then(analysis => {
      assert.typeOf(analysis, 'object');
    });
  });

  it('Single contains 1 element', function() {
    var analysis = new ArcComponentsAnalyzer(singleFile, logger);
    return analysis.analyze()
    .then(analysis => {
      var set = analysis.getFeatures({
        kind: 'element',
        externalPackages: true
      });
      assert.equal(set.size, 1);
    });
  });

  it('Analysis bundle file', function() {
    var analysis = new ArcComponentsAnalyzer(bundleFile, logger);
    return analysis.analyze()
    .then(analysis => {
      assert.typeOf(analysis, 'object');
    });
  });

  it('Bundle contains 2 elements', function() {
    var analysis = new ArcComponentsAnalyzer(bundleFile, logger);
    return analysis.analyze()
    .then(analysis => {
      var set = analysis.getFeatures({
        kind: 'element',
        externalPackages: true
      });
      assert.equal(set.size, 2);
    });
  });
});

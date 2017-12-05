'use strict';

const {BuildOptions} = require('../lib/options');
const assert = require('chai').assert;

describe('Options test', () => {

  it('Sets error for unknown option', function() {
    const instance = new BuildOptions({
      webComponent: 'test',
      unknownOption: true
    });

    assert.isFalse(instance.isValid, 'isValid is false');
    assert.lengthOf(instance.validationErrors, 1, 'Errors list contains a message');
  });

  it('Sets error for missing component path', function() {
    const instance = new BuildOptions({});

    assert.isFalse(instance.isValid, 'isValid is false');
    assert.lengthOf(instance.validationErrors, 1, 'Errors list contains a message');
  });

  it('Sets error for invalid option type', function() {
    const instance = new BuildOptions({
      webComponent: ['test'],
      reactComponents: {},
      verbose: '0',
      logger: true,
      dest: 1234,
      bundleName: [],
      bundle: 'true'
    });

    assert.isFalse(instance.isValid, 'isValid is false');
    assert.lengthOf(instance.validationErrors, 7, 'Errors list contains messages');
  });

  it('Sets warning for invalid logger', function() {
    const instance = new BuildOptions({
      webComponent: 'test',
      logger: {}
    });

    assert.isTrue(instance.isValid, 'isValid is true');
    assert.lengthOf(instance.validationErrors, 0, 'Errors list is empty');
    assert.lengthOf(instance.validationWarnings, 1, 'Warning list conatins an item');
  });

  it('Invalid logger is removed', function() {
    const instance = new BuildOptions({
      webComponent: 'test',
      logger: {}
    });

    assert.isUndefined(instance.logger);
  });

  it('Passes the validation', function() {
    const instance = new BuildOptions({
      webComponent: 'test',
      reactComponents: ['test'],
      verbose: false,
      logger: {
        info: function() {},
        log: function() {},
        warn: function() {},
        error: function() {}
      },
      dest: 'test',
      bundleName: 'test',
      bundle: true
    });
    assert.isTrue(instance.isValid, 'isValid is true');
    assert.lengthOf(instance.validationErrors, 0, 'Errors list is empty');
    assert.lengthOf(instance.validationWarnings, 0, 'Warning list is empty');
  });
});

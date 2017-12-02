'use strict';

const {CaseMap} = require('../lib/case-map');
const assert = require('chai').assert;

describe('CaseMap test', () => {
  const caseMap = new CaseMap();

  it('camelToDashCase converts to dashes', function() {
    assert.equal(caseMap.camelToDashCase('camelCase'), 'camel-case');
    assert.equal(caseMap.camelToDashCase('camelCCase'), 'camel-c-case');
  });

  it('dashToCamelCase converts to camelCase', function() {
    assert.equal(caseMap.dashToCamelCase('camel-case'), 'camelCase');
    assert.equal(caseMap.dashToCamelCase('camel-c-case'), 'camelCCase');
  });

  it('dashToCamelCase converts to camelCase and upper first', function() {
    assert.equal(caseMap.dashToCamelCase('camel-case', true), 'CamelCase');
    assert.equal(caseMap.dashToCamelCase('camel-c-case', true), 'CamelCCase');
    assert.equal(caseMap.dashToCamelCase('camel-case'), 'camelCase');
  });

  it('camelToDashCase and dashToCamelCase reverse the other function', function() {
    var camelCase = caseMap.dashToCamelCase('camel-c-case');
    assert.equal(caseMap.camelToDashCase(camelCase), 'camel-c-case');
  });
});

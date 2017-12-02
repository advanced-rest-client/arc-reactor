'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */

/**
 * Replaces dashes to camel case and back.
 */
class CaseMap {
  constructor() {
    this._caseMap = {};
  }

  get _rx() {
    return {
      dashToCamel: /-[a-z]/g,
      camelToDash: /([A-Z])/g
    };
  }
  /**
   * Replace dashes to camel case word.
   * For example it replaces `raml-request-panel` to `ramlRequestPanel`
   * or to `RamlRequestPanel` if `upperFirst` is set.
   *
   * @param {String} dash A word to translate
   * @param {?Boolean} upperFirst If true then the first letter is uppercased
   * @return {String} Upper cased word
   */
  dashToCamelCase(dash, upperFirst) {
    upperFirst = upperFirst || false;
    var cacheKey = dash + '-' + String(upperFirst);
    if (this._caseMap[cacheKey]) {
      return this._caseMap[cacheKey];
    }
    var result;
    if (dash.indexOf('-') < 0) {
      result = dash;
    } else {
      result = dash.replace(this._rx.dashToCamel, (m) => {
        return m[1].toUpperCase();
      });
    }
    if (upperFirst) {
      result = result[0].toUpperCase() + result.substr(1);
    }
    this._caseMap[cacheKey] = result;
    return result;
  }

  camelToDashCase(camel) {
    if (this._caseMap[camel]) {
      return this._caseMap[camel];
    }
    var result = camel.replace(this._rx.camelToDash, '-$1').toLowerCase();
    this._caseMap[camel] = result;
    return result;
  }
}
exports.CaseMap = CaseMap;

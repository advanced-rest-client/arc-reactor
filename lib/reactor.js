'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */
const {BuildOptions} = require('./options');
const {ArcComponentsAnalyzer} = require('./analyzer');
const {Reactive} = require('./reactive');
const winston = require('winston');
const colors = require('colors/safe');
const path = require('path');
const fs = require('fs-extra');
/**
 * A main class to analyze polymer element(s) and generate React component(s)
 * out of it.
 */
class ArcReactor {
  /**
   * @constructor
   *
   * @param {?Object} opts Module configuration options. See `options.js`
   * for details.
   */
  constructor(opts) {
    if (!(opts instanceof BuildOptions)) {
      opts = new BuildOptions(opts);
    }
    this.opts = opts;
    this.debugFileName = 'arc-reactor.log';
    this.logger = this._setupLogger();
    if (!this.opts.isValid) {
      this._printValidationErrors();
      this._printValidationWarnings();
      throw new Error('Options did not passed validation.');
    }
    this._printValidationWarnings();
    // final destination for the build.
    this.dest = this.opts.dest || './build';
  }
  /**
   * Setups the logger. If a logger is defined in passed options it will be
   * used to output messages. If not Windon is used.
   * @return {Object} Logger object.
   */
  _setupLogger() {
    if (this.opts.logger) {
      return this.opts.logger;
    }
    const level = this.opts.verbose ? 'debug' : 'error';
    return new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({level: level}),
        new (winston.transports.File)({
          filename: path.join(process.cwd(), this.debugFileName),
          level: level
        })
      ]
    });
  }
  /**
   * Prints validation errors using logger's `error` function.
   */
  _printValidationErrors() {
    this.opts.validationErrors.forEach((error) => {
      this.logger.error(error);
    });
  }
  /**
   * Prints validation warnings using logger's `warn` function.
   */
  _printValidationWarnings() {
    const warnings = this.opts.validationWarnings;
    if (!warnings || !warnings.length) {
      return;
    }
    warnings.forEach((warning) => {
      this.logger.warn(warning);
    });
  }

  /**
   * Builds the ARC components.
   * @return {Promise} Promise resolved when the build is ready
   */
  build() {
    return this._analyze()
    .then(() => this._generateComponents())
    .then(() => this._clearDebugFile())
    .catch((cause) => {
      this.logger.error('');
      this.logger.error(colors.red(cause.message));
      this.logger.error(colors.red(cause.stack));
      this.logger.error('');
    });
  }
  /**
   * Removed the log file from current location.
   * This can only be called after each task is processed successfully.
   *
   * @return {Promise} A promise when the file is removed.
   */
  _clearDebugFile() {
    return fs.remove(this.debugFileName);
  }
  /**
   * Performs Polymer powered analysis of the web component using
   * `polymer-analyzer`.
   * The result of analysis is passes to the React generator.
   * @return {Object} Polymer analyzer analysis result.
   */
  _analyze() {
    const analyzer = new ArcComponentsAnalyzer(this.opts.webComponent,
      this.logger);
    return analyzer.analyze()
    .then((analysis) => {
      this.analysis = analysis;
    });
  }
  /**
   * Creates components definition.
   *
   * @return {Promise}
   */
  _generateComponents() {
    const builder = new Reactive(this.analysis, this.opts,
      this.dest, this.logger);
    try {
      return builder.buildComponents();
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
exports.ArcReactor = ArcReactor;

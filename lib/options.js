'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */

/**
 * Class to prepare and validate user options.
 */
class BuildOptions {
  constructor(opts) {
    opts = opts || {};
    this.validateOptions(opts);
    if (!this.isValid) {
      return;
    }
    /**
     * A path to a Polymer powered web component to analyze and build the React
     * wrapper for.
     *
     * It can be a single web component declaration or a bundle file of Polymer
     * web components.
     *
     * @type {String}
     */
    this.webComponent = opts.webComponent;
    /**
     * List of web components names to be exposed to generated React component
     * so it can be included in React application.
     *
     * Defining this option is optional. By default all components found in the
     * `webComponent` file are processed and wrapped into React component.
     *
     * To reduce size of generated code it is a good idea to declare number
     * of components that your application is using. If the `webComponent` file
     * is a bundle of web components you can reduce generated file by setting this
     * property.
     *
     * Provide list of components names only, without any repository path or
     * version information.
     * For example `['raml-request-panel', 'paper-input']`
     *
     * @type {Array<String>}
     */
    this.reactComponents = opts.reactComponents;
    /**
     * The destination path where the build files are created. Absolute or relative
     * path.
     *
     * By default it puts the files into `build` directory of the working dir.
     *
     * @type {String}
     */
    this.dest = opts.dest;
    /**
     * By default it creates a separate file for each web component found in
     * `webComponent` file. When this option is set then it bundles all React
     * components into a single file and exports each React component.
     *
     * @type {Boolean}
     */
    this.bundle = opts.bundle;
    /**
     * File name of generated component. It defaults to `WebComponents.js`.
     * This is only relevant if `bundle` is set. Otherwise each file name is
     * a web component name.
     *
     * @type {String}
     */
    this.bundleName = opts.bundleName;
    /**
     * Instance of any logger library that has `log()`, `warn()`
     * and `error()` functions. If not provided a console's output will be used.
     *
     * @type {Object}
     */
    this.logger = opts.logger;
    /**
     * If set then it prints verbose messages.
     *
     * @type {Boolean}
     */
    this.verbose = opts.verbose;
  }

  get validOptions() {
    return [{
      type: String,
      name: 'webComponent'
    }, {
      type: Array,
      name: 'reactComponents'
    }, {
      type: Boolean,
      name: 'verbose'
    }, {
      type: Object,
      name: 'logger'
    }, {
      type: String,
      name: 'dest'
    }, {
      type: Boolean,
      name: 'bundle'
    }, {
      type: String,
      name: 'bundleName'
    }];
  }

  get isValid() {
    return !!(this.validationErrors &&  this.validationErrors.length === 0);
  }

  validateOptions(userOpts) {
    userOpts = userOpts || {};

    this.validationErrors = [];
    this.validationWarnings = [];

    this._validateOptionsList(userOpts);
    this._validateRequired(userOpts);
    this._validateLogger(userOpts);
  }

  _validateOptionsList(userOpts) {
    var keys = Object.keys(userOpts);
    var known = this.validOptions;
    var unknown = [];
    var typeMissmatch = [];
    keys.forEach(property => {
      let index = known.findIndex(rule => rule.name === property);
      if (index === -1) {
        unknown.push(property);
        return;
      }
      let type = typeof userOpts[property];
      if (type === 'object') {
        if (userOpts[property] instanceof Array) {
          type = 'array';
        }
      }
      let expected = known[index].type.name;
      if (type !== expected.toLowerCase()) {
        typeMissmatch.push([property, type[0].toLocaleUpperCase() + type.substr(1), expected]);
      }
    });

    if (unknown.length) {
      let message = 'Unknown option';
      if (unknown.length > 1) {
        message += 's';
      }
      message += ': ' + unknown.join(', ');
      this.validationErrors.push(message);
    }
    typeMissmatch.forEach(info => {
      let message = 'Type missmatch. Property ' + info[0] + ' expected to be a ';
      message += info[2] + ' but ' + info[1] + ' was given';
      this.validationErrors.push(message);
    });
  }

  _validateRequired(userOpts) {
    if (!userOpts.webComponent) {
      this.validationErrors.push('"webComponent" property is required');
    }
  }

  _validateLogger(userOpts) {
    var logger = userOpts.logger;
    if (!logger) {
      return;
    }
    var messages = [];
    if (typeof logger.log !== 'function') {
      messages.push('log');
    }
    if (typeof logger.warn !== 'function') {
      messages.push('warn');
    }
    if (typeof logger.error !== 'function') {
      messages.push('error');
    }
    if (messages.length) {
      let message = 'Used logger is missing required functions: ' + messages.join(', ');
      this.validationWarnings.push(message);
      delete userOpts.logger;
    }
  }
}
exports.BuildOptions = BuildOptions;

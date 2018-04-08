'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */
const {CaseMap} = require('./case-map');
const path = require('path');
const fs = require('fs-extra');

/**
 * Translates Polymer analysis result into React wrappers for web components.
 */
class Reactive {
  /**
   * @constructor
   *
   * @param {Object} analysis Polymer analyzer analysis result
   * @param {BuildOptions} opts Module configuration options
   * @param {String} dest Build destination
   * @param {Object} logger Logging object
   */
  constructor(analysis, opts, dest, logger) {
    this.analysis = analysis;
    this.opts = opts;
    this.dest = dest;
    this.logger = logger;
    this._caseMap = new CaseMap();
    this._polymerProperties = ['$', 'rootPath', 'importPath', 'root'];
    this._polymerFunctions = ['attributeChangedCallback', 'setProperties',
    'linkPaths', 'unlinkPaths', 'notifySplices', 'get', 'set', 'push', 'pop',
    'splice', 'shift', 'unshift', 'notifyPath', 'connectedCallback',
    'disconnectedCallback', 'updateStyles', 'resolveUrl'];
  }
  /**
   * Performs the build.
   *
   * @return {Promise}
   */
  buildComponents() {
    const names = this._listComponents();
    if (!names || !names.length) {
      throw new Error('Unknown list of components to reactify.');
    }
    this.logger.log('Building React wrappers for ' + names.length +
      ' web components');
    const modulesInfo = new Set();
    names.forEach((name) => {
      let cmp = this.getComponentAnalysis(name);
      modulesInfo.add(this.computeInfo(cmp, name));
    });

    let result = this._computeComponentsContent(modulesInfo);
    if (this.opts.bundle) {
      result = this._bundleContent(result);
      return this._saveBundleComponent(result);
    }
    return this._saveComponents(result);
  }
  /**
   * Saves each module content separately.
   *
   * @param {Map} map Map of analyzed components
   * @return {Promise} A promise resolved when all files are saved
   */
  _saveComponents(map) {
    this.logger.log('Creating React components files...');
    return this._createComponentModules(map.entries())
    .then(() => {
      this.logger.log('Creating helper module...');
      let content = this._getPolyfillDeclaration();
      content += this._getImportsDeclaration();
      const helperPath = path.join(this.dest, 'WebComponentsImports.js');
      return fs.writeFile(helperPath, content, 'utf8')
      .then(() => this.logger.log('Helper module created.'));
    })
    .then(() => {
      this.logger.log('React components ready');
    });
  }
  /**
   * Creates modules definitions.
   *
   * @param {Iterator} iterator Analysis iterator
   * @return {Promise}
   */
  _createComponentModules(iterator) {
    const item = iterator.next();
    if (item.done) {
      return Promise.resolve();
    }
    const componentName = item.value[0];
    this.logger.log('Creating React files for ', componentName, '...');
    const componentContent = item.value[1];
    const componentDir = path.join(this.dest, componentName);
    const componentPath = path.join(this.dest, componentName,
        componentName + '.js');
    return fs.ensureDir(componentDir)
    .then(() => {
      let content = this._getReactHeader();
      content += componentContent;
      return fs.writeFile(componentPath, content, 'utf8');
    })
    .then(() => {
      // creates an index.js file for easier imports
      const indexContent = this._computeComponentIndexFile(componentName);
      const indexPath = path.join(this.dest, componentName, 'index.js');
      return fs.writeFile(indexPath, indexContent, 'utf8');
    })
    .then(() => {
      this.logger.log('React file for ', componentName, ' component created');
      return this._createComponentModules(iterator);
    });
  }
  /**
   * Saves bundled React components as a single file.
   *
   * @param {String} content Content of the bundle file.
   * @return {Promise} A promise resolved when the file is created
   */
  _saveBundleComponent(content) {
    let name = this.opts.bundleName || 'WebComponents.js';
    const location = path.join(this.dest, name);
    this.logger.log('Creating React bundle file...', location);
    return fs.ensureDir(this.dest)
    .then(() => fs.writeFile(location, content, 'utf8'))
    .then(() => this.logger.log('React bundle file created.'));
  }
  /**
   * Searches for web component definition in the analysis result.
   * This function throws an exception when it doesn't find the module
   *
   * @param {String} name Web component name
   * @return {Object} Polymer element analysis result as defined in
   * `polymer-analyzer` module.
   */
  getComponentAnalysis(name) {
    const set = this.analysis.getFeatures({
      kind: 'element',
      externalPackages: true,
      id: name
    });
    if (!set.size) {
      throw new Error('Component ' + name + ' couldn\'t be found.');
    }
    if (set.size > 1) {
      throw new Error('More than one analysis returned for ' + name);
    }
    return set.values().next().value;
  }
  /**
   * Computes info object from the polymer element analysis result
   * used later by this module to compute the data.
   *
   * @param {Object} component Polymer element analysis result
   * @param {String} name Web component name
   * @return {Object} An info object containing `name`, `events`, `properties`
   * and `methods` properties.
   */
  computeInfo(component, name) {
    return {
      name: name,
      events: component.events,
      properties: component.properties,
      methods: component.methods
    };
  }
  /**
   * Creates a list of web components names to create a React module for.
   *
   * @return {Array<String>} List of web components names to process.
   */
  _listComponents() {
    let components = this.opts.reactComponents;
    if (!components || !components.length) {
      components = [];
      let set = this.analysis.getFeatures({
        kind: 'element',
        externalPackages: true
      });
      let iterator = set.values();
      while (true) {
        let value = iterator.next();
        if (value.done) {
          break;
        }
        if (value.value.tagName) {
          components.push(value.value.tagName);
        }
      }
    }
    return components;
  }
  /**
   * Computes content for each React module.
   *
   * @param {Set} modules Analyzed modules
   * @return {Map} Map of each module's content. The key is React
   * component name.
   */
  _computeComponentsContent(modules) {
    const result = new Map();
    const iterator = modules.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let module = value.value;
      let content = this._getReactComponentDeclaration(module);
      let moduleName = this._caseMap.dashToCamelCase(module.name, true);
      result.set(moduleName, content);
    }
    return result;
  }
  /**
   * Creates a React bundle content file for analyzed web components.
   *
   * @param {Map} map Map of analyzed components
   * @return {String} Complete React coponents declaration.
   */
  _bundleContent(map) {
    const it = map.values();
    let result = this._getReactHeader();
    while (true) {
      let item = it.next();
      if (item.done) {
        break;
      }
      result += item.value;
      result += '\n\n';
    }
    result += this._getPolyfillDeclaration();
    result += this._getImportsDeclaration();
    return result;
  }
  /**
   * Creates React file header with import
   *
   * @return {String}
   */
  _getReactHeader() {
    let result = 'import React from \'react\';\n';
    result += '\n';
    return result;
  }
  /**
   * Creates React component body.
   *
   * @param {Object} data
   * @return {String}
   */
  _getReactComponentDeclaration(data) {
    let body = this._getClassHeader(data.name);
    body += this._getClassConstructor(data);
    body += this._getClassMoutCallback(data);
    body += this._getClassUnmoutCallback(data);
    body += this._getClassUpdateCallback(data.properties);
    body += this._getEventsDeclarations(data.events);
    body += this._getMethodsCallDeclarations(data);
    body += this._getClassRenderMethod(data.name);
    body += '}';
    return body;
  }
  /**
   * Produces class definition header
   *
   * @param {String} name Component name
   * @return {String}
   */
  _getClassHeader(name) {
    const defaultStr = this.opts.bundle ? '' : 'default ';
    let result = `export ${defaultStr}class `;
    result += this._caseMap.dashToCamelCase(name, true);
    result += ' extends React.Component {\n\n';
    return result;
  }
  /**
   * Creates constructor for the class.
   *
   * @param {Object} component Analysis result for an element.
   * @return {String}
   */
  _getClassConstructor(component) {
    let result = '\tconstructor(props) {\n';
    result += '\t\tsuper(props);\n';
    // events local handlers
    // it also contains a list of "change" events
    const iterator = component.events.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let event = value.value;
      let eventName = this._computeLocalEventName(event.name);
      result += '\t\tthis.' + eventName;
      result += ' = this.' + eventName;
      result += '.bind(this);\n';
    }
    result += '\t}\n\n';
    return result;
  }
  /**
   * Definition for `componentDidMount()`
   *
   * @param {Object} component Analysis result for an element.
   * @return {String}
   */
  _getClassMoutCallback(component) {
    let result = '\tcomponentDidMount() {\n';
    // events handling
    let iterator = component.events.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let event = value.value;
      let eventName = this._computeLocalEventName(event.name);
      result += '\t\tthis._refElement.addEventListener(\'' + event.name + '\',';
      result += ' this.' + eventName + ');\n';
    }
    // properties setters
    // properties change handlers
    iterator = component.properties.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let property = value.value;
      if (property.privacy !== 'public') {
        continue;
      }
      if (property.type === 'Function') {
        continue;
      }
      if (this._polymerProperties.indexOf(property.name) !== -1) {
        continue;
      }
      if (!property.readOnly) {
        result += '\t\tif (this.props.' + property.name + ') {\n';
        result += '\t\t\tthis._refElement.' + property.name + ' = ';
        result += 'this.props.' + property.name + ';\n';
        result += '\t\t}\n';
      }
    }
    result += '\t}\n\n';
    return result;
  }
  /**
   * Creates `componentWillUnmount()` definition
   *
   * @param {Object} component Analysis result for an element.
   * @return {String}
   */
  _getClassUnmoutCallback(component) {
    let result = '\tcomponentWillUnmount() {\n';
    // events handling
    const iterator = component.events.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let event = value.value;
      let eventName = this._computeLocalEventName(event.name);
      result += '\t\tthis._refElement.removeEventListener(\'' +
        event.name + '\',';
      result += ' this.' + eventName + ');\n';
    }
    result += '\t}\n\n';
    return result;
  }
  /**
   * Creates `componentDidUpdate` definition.
   *
   * @param {Object} properties Analysis result for element properties.
   * @return {String}
   */
  _getClassUpdateCallback(properties) {
    let result = '\tcomponentDidUpdate(pp) {\n';
    const iterator = properties.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let property = value.value;
      if (property.privacy !== 'public' || property.readOnly) {
        continue;
      }
      if (property.type === 'Function') {
        continue;
      }
      if (this._polymerProperties.indexOf(property.name) !== -1) {
        continue;
      }
      result += '\t\tif (pp.' + property.name + ' !== this.props.' +
        property.name + ') {\n';
      result += '\t\t\tthis._refElement.' + property.name + ' = ';
      result += 'this.props.' + property.name + ';\n';
      result += '\t\t}\n';
    }
    result += '\t}\n\n';
    return result;
  }
  /**
   * Creates declaration for event handlers
   *
   * @param {Object} events Analysis result for list of events in element.
   * @return {String}
   */
  _getEventsDeclarations(events) {
    let result = '';
    const iterator = events.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let event = value.value;
      let eventName = this._computeLocalEventName(event.name);
      let propName = this._computePropEventName(event.name);
      result += '\t' + eventName + '(e) {\n';
      result += '\t\tif (this.props.' + propName + ') {\n';
      result += '\t\t\tthis.props.' + propName;
      result += '(e.detail, e);\n';
      result += '\t\t}\n';
      result += '\t}\n\n';
    }
    return result;
  }
  /**
   * Created definition for methods API
   *
   * @param {Object} component Analysis result for an element.
   * @return {String}
   */
  _getMethodsCallDeclarations(component) {
    let result = '';
    let iterator = component.properties.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let property = value.value;
      if (property.type !== 'Function') {
        continue;
      }
      result += this._getGetterDeclaration(property);
    }
    iterator = component.methods.values();
    while (true) {
      let value = iterator.next();
      if (value.done) {
        break;
      }
      let method = value.value;
      if (method.privacy !== 'public') {
        continue;
      }
      if (this._polymerFunctions.indexOf(method.name) !== -1) {
        continue;
      }
      if (method.type !== 'Function') {
        if (method.astNode.type === 'Property') {
          result += this._getGetterDeclaration(method);
        }
        continue;
      }
      let argumentsList = '';
      if (method.params && method.params.length) {
        let names = [];
        for (let i = 0, len = method.params.length; i < len; i++) {
          names.push(method.params[i].name);
        }
        argumentsList = names.join(', ');
      }
      result += '\t' + method.name + '(' + argumentsList + ') {\n';
      result += '\t\tthis._refElement.' + method.name + '(' + argumentsList;
      result += ');\n';
      result += '\t}\n\n';
    }
    return result;
  }
  /**
   * Creates declaration for getters
   *
   * @param {String} method Getter name
   * @return {String}
   */
  _getGetterDeclaration(method) {
    let result = '\tget ' + method.name + '() {\n';
    result += '\t\treturn this._refElement.' + method.name + ';\n';
    result += '\t}\n\n';
    return result;
  }
  /**
   * Creates `render()` method definition.
   *
   * @param {String} name Component name
   * @return {String}
   */
  _getClassRenderMethod(name) {
    let result = '\trender() {\n';
    result += '\t\treturn (\n';
    result += '\t\t\t<div>\n';
    result += `\t\t\t\t<${name}\n`;
    result += '\t\t\t\t  ref={(element) => {this._refElement = element;}}/>\n';
    result += '\t\t\t</div>\n';
    result += '\t\t);\n';
    result += '\t}\n';
    return result;
  }

  _computeLocalEventName(name) {
    return '_' + this._caseMap.dashToCamelCase(name, false) + 'Event';
  }

  _computePropEventName(name) {
    return 'on' + this._caseMap.dashToCamelCase(name, true);
  }

  _getPolyfillDeclaration() {
    var result = 'var polyfill = "<script>window.Polymer={dom:\'shadow\'};(function(){";\n';
    result += 'polyfill += "\'use strict\';var onload=function(){if(!window.HTMLImports){";\n';
    result += 'polyfill += "document.dispatchEvent(new CustomEvent(\'WebComponentsReady\',";\n';
    result += 'polyfill += "{bubbles:true}));}};var webComponentsSupported=";\n';
    result += 'polyfill += "(\'registerElement\'in document&&\'import\'in document.";\n';
    result += 'polyfill += "createElement(\'link\')";\n';
    result += 'polyfill += "&&\'content\'in document.createElement(\'template\'));if(!";\n';
    result += 'polyfill += "webComponentsSupported){var script=document";\n';
    result += 'polyfill += ".createElement(\'script\');";\n';
    result += 'polyfill += "script.async=true;script.src=\'BASEPATH/webcomponentsjs";\n';
    result += 'polyfill += "/webcomponents-lite.min.js\';script.onload=onload;document";\n';
    result += 'polyfill += ".head.appendChild";\n';
    result += 'polyfill += "(script);}else{document.addEventListener(\'DOMContentLoaded\'";\n';
    result += 'polyfill += ",function(){onload();});}})();</script>";\n';
    result += '/**\n * Use this function to add WC polyfill script declaration.\n *\n';
    result += ' * @param {?String} basePath - Path to the polyfill directory\n';
    result += ' * @return {String} A `script` HTML tag declaration\n';
    result += ' */\n';
    result += 'export const polyfillScript = (basePath) => polyfill.';
    result += 'replace(\'BASEPATH\', basePath || \'\');\n';
    return result;
  }

  _getImportsDeclaration() {
    let result = '';
    result += '/**\n * Use this function to import ARC components.\n *\n';
    result += ' * @param {?String} basePath - Path to the import file\'s directory\n';
    result += ' * @return {String} A `link` HTML tag declaration pointing to the import file\n';
    result += ' */\n';
    result += 'export const componentsImport = (basePath, importFile) => ';
    result += '\'<link rel="import" href="BASEPATH/IMPORTFILE">\'\n';
    result += '.replace(\'BASEPATH\', basePath || \'\')\n';
    result += '.replace(\'IMPORTFILE\', importFile || \'\');\n';
    return result;
  }
  /**
   * Generates a content of the `index.js` file.
   * It is to be used to simplify components import.
   *
   * @param {String} name React component name
   * @return {String} Content of the `index.js` file.
   */
  _computeComponentIndexFile(name) {
    let result = `import ${name} from './${name}';`;
    result += '\n\n';
    result += `export default ${name};`;
    return result;
  }
}
exports.Reactive = Reactive;

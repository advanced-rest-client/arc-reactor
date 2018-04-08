'use strict';

const {Reactive} = require('../lib/reactive');
const {ArcComponentsAnalyzer} = require('../lib/analyzer');
const assert = require('chai').assert;

const bundleFile = 'test/bundle-polymer2.html';
const logger = {
  log: function() {},
  warn: function() {},
  error: function() {}
};

const opts = {
  dest: 'test/build/'
};

describe('Reactive test - Polymer 2', function() {
  let analysis;
  before(() => {
    const analyzer = new ArcComponentsAnalyzer(bundleFile, logger);
    return analyzer.analyze()
    .then((result) => {
      analysis = result;
    });
  });

  describe('_listComponents()', function() {
    it('Returns an array', function() {
      const builder = new Reactive(analysis, opts, opts.dest, logger);
      const result = builder._listComponents();
      assert.typeOf(result, 'array');
    });

    it('Contains all defined elements', function() {
      const builder = new Reactive(analysis, opts, opts.dest, logger);
      const result = builder._listComponents();
      assert.lengthOf(result, 2);
    });

    it('Contains element defined in options', function() {
      opts.reactComponents = ['test-element'];
      const builder = new Reactive(analysis, opts, opts.dest, logger);
      const result = builder._listComponents();
      assert.lengthOf(result, 1);
    });
  });

  describe('getComponentAnalysis()', function() {
    let builder;
    before(function() {
      builder = new Reactive(analysis, opts, opts.dest, logger);
    });

    it('Returns an object', function() {
      const result = builder.getComponentAnalysis('test-element');
      assert.typeOf(result, 'object');
    });

    it('Throws error for unknown web components', function() {
      assert.throws(function() {
        builder.getComponentAnalysis('does-not-exists');
      });
    });
  });

  describe('computeInfo()', function() {
    let component;
    let builder;
    before(function() {
      builder = new Reactive(analysis, opts, opts.dest, logger);
      component = builder.getComponentAnalysis('test-element');
    });

    it('Returns an object', function() {
      const result = builder.computeInfo(component, 'test-name');
      assert.typeOf(result, 'object');
    });

    it('Result has component name', function() {
      const result = builder.computeInfo(component, 'test-name');
      assert.equal(result.name, 'test-name');
    });

    it('Result contains set of methods', function() {
      const result = builder.computeInfo(component, 'test-name');
      assert.isTrue(result.methods instanceof Map);
    });
    it('Result contains set of properties', function() {
      const result = builder.computeInfo(component, 'test-name');
      assert.typeOf(result.properties, 'map');
    });
    it('Result contains set of events', function() {
      const result = builder.computeInfo(component, 'test-name');
      assert.typeOf(result.events, 'map');
    });
  });

  describe('_computeComponentsContent()', function() {
    let builder;
    let modules;
    before(function() {
      builder = new Reactive(analysis, opts, opts.dest, logger);
      let component = builder.getComponentAnalysis('test-element');
      let info = builder.computeInfo(component, 'test-element');
      modules = new Set([info]);
    });

    it('Returns a map', function() {
      const result = builder._computeComponentsContent(modules);
      assert.typeOf(result, 'map');
    });

    it('Returns a single item', function() {
      const result = builder._computeComponentsContent(modules);
      assert.equal(result.size, 1);
    });
  });

  describe('_computeLocalEventName()', function() {
    let builder;
    before(function() {
      builder = new Reactive(analysis, opts, opts.dest, logger);
    });

    it('Should return event name', function() {
      const result = builder._computeLocalEventName('test');
      assert.typeOf(result, 'string');
    });

    it('Should begin with underscore', function() {
      const result = builder._computeLocalEventName('test');
      assert.equal(result[0], '_');
    });

    it('Should camel case the name', function() {
      const result = builder._computeLocalEventName('test-a-test');
      assert.equal(result.indexOf('-'), -1);
    });

    it('First letter is not upper cased', function() {
      const result = builder._computeLocalEventName('test-a-test');
      assert.equal(result[1], 't');
    });

    it('Adds "Event" suffix', function() {
      const result = builder._computeLocalEventName('test-a-test');
      assert.notEqual(result.indexOf('Event'), -1);
    });
  });

  describe('_computePropEventName()', function() {
    let builder;
    before(function() {
      builder = new Reactive(analysis, opts, opts.dest, logger);
    });

    it('Should return property handler name', function() {
      const result = builder._computePropEventName('test');
      assert.typeOf(result, 'string');
    });

    it('Should be prefixed with "on"', function() {
      const result = builder._computePropEventName('test');
      assert.equal(result.substr(0, 2), 'on');
    });

    it('Should camel case the name', function() {
      const result = builder._computePropEventName('test-a-test');
      assert.equal(result.indexOf('-'), -1);
    });

    it('First letter is be upper cased', function() {
      const result = builder._computePropEventName('test-a-test');
      assert.equal(result[2], 'T');
    });
  });

  describe('Building React class declaration', function() {
    let builder;
    let module;
    before(function() {
      builder = new Reactive(analysis, opts, opts.dest, logger);
      let component = builder.getComponentAnalysis('test-element');
      module = builder.computeInfo(component, 'test-element');
    });

    describe('_getReactComponentDeclaration()', function() {
      it('Returns string', function() {
        const result = builder._getReactComponentDeclaration(module);
        assert.typeOf(result, 'string');
      });
    });

    describe('_getClassHeader()', function() {
      it('Returns string', function() {
        const result = builder._getClassHeader(module.name);
        assert.typeOf(result, 'string');
      });

      it('Is default export', function() {
        const result = builder._getClassHeader(module.name);
        assert.notEqual(result.indexOf('default'), -1);
      });

      it('Is not default export for bundles', function() {
        builder.opts.bundle = true;
        const result = builder._getClassHeader(module.name);
        builder.opts.bundle = false;
        assert.equal(result.indexOf('default'), -1);
      });
    });

    describe('_getClassConstructor()', function() {
      it('Calls super class', function() {
        const result = builder._getClassConstructor(module);
        assert.notEqual(result.indexOf('super('), -1);
      });

      it('Binds events functions', function() {
        const result = builder._getClassConstructor(module);
        assert.notEqual(result.indexOf('this._testEventAEvent'), -1);
        assert.notEqual(result.indexOf('this._testEventBEvent'), -1);
      });

      it('Binds property change functions', function() {
        const result = builder._getClassConstructor(module);
        assert.notEqual(result.indexOf('this._test2ChangedEvent'), -1);
        assert.notEqual(result.indexOf('this._test3ChangedEvent'), -1);
      });
    });

    describe('_getClassMoutCallback()', function() {
      let result;
      before(function() {
        result = builder._getClassMoutCallback(module);
      });

      it('Attaches event listeners', function() {
        assert.notEqual(result.indexOf('.addEventListener(\'test-event-a\''),
          -1);
      });

      it('Attaches event listeners to the ref element', function() {
        assert.notEqual(result.indexOf('this._refElement.addEventListener('),
          -1);
      });

      it('Attaches property change listeners', function() {
        assert.notEqual(result.indexOf('.addEventListener(\'test2-changed\''),
          -1);
      });

      it('Sets properties', function() {
        assert.notEqual(result.indexOf('if (this.props.test1) {'), -1);
        assert.notEqual(
          result.indexOf('this._refElement.test1 = this.props.test1;'), -1);
      });

      it('Does not contain Polymer properties', function() {
        assert.equal(result.indexOf('importPath'), -1);
      });
    });

    describe('_getClassUnmoutCallback()', function() {
      let result;
      before(function() {
        result = builder._getClassUnmoutCallback(module);
      });

      it('Detaches event listeners', function() {
        assert.notEqual(
          result.indexOf('.removeEventListener(\'test-event-a\''), -1);
      });

      it('Detatches event listeners to the ref element', function() {
        assert.notEqual(
          result.indexOf('this._refElement.removeEventListener('), -1);
      });
    });

    describe('_getClassUpdateCallback()', function() {
      let result;
      before(function() {
        result = builder._getClassUpdateCallback(module.properties);
      });

      // It's loop so one test is enought

      it('Tests for property change', function() {
        assert.notEqual(
          result.indexOf('if (pp.test1 !== this.props.test1) {'), -1);
      });

      it('Updates the property', function() {
        assert.notEqual(
          result.indexOf('this._refElement.test1 = this.props.test1;'), -1);
      });

      it('Does not contain readonly properties', function() {
        assert.equal(
          result.indexOf('this._refElement.test3 = this.props.test3;'), -1);
        assert.equal(
          result.indexOf('this._refElement.test4 = this.props.test4;'), -1);
      });

      it('Does not contain Polymer properties', function() {
        assert.equal(result.indexOf('importPath'), -1);
      });
    });

    describe('_getEventsDeclarations()', function() {
      let result;
      before(function() {
        result = builder._getEventsDeclarations(module.events);
      });

      // It's loop so one test is enought

      it('Contains a method declaration', function() {
        assert.notEqual(result.indexOf('_testEventAEvent(e) {'), -1);
      });

      it('Checks if handler exists', function() {
        assert.notEqual(result.indexOf('if (this.props.onTestEventA) {'), -1);
      });

      it('Calls handler', function() {
        assert.notEqual(
          result.indexOf('this.props.onTestEventA(e.detail, e);'), -1);
      });
    });

    describe('_getMethodsCallDeclarations()', function() {
      let result;
      before(function() {
        result = builder._getMethodsCallDeclarations(module);
      });

      // It's loop so one test is enought

      it('Contains a method declaration', function() {
        assert.notEqual(result.indexOf('publicMethod() {'), -1);
      });

      it('Calls element\'s method', function() {
        assert.notEqual(result.indexOf('this._refElement.publicMethod();'), -1);
      });

      it('Declares arguments', function() {
        assert.notEqual(
          result.indexOf('publicMethodWithArguments(arg1, arg2) {'), -1);
      });

      it('Passes the arguments to element\'s function', function() {
        const index = result.indexOf(
          'this._refElement.publicMethodWithArguments(arg1, arg2);');
        assert.notEqual(index, -1);
      });

      it('Does not have Polymer methods', function() {
        const index = result.indexOf('attributeChangedCallback()');
        assert.equal(index, -1);
      });
    });

    describe('_getClassRenderMethod()', function() {
      let result;
      before(function() {
        result = builder._getClassRenderMethod(module.name);
      });
      it('Declates render method', function() {
        const index = result.indexOf('render() {');
        assert.equal(index, 1);
      });

      it('Includes element', function() {
        const index = result.indexOf(`<${module.name}`);
        assert.notEqual(index, -1);
      });

      it('Sets the reference to the element', function() {
        const index = result.indexOf(
          'ref={(element) => {this._refElement = element;}}');
        assert.notEqual(index, -1);
      });
    });

    describe('_computeComponentIndexFile()', function() {
      let builder;
      before(function() {
        builder = new Reactive(analysis, opts, opts.dest, logger);
      });

      it('Should generate a string content', function() {
        const result = builder._computeComponentIndexFile('TestName');
        assert.typeOf(result, 'string');
      });

      it('Should contain component import', function() {
        const result = builder._computeComponentIndexFile('TestName');
        assert.notEqual(
          result.indexOf('import TestName from \'./TestName\';'), -1);
      });

      it('Should contain export', function() {
        const result = builder._computeComponentIndexFile('TestName');
        assert.notEqual(result.indexOf('export default TestName;'), -1);
      });
    });
  });
});

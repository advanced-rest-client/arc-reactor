# wc-reactor

Node module to create React components wrappers for web components. The module is a part of Advanced REST Client ecostsrem.

# What does it do?

It **generates a React wrapper for web components** so it can be used in React application.
It creates exactly the same interface as web components uses. It handles all custom events, property change events and data
binding (in a React way).

## Example

```javascript
const reactor = require('wc-reactor');

reactor({
  // Polymer web component import file or Polymer bundle.
  webComponent: 'component-or-bundle.html',
  // Default deftination where to put files.
  dest: './build/',
  // print a lot of stuff unto the console
  verbose: true,
  // Creates separateb component definition for each module
  bundle: false
});
.then(() => console.log('Build complete <3'));
```

The result of generating React components is located in `./build` directory.
It's structure is:

```
| build/
  | - ComponentName/
      | - ComponentName.js
      | - index.js
  ... (each components separately)
  | - WebComponentsImports.js
```

The definition is in `ComponentName/ComponentName.js` file. `index.js` is a
shorthand for importing the module.

The `WebComponentsImports.js` contains 2 helper functions. `polyfillScript` function
contains HTML code that should be put in web page's head section. It imports
polyfills in a browser that doesn't support web components. `componentsImport` function
contains a declaration of the `<link>` tag that points to web component import file.

### Examples
```javascript
import { polyfillScript, componentsImport } from './WebComponentsImports';
var doc = `<html>
  <head>
    ...
    ${polyfillScript('/base-path')}
    ${componentsImport('/base-path', 'import-file-name.html')}
  </head>
  <body></body>
</html>`
```

This would produce a document like the following:

```html
<html>
  <head>
    ...
    <script>// bit of a minified code</script>
    <link rel="import" href="/base-path/import-file-name.html">
  </head>
  <body></body>
</html>
```

## Names mapping in React component

React wrapper contains interface to manipulate web component's properties, handle
custom events (including properties change events) and to call public API functions.

### Properties mapping

Web components properties names are the same as React's `props`. So you can use
generated component like this:

```javascript
render() {
  return (
    <PaperCombobox label="My label" source={this.state.source}/>
  );
}
```

When the `PaperCombobox` component is mounted then the `label` and `source` props
are propagated to the underlying web component. The same is happening each time
when React state change:

```javascript
this.setState({
  source: ['One', 'Two', 'three']
});
```
Updating the sate value will update corresponding web component's property.

#### Polymer's data binding

Polymer powered web components uses Polymer's data binding for properties. This
can be easily done in react by using `on` + `propertyName` + `Changed` function set to a property.

Assume that our `PaperCombobox` web component has `value` property marked in
Polymer web components as `notify` (sends non-bubbling custom event when value change).
You can handle it in React application using functions:

```javascript
_onValueChanged(newValue, e) {
  e.preventDefault();
  console.log(newValue);
}

render() {
  return (
    <PaperCombobox label="My label" source={this.state.source} onValueChanged={this._onValueChanged}/>
  );
}
```

New value and original event is always passed to data binding change function calls. You can use event to access additional data.

Note: Only public properties are handled by the wrapper. It doesn't work with protected properties (name is starting with `_`).

### Methods mapping

Methods are copied 1:1 from the web component. Only public methods are available in the wrapper.
Lifecycle methods are also unavailable.

Let's assume that the `PaperCombobox` element has a `selectNext` method in it's public API:

```javascript
selectNextDropdownItem() {
  this._refElement.selectNext();
}

render() {
  return (
    <PaperCombobox ref={(element) => {this._refElement = element;}}/>
  );
}
```

### Events mapping

Custom events names are translated to camel case function call as:
`on` + `UppercaseCamelCaleEventName`.

Custom event's detail object and the event itself is passed as an argument to the function call.

```javascript
_comboNextSelected(detail, e) {
  console.log(e.target, e.path);
  console.log('Next element selected', detail);
  // detail === e.detail
}

render() {
  return (
    <PaperCombobox onNextSelected={this._comboNextSelected}/>
  );
}
```

The script above handles the `next-selected` event and passes the detail of the event
to the function.

## API

All options are defined in `lib/options.js`.

**webComponent** {`String`}

A path to a Polymer powered web component to analyze and build the React wrapper for.

It can be a single web component declaration or a bundle file of Polymer web components.

**reactComponents** {`Array<String>`}

List of web components names to be exposed to generated React component so it can be included in React application.

Defining this option is optional. By default all components found in the `webComponent` file are processed and wrapped into React component.

To reduce size of generated code it is a good idea to declare number of components that your application is using. If the `webComponent` file is a bundle of web components you can reduce generated file by setting this property.

Provide list of components names only, without any repository path or version information.
For example `['raml-request-panel', 'paper-input']`

**dest** `{String}`

The destination where the build files are put. Absolute or relative path.

By default it puts the files into `build` directory of the working dir.

**bundle** `{Boolean}`

By default it creates a separate file for each web component found in `webComponent` file. When this option is set then it bundles all React components into a single file and exports each React component.

**bundleName** `{String}`

File name of generated component. It defaults to `WebComponents.js`. This is only relevant if `bundle` is set. Otherwise each file name is a web component name.

**logger** `{Object}`

Instance of any logger library that has `log()`, `info()`, `warn()` and `error()` functions.
If not provided a console's output will be used.

**verbose** `{Boolean}`

If set then it prints verbose messages.

## Double events problem

Sometimes Polymer web components sends an event that has the same name as
data binding event. In this case you will notice two handler function calls with
different set of arguments.

Polymer powered web component can contain a property declaration with `notify`
set to true. It is used by the data binding system to update property value on a
parent element / application. Those change events does not bubble. They can be only
handled when setting an event listener on the element. That's is why sometimes
authors prefer to send additional event with the same name that bubbles through
the DOM. Consider the following example:

```javascript
// Polymer element (v1)
Poymer({
  is: 'paper-combobox',
  properties: {
    value: {
      type: String,
      notify: true,
      observer: '_valueChanged'
    }
  },

  _valueChanged: function(value) {
    this.fire('value-changed', {
      value: value
    });
  }
});
```
This components sends two `value-changed` events when the value property have changed.
Because of the name collision the React wrapper automatically calls `onValueChanged`
prop function as a data binding automated function and then it also listens for
the `value-changed` event and calls the same `onValueChanged` function.

Automated change handler functions have a value of changed property as the first argument.
Regulars event handlers have event's detail object as a first argument. Therefore you
may end up handling the same event twice but with different argument.

## Contributing

1. Fork it
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request <3

## Supported Node.js Versions

arc-components-builder officially supports the latest current & active [LTS](https://github.com/nodejs/LTS) versions of Node.js. It may be working with previous versions but it is not intentional.

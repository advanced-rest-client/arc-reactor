const reactor = require('../');

reactor({
  webComponent: 'test/bundle.html',
  verbose: true,
  dest: 'test/build/',
  logger: console,
  bundle: true
});

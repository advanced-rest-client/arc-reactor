const reactor = require('../');

reactor({
  webComponent: 'test/bundle-polymer2.html',
  verbose: true,
  dest: 'test/build/',
  logger: console,
  bundle: true
});

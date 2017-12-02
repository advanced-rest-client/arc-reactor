'use strict';

/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */

const {ArcReactor} = require('./lib/reactor.js');
const {BuildOptions} = require('./lib/options.js');

module.exports = function(options) {
  if (!(options instanceof BuildOptions)) {
    options = new BuildOptions(options);
  }

  const project = new ArcReactor(options);
  return project.build();
};

module.exports.ArcReactor = ArcReactor;
module.exports.BuildOptions = BuildOptions;

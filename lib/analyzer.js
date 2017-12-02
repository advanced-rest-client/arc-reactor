'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc
 */
const {Analyzer, FSUrlLoader} = require('polymer-analyzer');
const path = require('path');

class ArcComponentsAnalyzer {
  constructor(file, logger) {
    this.logger = logger;
    this.file = path.basename(file);
    this.path = path.dirname(file);
  }

  analyze() {
    this.logger.log('Analyzing Polymer components');
    const analyzer = new Analyzer({
      urlLoader: new FSUrlLoader(this.path),
    });
    return analyzer.analyze(['./' + this.file]);
  }

}
exports.ArcComponentsAnalyzer = ArcComponentsAnalyzer;

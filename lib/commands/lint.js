const { dirname } = require('path');
const { CLIEngine } = require('eslint');
const { chain } = require('lodash');
const { readAssets } = require('../utils/assets');

module.exports = (cli, args) => {
  return new Promise(() => {
    const files = chain(readAssets(cli))
      .filter({ handler: 'browserify' })
      .map(entry => Array.isArray(entry.src) ? entry.src : [entry.src])
      .flatten()
      .map(src => `${src}/**/*.{js,vue}`)
      .value()
    ;

    const config = {
      cwd: cli.context,
      fix: !!args.fix || false,
      extensions: ['.js', '.vue']
    };

    const engine = new CLIEngine(config);
    const report = engine.executeOnFiles(files);
    const formatter = engine.getFormatter(args.format || 'codeframe');

    if (config.fix) {
      CLIEngine.outputFixes(report);
    }

    console.log(report.results);
    console.log(formatter(report.results));
  });
};
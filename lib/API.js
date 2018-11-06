const { resolve } = require('path');
const { defaults, validate } = require('./options');
const Logger = require('@kocal/logger');
const defaultsDeep = require('lodash/defaultsDeep');

class API {
  constructor(context, mode = 'development', verbose = false) {
    this.plugins = [];
    this.commands = [];
    this.context = context;
    this.mode = mode;
    this.verbose = verbose;
    this.logger = initLogger();
    this.projectOptions = defaultsDeep(loadUserOptions(), defaults());
    this.resolvePlugins();
  }

  registerCommand(commandName, opts, fn) {
    this.commands[commandName] = { opts, fn };
  }

  executeCommand(commandName, params) {
    if (!commandName) {
      throw new Error('You must specify a command to run.');
    }

    const command = this.commands[commandName];
    if (!command) {
      throw new Error(`Command "${commandName}" does not exist.`);
    }

    return new Promise((resolve, reject) => {
      return command.fn(params)
        .then(() => resolve())
        .catch(err => reject(err));
    });
  }

  /**
   * @private
   */
  resolvePlugins() {
    this.plugins = [
      './commands/build',
      './commands/lint',
    ];

    this.plugins.forEach(plugin => {
      require(plugin)(this);
    });
  }
}

module.exports = API;

function initLogger(verbose = false) {
  return Logger.getLogger('yprox-cli', {
    level: verbose ? 'log' : 'info',
    format: (ctx, variables) => `[${ctx.chalk.blue(ctx.luxon.toFormat('HH:mm:ss'))}] ${ctx.levelColor(ctx.level)} :: ${ctx.message}`,
  });
}

function loadUserOptions() {
  const configFile = resolve(process.cwd(), 'yprox-cli.config.js');
  const config = require(configFile);

  validate(config);

  return config;
}
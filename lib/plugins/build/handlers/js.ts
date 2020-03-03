import path from 'path';
import graphql from '@kocal/rollup-plugin-graphql';
import chalk from 'chalk';
import { InputOption, InputOptions, OutputOptions, rollup, RollupBuild, RollupError, RollupOutput, RollupWatcherEvent, watch } from 'rollup';
import babel from 'rollup-plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import multi from '@rollup/plugin-multi-entry';
import { terser } from 'rollup-plugin-terser';
import { EntryJS } from '../../../../types/entry';
import API from '../../../API';
import { getEntryName } from '../../../utils/entry';
import { isPackageInstalled } from '../../../utils/package';

interface WatchEvent {
  code?: string;
  duration?: number;
  error?: RollupError | Error;
  input?: InputOption;
  output?: string[];
  result?: RollupBuild;
}

function handleError(err: RollupError, api: API): void {
  let description = err.message || err;
  if (err.name) description = `${err.name}: ${description}`;
  let message = err.message || '';

  if (err.plugin) {
    message = `(${err.plugin} plugin) ${description}`;
  } else if (description) {
    message = description as string;
  }

  console.error(chalk`{bold.red [!] ${message.toString()}}`);

  if (err.loc) {
    console.error(`${(err.loc.file || err.id || '').replace(api.context, '')} (${err.loc.line}:${err.loc.column})`);
  } else if (err.id) {
    console.error(err.id.replace(api.context, ''));
  }

  if (err.frame) {
    console.error(chalk.dim(err.frame));
  }

  if (err.stack) {
    console.error(chalk.dim(err.stack));
  }

  const file = (err.loc && err.loc.file) || err.id || '';
  if (/\.vue$/.test(file)) {
    api.logger.info(chalk`If you try to building Vue code, try to run {blue.bold yarn add -D vue-template-compiler}.`);
  }

  console.error('');
}

function isBabelInstalled(): boolean {
  return isPackageInstalled('@babel/core');
}

function isBabelConfigured(api: API): boolean {
  const babelCore = require('@babel/core');

  const partialConfig = babelCore.loadPartialConfig({
    root: api.context,
    cwd: api.context,
    filename: api.resolve('yprox-cli.config.js'),
  });

  return partialConfig.hasFilesystemConfig();
}

export default (api: API, entry: EntryJS, args: CLIArgs): Promise<any> => {
  const jsOptions = { ...api.projectOptions.handlers.javascript };
  const getInputOptions = (): InputOptions => {
    const plugins = [];

    plugins.push(builtins());
    plugins.push(multi());
    if (typeof jsOptions.nodeResolve === 'object') plugins.push(nodeResolve({ ...jsOptions.nodeResolve }));
    if (typeof jsOptions.commonjs === 'object') plugins.push(commonjs({ ...jsOptions.commonjs }));
    if (typeof jsOptions.json === 'object') plugins.push(json({ ...jsOptions.json }));
    plugins.push(graphql());
    plugins.push(globals());

    if (typeof jsOptions.vue === 'object') {
      if (isPackageInstalled('vue-template-compiler')) {
        const vue = require('rollup-plugin-vue');
        plugins.push(vue({ ...jsOptions.vue }));
      }
    }

    if (isBabelInstalled() && isBabelConfigured(api) && api.projectOptions.babel) {
      plugins.push(
        babel({
          ...api.projectOptions.handlers.javascript.babel,
          cwd: api.context,
        })
      );
    }

    plugins.push(
      replace({
        ...Object.entries(api.getSafeEnvVars()).reduce((acc: { [k: string]: string }, [key, value]) => {
          acc[`process.env.${key}`] = JSON.stringify(value);
          return acc;
        }, {}),
      })
    );

    if (api.isProduction()) {
      plugins.push(terser({ ...api.projectOptions.terser }));
    }

    return {
      plugins,
      input: entry.src,
      external: Object.keys(jsOptions.shims),
    };
  };

  const getOutputOptions = (): OutputOptions => ({
    file: path.join(entry.dest, entry.destFile || (entry.concat as string)),
    format: entry.format || 'umd',
    name: entry.name,
    sourcemap: entry.sourceMaps,
    globals: jsOptions.shims,
  });

  const writeBundle = (bundle: RollupBuild): Promise<RollupOutput> => bundle.write(getOutputOptions());

  const build = (resolve: (v?: any) => void, reject: (err?: Error) => void): Promise<void> => {
    api.logger.info(`js :: start bundling "${getEntryName(entry)}"`);

    return rollup(getInputOptions())
      .then(bundle => writeBundle(bundle))
      .then(() => {
        api.logger.info(`js :: finished bundling "${getEntryName(entry)}"`);
        resolve();
      })
      .catch((err: RollupError) => {
        handleError(err, api);

        if (!args.watch) {
          reject();
          process.exit(1);
        }
      });
  };

  const buildWatcher = (): void => {
    const watchOptions = {
      ...getInputOptions(),
      output: getOutputOptions(),
      watch: {
        chokidar: {
          usePolling: true,
          ignored: ['**/node_modules/**'],
        },
        exclude: '**/node_modules/**',
      },
    };

    // @ts-ignore
    const watcher = watch(watchOptions);

    watcher.on('event', (e: RollupWatcherEvent) => {
      if (e.code === 'BUNDLE_START') {
        api.logger.info(`rollup (watch) :: start bundling "${getEntryName(entry)}"`);
      } else if (e.code === 'BUNDLE_END') {
        api.logger.info(`rollup (watch) :: finished bundling "${getEntryName(entry)}"`);
      } else if (e.code === 'ERROR') {
        handleError(e.error, api);
      }
    });
  };

  return new Promise((resolve, reject) => {
    return args.watch ? buildWatcher() : build(resolve, reject);
  });
};

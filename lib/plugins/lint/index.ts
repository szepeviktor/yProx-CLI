import { dirname } from 'path';
import { Entry } from '../../../types/entry';
import API from '../../API';
import { flatten, groupBy } from '../../utils/array';
import { readEntries } from '../../utils/entry';
import linters from './linters';

function normalizeEntry(theEntry: Entry): Entry {
  const entry = { ...theEntry };

  if (entry.handler === 'rollup') {
    entry.src = entry.src.map((src: string) => {
      if (src.endsWith('index.js')) {
        return `${dirname(src)}/**/*.{js,vue}`;
      }

      return src;
    });
  }

  entry.src = entry.src.filter((src: string) => !/node_modules/.test(src));

  return entry;
}

export default (api: API): void => {
  api.registerCommand(
    'lint',
    {
      description: 'lint source files',
      usage: 'yprox-cli lint [options]',
      options: {
        ...require('../commonOptions'),
        '--fix': 'automatically fix lint errors',
        '--max-warnings': 'number of warnings to trigger nonzero exit code - default: -1',
      },
    },
    args => {
      const entriesByHandler: { [k: string]: Entry[] } = readEntries(api, args)
        .filter(({ handler }) => handler in linters)
        .map(normalizeEntry)
        .reduce(groupBy('handler'), {});

      const promises: Promise<any>[] = [];

      Object.entries(entriesByHandler).forEach(([handler, entries]) => {
        const linter = handler;
        const files = entries
          .filter(entry => !entry.skip_lint)
          .map(entry => entry.src)
          .reduce(flatten(), []);

        if (files.length === 0) {
          return;
        }

        promises.push(
          (linters as any)
            [linter]()(api, args, files)
            .catch((err: Error) => {
              api.logger.error(`${linter} (lint) :: ${err.message}`);
              process.exit(1);
            })
        );
      });

      return Promise.all(promises);
    }
  );
};

export async function lintEntry(api: API, entry: Entry, args: CLIArgs): Promise<void> {
  const linter = entry.handler;
  const normalizedEntry = normalizeEntry(entry);

  if (!(linter in linters) || normalizedEntry.skip_lint === true || normalizedEntry.src.length === 0) {
    return Promise.resolve();
  }

  return (linters as any)[linter]()(api, args, normalizedEntry.src);
}

import * as os from 'os';
import * as fs from 'fs-extra';
import util from 'util';
import API from '../../lib/API';

const exec = util.promisify(require('child_process').exec);

type Files = { [k: string]: string | Buffer };
type FakeEnvArgs = { files: Files | string; mode: string; verbose: boolean };
type FakeEnv = {
  api: API;
  cleanup: () => void;
  run: (command: string) => Promise<{ stdout: string; stderr: string; code: number }>;
  installYproxCli: () => Promise<{ stdout: string; stderr: string; code: number }>;
  readFile: (filename: string, encoding?: string) => Promise<string>;
  writeFile: (filename: string, content: string) => Promise<void>;
  fileExists: (filename: string) => Promise<boolean>;
};
export const createFakeEnv = async ({ files = {}, mode = 'development', verbose = false }: Partial<FakeEnvArgs> = {}): Promise<FakeEnv> => {
  // Create new env
  const env = Math.random()
    .toString(36)
    .substring(7);
  const context = `${os.tmpdir()}/yprox-cli/${env}`;
  await fs.mkdirp(context);

  // Create files
  if (typeof files === 'string') {
    await fs.copy(`${__dirname}/../fixtures/${files}`, context);
  } else {
    await Promise.all(
      Object.entries(files).map(([filename, content]) => {
        return fs.outputFile(`${context}/${filename}`, content);
      })
    );
  }

  // Create API and helpers funcs
  const api = new API(context, mode, verbose);

  const run = async (command: string): Promise<{ stdout: string; stderr: string; code: number }> => {
    return await exec(command, {
      cwd: context,
      env: {
        ...process.env,
        NODE_PATH: api.resolve('node_modules'),
      },
    });
  };

  const installYproxCli = async (): Promise<{ stdout: string; stderr: string; code: number }> => {
    const tarball = `${__dirname}/../../yproximite-yprox-cli-0.0.0-development.tgz`;
    return run(`yarn add file:${tarball}`);
  };

  const cleanup = async () => {
    return await fs.remove(context);
  };

  const readFile = async (filename: string, encoding: string = 'utf8'): Promise<string> => {
    return await fs.readFile(api.resolve(filename), { encoding });
  };

  const writeFile = async (filename: string, content: string): Promise<void> => {
    return await fs.writeFile(api.resolve(filename), content);
  };

  const fileExists = async (filename: string): Promise<boolean> => {
    return await fs.pathExists(api.resolve(filename));
  };

  return { api, run, installYproxCli, cleanup, readFile, writeFile, fileExists };
};
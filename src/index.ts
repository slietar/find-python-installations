import fs from 'node:fs/promises';
import path from 'node:path';
import which from 'which';

import { PythonInstallation, PythonInstallationRecord, PythonVersion } from './types.js';
import { arrayFromAsync, runCommand } from './util.js';
import { inspect } from 'node:util';


const IS_WINDOWS = (process.platform === 'win32');


export async function* findPythonExecutablesInPath() {
  let pathExt = IS_WINDOWS
    ? process.env['PATHEXT']?.split(path.delimiter) ?? ['.EXE', '.CMD', '.BAT', '.COM']
    : null;

  for (let pathDirPath of (process.env['PATH']?.split(path.delimiter) ?? [])) {
    try {
      for (let rawName of await fs.readdir(pathDirPath)) {
        let name = rawName.toLowerCase();

        if (IS_WINDOWS) {
          let nameExt = pathExt!.find((ext) => name.endsWith(ext.toLowerCase()));

          if (!nameExt) {
            continue;
          }

          name = name.slice(0, -nameExt.length);

          if (!/^py(?:thon(\d+)\.(\d+))?$/.test(name)) {
            continue;
          }
        } else if (!/^python(\d+)\.(\d+)$/.test(name)) {
          continue;
        }

        yield path.join(pathDirPath, name);
      }
    } catch (err: any) {
      if (!['ENOENT', 'ENOTDIR'].includes(err.code)) {
        throw err;
      }
    }
  }
}


export async function findPythonInstallations() {
  let possiblePythonLocations = await arrayFromAsync(findPythonExecutablesInPath());
  let condaList = await runCommand(['conda', 'env', 'list', '--json'], { ignoreErrors: true });

  if (condaList) {
    possiblePythonLocations.push(...JSON.parse(condaList[0]).envs.map((env: string) => path.join(env, 'bin/python')));
  }

  possiblePythonLocations = (await Promise.all(
    possiblePythonLocations.map(async (possibleLocation) => await which(possibleLocation).catch(() => null))
  )).filter((possibleLocation): possibleLocation is string => possibleLocation !== null);

  let installations: PythonInstallationRecord = {};

  for (let possibleLocation of possiblePythonLocations) {
    if (possibleLocation in installations) {
      continue;
    }

    let info = await getPythonInstallationInfo(possibleLocation);

    if (!info) {
      continue;
    }

    let installation: PythonInstallation = {
      id: possibleLocation,
      info,
      leaf: true,
      path: possibleLocation,
      symlink: false
    };

    let lastInstallation = installation;
    installations[installation.id] = installation;

    if (process.platform !== 'win32') {
      while (true) {
        let linkPath: string;

        try {
          linkPath = await fs.readlink(lastInstallation.path);
        } catch (err) {
          if ((err as { code: string; }).code === 'EINVAL') {
            break;
          }

          throw err;
        }

        lastInstallation.symlink = true;

        let installationPath = path.resolve(path.dirname(lastInstallation.path), linkPath);

        if (installationPath in installations) {
          installations[installationPath].leaf = false;
          break;
        }

        let installation: PythonInstallation = {
          id: installationPath,
          info,
          leaf: false,
          path: installationPath,
          symlink: false
        };

        installations[installation.id] = installation;
        lastInstallation = installation;
      }
    }
  };

  return installations;
}

export async function getPythonInstallationInfo(location: string): Promise<PythonInstallation['info'] | null> {
  let architectures: string[] | null;
  let isVirtualEnv: boolean;
  let supportsVirtualEnv: boolean;
  let version: PythonVersion;

  {
    let result = await runCommand([location, '--version'], { ignoreErrors: true });

    if (!result) {
      return null;
    }

    let [stdout, stderr] = result;
    let possibleVersion = parsePythonVersion(stdout || stderr);

    if (!possibleVersion) {
      return null;
    }

    version = possibleVersion;
  }

  if (process.platform === 'darwin') {
    let [stdout, _stderr] = await runCommand(['file', location]);
    let matches = Array.from(stdout.matchAll(/executable ([a-z0-9_]+)$/gm));

    architectures = matches.map((match) => match[1]);
  } else {
    architectures = null;
  }

  {
    let [stdout, _stderr] = await runCommand([location, '-c', `import sys; print('Yes' if sys.base_prefix != sys.prefix else 'No')`]);
    isVirtualEnv = (stdout == "Yes\n");
  }

  supportsVirtualEnv = (await runCommand([location, '-m', 'venv', '-h'], { ignoreErrors: true })) !== null;

  return {
    architectures,
    isVirtualEnv,
    supportsVirtualEnv,
    version
  };
}


export function parsePythonVersion(input: string): PythonVersion | null {
  let match = /^Python (\d+)\.(\d+)\.(\d+)\r?\n$/.exec(input);

  if (match) {
    let major = parseInt(match[1]);
    let minor = parseInt(match[2]);
    let patch = parseInt(match[3]);

    return [major, minor, patch];
  }

  return null;
}


console.log(inspect(await findPythonInstallations(), { colors: true, depth: Infinity }));

# find-python-installations

This package finds all Python installations on the system. It looks for executables named `py`, `python`, `python*` or `python*.*` in `$PATH` as well as the virtual environments reported by `conda env list`. Symbolic links pointing to Python executables are also returned.


## Installation

```sh
$ npm install find-python-installations
```


## Usage

```js
import { findPythonInstallations } from 'find-python-installations';

await findPythonInstallations()
// =>
{
  '/opt/homebrew/bin/python3': {
    id: '/opt/homebrew/bin/python3',
    info: {
      architectures: ['arm64'],
      isVirtualEnv: false,
      supportsVirtualEnv: true,
      version: [3, 11, 3]
    },
    leaf: true,
    path: '/opt/homebrew/bin/python3',
    symlink: true
  },
  ...
}
```

#!/usr/bin/env node

import { inspect } from 'node:util';

import { findPythonInstallations } from './index.js';


console.log(inspect(await findPythonInstallations(), { colors: true, depth: Infinity }));

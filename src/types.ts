declare const brand: unique symbol;

export type PythonVersion = [number, number, number];

export interface PythonInstallation {
  id: PythonInstallationId;
  leaf: boolean;
  path: string;
  info: {
    architectures: string[] | null;
    isVirtualEnv: boolean;
    supportsVirtualEnv: boolean;
    version: PythonVersion;
  };
  symlink: boolean;
}

export type PythonInstallationId = string & { [brand]: null };
export type PythonInstallationRecord = Record<PythonInstallationId, PythonInstallation>;

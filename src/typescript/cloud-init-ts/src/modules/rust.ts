import { ModuleContribution } from "../builders";

/**
 * Rust module.
 *
 * Installs Rust via rustup as a specified user using late-commands.
 */

export interface RustModuleOptions {
  /** Username to install Rust for. */
  user: string;
}

export function rust(options: RustModuleOptions): ModuleContribution {
  const { user } = options;

  return {
    packages: [],
    lateCommands: [
      `curtin in-target -- sudo -u ${user} bash -c 'curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'`,
    ],
  };
}

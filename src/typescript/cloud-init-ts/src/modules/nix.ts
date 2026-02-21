import { ModuleContribution } from "../builders";

/**
 * Nix module.
 *
 * Installs the Nix package manager (Determinate Systems installer) for
 * a specified user. Enables flakes by default. Intended for use with
 * home-manager for declarative dotfile/environment management.
 */

export interface NixModuleOptions {
  /** Username to configure Nix for. */
  user: string;
}

export function nix(options: NixModuleOptions): ModuleContribution {
  const { user } = options;

  return {
    packages: [],
    lateCommands: [
      // Install Nix via Determinate Systems installer (enables flakes by default)
      `curtin in-target -- bash -c 'curl --proto "=https" --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install --no-confirm'`,
      // Ensure the user can access nix
      `curtin in-target -- sudo -u ${user} bash -c '. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh && nix --version'`,
    ],
  };
}

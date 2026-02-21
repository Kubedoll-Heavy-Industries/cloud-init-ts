import { ModuleContribution } from "../builders";

/**
 * Homebrew module.
 *
 * Installs Homebrew (Linuxbrew) as a specified user, and optionally
 * installs brew packages afterwards.
 */

export interface HomebrewModuleOptions {
  /** Username to install Homebrew for. */
  user: string;
  /** Brew packages to install after Homebrew itself. */
  packages?: string[];
}

export function homebrew(options: HomebrewModuleOptions): ModuleContribution {
  const { user, packages: brewPackages = [] } = options;

  const lateCommands = [
    `curtin in-target -- sudo -u ${user} bash -c 'NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'`,
  ];

  if (brewPackages.length > 0) {
    lateCommands.push(
      `curtin in-target -- sudo -u ${user} bash -c '/home/linuxbrew/.linuxbrew/bin/brew install ${brewPackages.join(" ")}'`,
    );
  }

  return { packages: [], lateCommands };
}

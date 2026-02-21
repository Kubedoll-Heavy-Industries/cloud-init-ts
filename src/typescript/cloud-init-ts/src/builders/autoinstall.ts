import {
  Autoinstall,
  AutoinstallDocument,
  Keyboard,
  Ssh,
  Kernel,
  User,
  WriteFile,
  StorageEntry,
  Storage,
  validateAutoinstall,
} from "../schema";

/**
 * The shape returned by each composable module function.
 * Modules contribute packages, late-commands, and optional write_files
 * that get merged into the final autoinstall config.
 */
export interface ModuleContribution {
  packages: string[];
  lateCommands: string[];
  writeFiles?: WriteFile[];
}

/**
 * Fluent builder for constructing autoinstall configurations.
 *
 * Usage:
 *   const config = new AutoinstallBuilder()
 *     .locale("en_US.UTF-8")
 *     .keyboard({ layout: "us" })
 *     .ssh({ "install-server": true, "allow-pw": false })
 *     .storage(storageEntries)
 *     .addModule(docker())
 *     .build();
 */
export class AutoinstallBuilder {
  private config: Autoinstall;
  private users: User[] = [];
  private extraPackages: string[] = [];
  private extraLateCommands: string[] = [];
  private extraWriteFiles: WriteFile[] = [];
  private storageEntries: StorageEntry[] = [];
  private swapSize: number | undefined;

  constructor() {
    this.config = { version: 1 };
  }

  /** Set the refresh-installer update flag. */
  refreshInstaller(update: boolean): this {
    this.config["refresh-installer"] = { update };
    return this;
  }

  /** Set the system locale. */
  locale(locale: string): this {
    this.config.locale = locale;
    return this;
  }

  /** Set the keyboard layout configuration. */
  keyboard(keyboard: Keyboard): this {
    this.config.keyboard = keyboard;
    return this;
  }

  /** Set SSH server configuration. */
  ssh(ssh: Ssh): this {
    this.config.ssh = ssh;
    return this;
  }

  /** Enable or disable codec installation. */
  codecs(install: boolean): this {
    this.config.codecs = { install };
    return this;
  }

  /** Enable or disable third-party driver installation. */
  drivers(install: boolean): this {
    this.config.drivers = { install };
    return this;
  }

  /** Set OEM install mode. */
  oem(install: "auto" | "true" | "false"): this {
    this.config.oem = { install };
    return this;
  }

  /** Set kernel flavor or package. */
  kernel(kernel: Kernel): this {
    this.config.kernel = kernel;
    return this;
  }

  /** Set the timezone (or 'geoip' for automatic). */
  timezone(timezone: string): this {
    this.config.timezone = timezone;
    return this;
  }

  /** Set the updates policy. */
  updates(updates: "all" | "security" | "none"): this {
    this.config.updates = updates;
    return this;
  }

  /** Add base packages (not from modules). */
  packages(packages: string[]): this {
    this.extraPackages.push(...packages);
    return this;
  }

  /** Set swap size (0 to disable). */
  swap(size: number): this {
    this.swapSize = size;
    return this;
  }

  /** Add storage config entries (from ZFS module, boot disk, etc.). */
  storage(entries: StorageEntry[]): this {
    this.storageEntries.push(...entries);
    return this;
  }

  /** Add a user to the cloud-config user-data section. */
  addUser(user: User): this {
    this.users.push(user);
    return this;
  }

  /**
   * Apply a module contribution to this builder.
   * Modules provide packages, late-commands, and optional write_files
   * that are merged into the final configuration.
   */
  addModule(contribution: ModuleContribution): this {
    this.extraPackages.push(...contribution.packages);
    this.extraLateCommands.push(...contribution.lateCommands);
    if (contribution.writeFiles) {
      this.extraWriteFiles.push(...contribution.writeFiles);
    }
    return this;
  }

  /** Add raw late-commands directly. */
  lateCommands(commands: string[]): this {
    this.extraLateCommands.push(...commands);
    return this;
  }

  /**
   * Build and validate the final autoinstall document.
   * Throws a ZodError if the result fails schema validation.
   */
  build(): AutoinstallDocument {
    // Merge packages
    if (this.extraPackages.length > 0) {
      this.config.packages = [
        ...(this.config.packages ?? []),
        ...this.extraPackages,
      ];
    }

    // Merge storage
    if (this.storageEntries.length > 0 || this.swapSize !== undefined) {
      const storage: Storage = { config: this.storageEntries };
      if (this.swapSize !== undefined) {
        storage.swap = { size: this.swapSize };
      }
      this.config.storage = storage;
    }

    // Merge late-commands
    if (this.extraLateCommands.length > 0) {
      this.config["late-commands"] = [
        ...(this.config["late-commands"] ?? []),
        ...this.extraLateCommands,
      ];
    }

    // Merge user-data
    if (this.users.length > 0 || this.extraWriteFiles.length > 0) {
      this.config["user-data"] = this.config["user-data"] ?? {};

      if (this.users.length > 0) {
        this.config["user-data"].users = [
          ...(this.config["user-data"].users ?? []),
          ...this.users,
        ];
      }

      if (this.extraWriteFiles.length > 0) {
        this.config["user-data"].write_files = [
          ...(this.config["user-data"].write_files ?? []),
          ...this.extraWriteFiles,
        ];
      }
    }

    const document: AutoinstallDocument = { autoinstall: this.config };

    // Validate against schema before returning
    return validateAutoinstall(document);
  }
}

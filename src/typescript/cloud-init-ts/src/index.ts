// Schema types and validation
export {
  AutoinstallSchema,
  AutoinstallDocumentSchema,
  KeyboardSchema,
  SshSchema,
  RefreshInstallerSchema,
  CodecsSchema,
  DriversSchema,
  OemSchema,
  KernelSchema,
  CloudConfigSchema,
  UserSchema,
  WriteFileSchema,
  SshImportIdSchema,
  StorageSchema,
  StorageEntrySchema,
  DiskEntrySchema,
  DiskMatchSchema,
  PartitionEntrySchema,
  FormatEntrySchema,
  MountEntrySchema,
  LvmVolgroupEntrySchema,
  LvmPartitionEntrySchema,
  ZpoolEntrySchema,
  ZfsEntrySchema,
  validateAutoinstall,
} from "./schema";
export type {
  Autoinstall,
  AutoinstallDocument,
  Keyboard,
  Ssh,
  RefreshInstaller,
  Codecs,
  Drivers,
  Oem,
  Kernel,
  CloudConfig,
  User,
  WriteFile,
  Storage,
  StorageEntry,
  DiskEntry,
  DiskMatch,
  PartitionEntry,
  FormatEntry,
  MountEntry,
  LvmVolgroupEntry,
  LvmPartitionEntry,
  ZpoolEntry,
  ZfsEntry,
} from "./schema";

// Composable modules
export {
  docker,
  nvidia,
  rust,
  homebrew,
  yubikey,
  nix,
  bootDisk,
  zfsRootPool,
  zfsUserHome,
  zfsDataPool,
  diskRef,
} from "./modules";
export type {
  NvidiaModuleOptions,
  RustModuleOptions,
  HomebrewModuleOptions,
  NixModuleOptions,
  YubikeyModuleOptions,
  BootDiskOptions,
  ZfsRootPoolOptions,
  ZfsUserOptions,
  ZfsDataPoolOptions,
  DiskRefOptions,
} from "./modules";

// Builder
export { AutoinstallBuilder } from "./builders";
export type { ModuleContribution } from "./builders";

// Output
export { toYaml } from "./output";

import { z } from "zod";
import { CloudConfigSchema, WriteFileSchema } from "./cloud-config";
import { StorageSchema } from "./storage";

/**
 * Zod schemas for Ubuntu autoinstall v1 configuration.
 *
 * Reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
 */

/** Keyboard layout configuration. */
export const KeyboardSchema = z.object({
  layout: z.string().describe("Keyboard layout code, e.g. 'us'"),
  variant: z.string().optional().describe("Keyboard variant"),
});

export type Keyboard = z.infer<typeof KeyboardSchema>;

/** SSH server configuration. */
export const SshSchema = z.object({
  "install-server": z.boolean().describe("Whether to install OpenSSH server"),
  "allow-pw": z.boolean().optional().describe("Whether to allow password authentication"),
  authorized_keys: z.array(z.string()).optional().describe("Authorized SSH public keys for the default user"),
});

export type Ssh = z.infer<typeof SshSchema>;

/** Refresh installer configuration. */
export const RefreshInstallerSchema = z.object({
  update: z.boolean().describe("Whether to update the installer to the latest version"),
});

export type RefreshInstaller = z.infer<typeof RefreshInstallerSchema>;

/** Codec installation configuration. */
export const CodecsSchema = z.object({
  install: z.boolean().describe("Whether to install restricted codecs"),
});

export type Codecs = z.infer<typeof CodecsSchema>;

/** Driver installation configuration. */
export const DriversSchema = z.object({
  install: z.boolean().describe("Whether to install third-party drivers"),
});

export type Drivers = z.infer<typeof DriversSchema>;

/** OEM configuration. */
export const OemSchema = z.object({
  install: z.enum(["auto", "true", "false"]).describe("OEM install mode"),
});

export type Oem = z.infer<typeof OemSchema>;

/** Kernel flavor configuration. */
export const KernelSchema = z.object({
  flavor: z.string().optional().describe("Kernel flavor, e.g. 'hwe' or 'generic'"),
  package: z.string().optional().describe("Specific kernel package name"),
});

export type Kernel = z.infer<typeof KernelSchema>;

/** Top-level autoinstall configuration. */
export const AutoinstallSchema = z.object({
  version: z.literal(1).describe("Autoinstall schema version (must be 1)"),
  "refresh-installer": RefreshInstallerSchema.optional(),
  locale: z.string().optional().describe("System locale, e.g. 'en_US.UTF-8'"),
  keyboard: KeyboardSchema.optional(),
  ssh: SshSchema.optional(),
  codecs: CodecsSchema.optional(),
  drivers: DriversSchema.optional(),
  oem: OemSchema.optional(),
  kernel: KernelSchema.optional(),
  timezone: z.string().optional().describe("Timezone or 'geoip' for automatic detection"),
  updates: z.enum(["all", "security", "none"]).optional().describe("Which updates to install"),
  packages: z.array(z.string()).optional().describe("Additional packages to install"),
  storage: StorageSchema.optional().describe("Curtin storage configuration for disk layout"),
  "user-data": CloudConfigSchema.optional().describe("Cloud-config user-data section"),
  "late-commands": z.array(z.string()).optional().describe("Commands to run in the target system after installation"),
});

export type Autoinstall = z.infer<typeof AutoinstallSchema>;

/** The full cloud-config document wrapping autoinstall. */
export const AutoinstallDocumentSchema = z.object({
  autoinstall: AutoinstallSchema,
});

export type AutoinstallDocument = z.infer<typeof AutoinstallDocumentSchema>;

/**
 * Validate an autoinstall configuration against the schema.
 * Throws a ZodError if validation fails.
 */
export function validateAutoinstall(config: unknown): AutoinstallDocument {
  return AutoinstallDocumentSchema.parse(config);
}

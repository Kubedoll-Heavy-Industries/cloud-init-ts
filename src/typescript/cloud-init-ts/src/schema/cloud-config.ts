import { z } from "zod";

/**
 * Zod schemas for the cloud-config (user-data) section of autoinstall.
 *
 * These model the `user-data:` block that gets embedded inside the
 * autoinstall configuration and follows the standard cloud-init user-data
 * format (cloud-config).
 */

/** A single write_files entry for cloud-init. */
export const WriteFileSchema = z.object({
  path: z.string().describe("Absolute path where the file should be written"),
  content: z.string().describe("File content"),
  permissions: z.string().optional().describe("File permissions in octal, e.g. '0644'"),
  owner: z.string().optional().describe("Owner in 'user:group' format"),
});

export type WriteFile = z.infer<typeof WriteFileSchema>;

/** SSH key import source (e.g. 'gh:username'). */
export const SshImportIdSchema = z.string().describe("SSH key import ID, e.g. 'gh:username'");

/** A single user entry in the cloud-config users list. */
export const UserSchema = z.object({
  name: z.string().describe("Username"),
  groups: z.array(z.string()).optional().describe("Groups the user belongs to"),
  sudo: z.string().optional().describe("Sudo rule, e.g. 'ALL=(ALL) NOPASSWD:ALL'"),
  lock_passwd: z.boolean().optional().describe("Whether to lock the password"),
  shell: z.string().optional().describe("Login shell path"),
  ssh_import_id: z.array(SshImportIdSchema).optional().describe("SSH key import sources"),
  ssh_authorized_keys: z.array(z.string()).optional().describe("Authorized SSH public keys"),
});

export type User = z.infer<typeof UserSchema>;

/** The cloud-config user-data block (embedded in autoinstall.user-data). */
export const CloudConfigSchema = z.object({
  users: z.array(UserSchema).optional().describe("User accounts to create"),
  write_files: z.array(WriteFileSchema).optional().describe("Files to write"),
  runcmd: z.array(z.string()).optional().describe("Commands to run at first boot"),
});

export type CloudConfig = z.infer<typeof CloudConfigSchema>;

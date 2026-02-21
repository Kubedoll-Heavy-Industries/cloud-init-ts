import { z } from "zod";

/**
 * Zod schemas for curtin storage configuration entries.
 *
 * Reference: https://curtin.readthedocs.io/en/latest/topics/storage.html
 */

/** Match criteria for identifying a disk. */
export const DiskMatchSchema = z.object({
  ssd: z.boolean().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  path: z.string().optional(),
}).describe("Match criteria for disk identification");

/** Physical disk entry. */
export const DiskEntrySchema = z.object({
  type: z.literal("disk"),
  id: z.string(),
  ptable: z.enum(["gpt", "msdos"]).optional(),
  path: z.string().optional(),
  serial: z.string().optional(),
  wipe: z.string().optional(),
  preserve: z.boolean().optional(),
  grub_device: z.boolean().optional(),
  match: DiskMatchSchema.optional(),
});

/** Partition entry. */
export const PartitionEntrySchema = z.object({
  type: z.literal("partition"),
  id: z.string(),
  device: z.string(),
  size: z.string(),
  number: z.number().optional(),
  flag: z.enum(["boot", "bios_grub", "logical", "extended"]).optional(),
  grub_device: z.boolean().optional(),
  wipe: z.string().optional(),
  preserve: z.boolean().optional(),
});

/** Format (filesystem) entry. */
export const FormatEntrySchema = z.object({
  type: z.literal("format"),
  id: z.string(),
  volume: z.string(),
  fstype: z.string(),
  label: z.string().optional(),
  preserve: z.boolean().optional(),
});

/** Mount entry. */
export const MountEntrySchema = z.object({
  type: z.literal("mount"),
  id: z.string(),
  device: z.string(),
  path: z.string(),
});

/** LVM volume group entry. */
export const LvmVolgroupEntrySchema = z.object({
  type: z.literal("lvm_volgroup"),
  id: z.string(),
  name: z.string(),
  devices: z.array(z.string()),
  preserve: z.boolean().optional(),
});

/** LVM logical volume entry. */
export const LvmPartitionEntrySchema = z.object({
  type: z.literal("lvm_partition"),
  id: z.string(),
  name: z.string(),
  volgroup: z.string(),
  size: z.string(),
  wipe: z.string().optional(),
  preserve: z.boolean().optional(),
});

/** ZFS pool property value (string, number, or null). */
const PoolPropertyValue = z.nullable(z.union([z.string(), z.number()]));

/** ZFS pool entry. */
export const ZpoolEntrySchema = z.object({
  type: z.literal("zpool"),
  id: z.string(),
  pool: z.string(),
  vdevs: z.array(z.string()),
  mountpoint: z.string().optional(),
  pool_properties: z.record(z.string(), PoolPropertyValue).optional(),
  fs_properties: z.record(z.string(), z.string()).optional(),
  default_features: z.boolean().optional(),
});

/** ZFS dataset entry. */
export const ZfsEntrySchema = z.object({
  type: z.literal("zfs"),
  id: z.string(),
  pool: z.string(),
  volume: z.string(),
  properties: z.record(z.string(), z.string()).optional(),
});

/** Any storage config entry. */
export const StorageEntrySchema = z.discriminatedUnion("type", [
  DiskEntrySchema,
  PartitionEntrySchema,
  FormatEntrySchema,
  MountEntrySchema,
  LvmVolgroupEntrySchema,
  LvmPartitionEntrySchema,
  ZpoolEntrySchema,
  ZfsEntrySchema,
]);

/** The full storage configuration block. */
export const StorageSchema = z.object({
  swap: z.object({ size: z.number() }).optional(),
  config: z.array(StorageEntrySchema),
});

export type DiskMatch = z.infer<typeof DiskMatchSchema>;
export type DiskEntry = z.infer<typeof DiskEntrySchema>;
export type PartitionEntry = z.infer<typeof PartitionEntrySchema>;
export type FormatEntry = z.infer<typeof FormatEntrySchema>;
export type MountEntry = z.infer<typeof MountEntrySchema>;
export type LvmVolgroupEntry = z.infer<typeof LvmVolgroupEntrySchema>;
export type LvmPartitionEntry = z.infer<typeof LvmPartitionEntrySchema>;
export type ZpoolEntry = z.infer<typeof ZpoolEntrySchema>;
export type ZfsEntry = z.infer<typeof ZfsEntrySchema>;
export type StorageEntry = z.infer<typeof StorageEntrySchema>;
export type Storage = z.infer<typeof StorageSchema>;

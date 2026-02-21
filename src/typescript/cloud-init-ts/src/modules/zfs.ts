import {
  StorageEntry,
  DiskEntry,
  PartitionEntry,
  FormatEntry,
  MountEntry,
  ZpoolEntry,
  ZfsEntry,
} from "../schema";

/**
 * ZFS storage layout module.
 *
 * Generates curtin storage config entries for ZFS-on-root and data pool
 * layouts. Produces the same dataset hierarchy that Ubuntu Desktop's
 * zsys installer creates, but accessible via autoinstall for servers.
 *
 * Reference: https://curtin.readthedocs.io/en/latest/topics/storage.html
 * Reference: https://github.com/ubuntu/zsys-install/blob/master/curtin-zfs.yaml
 */

/** Default pool-level properties for modern ZFS. */
const DEFAULT_POOL_PROPERTIES: Record<string, string | number | null> = {
  ashift: 12,
  autotrim: "on",
};

/** Default filesystem properties applied to all datasets in a pool. */
const DEFAULT_FS_PROPERTIES: Record<string, string> = {
  acltype: "posixacl",
  xattr: "sa",
  compression: "lz4",
  normalization: "formD",
  relatime: "on",
  canmount: "off",
  devices: "off",
};

// ---------------------------------------------------------------------------
// Boot disk helpers
// ---------------------------------------------------------------------------

export interface BootDiskOptions {
  /** Unique ID prefix for generated entries. */
  id: string;
  /** Disk match criteria (model, serial, ssd, or path). */
  match?: DiskEntry["match"];
  /** Explicit device path (e.g. /dev/nvme0n1). Used if match is not set. */
  path?: string;
  /** EFI system partition size. Default: "512M". */
  efiSize?: string;
  /** Boot partition size. Default: "2G". */
  bootSize?: string;
  /** Root partition size. Default: remaining space (-1). */
  rootSize?: string;
}

/**
 * Generate boot disk entries: GPT table, EFI partition, boot partition,
 * and root partition for ZFS. Returns the partition IDs for use with pool
 * creation.
 */
export function bootDisk(options: BootDiskOptions): {
  entries: StorageEntry[];
  efiPartitionId: string;
  bootPartitionId: string;
  rootPartitionId: string;
} {
  const {
    id,
    match,
    path,
    efiSize = "512M",
    bootSize = "2G",
    rootSize = "-1",
  } = options;

  const diskId = `${id}-disk`;
  const efiPartId = `${id}-efi`;
  const bootPartId = `${id}-boot`;
  const rootPartId = `${id}-root`;

  const disk: DiskEntry = {
    type: "disk",
    id: diskId,
    ptable: "gpt",
    wipe: "superblock-recursive",
    preserve: false,
    grub_device: true,
    ...(match ? { match } : {}),
    ...(path ? { path } : {}),
  };

  const efiPartition: PartitionEntry = {
    type: "partition",
    id: efiPartId,
    device: diskId,
    size: efiSize,
    number: 1,
    flag: "boot",
    grub_device: true,
  };

  const efiFormat: FormatEntry = {
    type: "format",
    id: `${id}-efi-fmt`,
    volume: efiPartId,
    fstype: "fat32",
    label: "ESP",
  };

  const efiMount: MountEntry = {
    type: "mount",
    id: `${id}-efi-mnt`,
    device: `${id}-efi-fmt`,
    path: "/boot/efi",
  };

  const bootPartition: PartitionEntry = {
    type: "partition",
    id: bootPartId,
    device: diskId,
    size: bootSize,
    number: 2,
  };

  const bootFormat: FormatEntry = {
    type: "format",
    id: `${id}-boot-fmt`,
    volume: bootPartId,
    fstype: "ext4",
    label: "BOOT",
  };

  const bootMount: MountEntry = {
    type: "mount",
    id: `${id}-boot-mnt`,
    device: `${id}-boot-fmt`,
    path: "/boot",
  };

  const rootPartition: PartitionEntry = {
    type: "partition",
    id: rootPartId,
    device: diskId,
    size: rootSize,
    number: 3,
  };

  return {
    entries: [
      disk,
      efiPartition, efiFormat, efiMount,
      bootPartition, bootFormat, bootMount,
      rootPartition,
    ],
    efiPartitionId: efiPartId,
    bootPartitionId: bootPartId,
    rootPartitionId: rootPartId,
  };
}

// ---------------------------------------------------------------------------
// ZFS root pool
// ---------------------------------------------------------------------------

export interface ZfsRootPoolOptions {
  /** Pool name. Default: "rpool". */
  pool?: string;
  /** ID prefix for generated entries. */
  id: string;
  /** Partition IDs to use as vdevs. */
  vdevs: string[];
  /** Override default pool properties. */
  poolProperties?: Record<string, string | number | null>;
  /** Override default filesystem properties. */
  fsProperties?: Record<string, string>;
  /** System datasets to create under /ROOT/<systemId>/. */
  systemDatasets?: string[];
  /** Persistent datasets to create directly under the pool. */
  persistentDatasets?: string[];
  /** System identifier suffix (for snapshot namespacing). Default: "ubuntu". */
  systemId?: string;
}

/**
 * Generate a ZFS root pool with the standard Ubuntu/zsys dataset hierarchy:
 *
 *   rpool/ROOT                        (container, canmount=off)
 *   rpool/ROOT/<systemId>             (root filesystem, mountpoint=/)
 *   rpool/ROOT/<systemId>/var         (canmount=off)
 *   rpool/ROOT/<systemId>/var/lib     (system state, snapshotted with root)
 *   rpool/ROOT/<systemId>/var/log     (persistent, not snapshotted)
 *   rpool/srv                         (persistent)
 *   rpool/USERDATA                    (container)
 */
export function zfsRootPool(options: ZfsRootPoolOptions): StorageEntry[] {
  const {
    pool = "rpool",
    id,
    vdevs,
    poolProperties,
    fsProperties,
    systemId = "ubuntu",
    systemDatasets = ["/var/lib", "/var/log", "/var/spool"],
    persistentDatasets = ["/srv"],
  } = options;

  const poolId = `${id}-rpool`;
  const entries: StorageEntry[] = [];

  // Pool
  const zpoolEntry: ZpoolEntry = {
    type: "zpool",
    id: poolId,
    pool,
    vdevs,
    mountpoint: "/",
    pool_properties: { ...DEFAULT_POOL_PROPERTIES, ...poolProperties },
    fs_properties: { ...DEFAULT_FS_PROPERTIES, ...fsProperties },
  };
  entries.push(zpoolEntry);

  // /ROOT container
  entries.push(zfsDataset(poolId, pool, "/ROOT", {
    canmount: "off",
    mountpoint: "none",
  }));

  // /ROOT/<systemId> — the root filesystem
  entries.push(zfsDataset(poolId, pool, `/ROOT/${systemId}`, {
    canmount: "noauto",
    mountpoint: "/",
  }));

  // System datasets under /ROOT/<systemId>/
  const emittedContainers = new Set<string>();
  for (const ds of systemDatasets) {
    const parent = ds.split("/").slice(0, -1).join("/");
    // Create intermediate containers if needed (e.g. /var before /var/lib)
    if (parent && !systemDatasets.includes(parent) && !emittedContainers.has(parent)) {
      emittedContainers.add(parent);
      entries.push(zfsDataset(poolId, pool, `/ROOT/${systemId}${parent}`, {
        canmount: "off",
      }));
    }
    entries.push(zfsDataset(poolId, pool, `/ROOT/${systemId}${ds}`, {
      mountpoint: ds,
    }));
  }

  // Persistent datasets (survive snapshots/rollbacks)
  for (const ds of persistentDatasets) {
    entries.push(zfsDataset(poolId, pool, ds, {
      mountpoint: ds,
    }));
  }

  // USERDATA container
  entries.push(zfsDataset(poolId, pool, "/USERDATA", {
    canmount: "off",
    mountpoint: "/",
  }));

  return entries;
}

// ---------------------------------------------------------------------------
// User home datasets
// ---------------------------------------------------------------------------

export interface ZfsUserOptions {
  /** Pool ID (from zfsRootPool). */
  poolId: string;
  /** Pool name. Default: "rpool". */
  pool?: string;
  /** Username. */
  user: string;
}

/**
 * Generate a ZFS dataset for a user's home directory under USERDATA.
 */
export function zfsUserHome(options: ZfsUserOptions): StorageEntry {
  const { poolId, pool = "rpool", user } = options;

  return zfsDataset(poolId, pool, `/USERDATA/${user}`, {
    mountpoint: `/home/${user}`,
    canmount: "on",
  });
}

// ---------------------------------------------------------------------------
// Data pool (non-root, for additional storage)
// ---------------------------------------------------------------------------

export interface ZfsDataPoolOptions {
  /** Pool name. */
  pool: string;
  /** ID prefix for generated entries. */
  id: string;
  /** Disk IDs or partition IDs to use as vdevs. */
  vdevs: string[];
  /** Mount point for the pool. */
  mountpoint: string;
  /** Override default pool properties. */
  poolProperties?: Record<string, string | number | null>;
  /** Override default filesystem properties. */
  fsProperties?: Record<string, string>;
  /** Datasets to create within the pool (relative paths). */
  datasets?: Array<{ volume: string; mountpoint?: string; properties?: Record<string, string> }>;
}

/**
 * Generate a separate ZFS data pool with optional datasets.
 * Use this for additional storage pools (NAS drives, scratch space, etc.).
 */
export function zfsDataPool(options: ZfsDataPoolOptions): StorageEntry[] {
  const {
    pool,
    id,
    vdevs,
    mountpoint,
    poolProperties,
    fsProperties,
    datasets = [],
  } = options;

  const poolId = `${id}-pool`;
  const entries: StorageEntry[] = [];

  const zpoolEntry: ZpoolEntry = {
    type: "zpool",
    id: poolId,
    pool,
    vdevs,
    mountpoint,
    pool_properties: { ...DEFAULT_POOL_PROPERTIES, ...poolProperties },
    fs_properties: {
      ...DEFAULT_FS_PROPERTIES,
      canmount: "on",
      ...fsProperties,
    },
  };
  entries.push(zpoolEntry);

  for (const ds of datasets) {
    entries.push(zfsDataset(poolId, pool, ds.volume, {
      ...(ds.mountpoint ? { mountpoint: ds.mountpoint } : {}),
      ...ds.properties,
    }));
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Raw disk declarations (for data pool vdevs)
// ---------------------------------------------------------------------------

export interface DiskRefOptions {
  id: string;
  path?: string;
  serial?: string;
  match?: DiskEntry["match"];
}

/** Declare a disk for use as a pool vdev. */
export function diskRef(options: DiskRefOptions): DiskEntry {
  const { id, path, serial, match } = options;
  return {
    type: "disk",
    id,
    ...(path ? { path } : {}),
    ...(serial ? { serial } : {}),
    ...(match ? { match } : {}),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function zfsDataset(
  poolId: string,
  poolName: string,
  volume: string,
  properties?: Record<string, string>,
): ZfsEntry {
  const safeName = volume.replace(/\//g, "-").replace(/^-/, "");
  return {
    type: "zfs",
    id: `${poolId}-${safeName}`,
    pool: poolId,
    volume: `${poolName}${volume}`,
    ...(properties ? { properties } : {}),
  };
}

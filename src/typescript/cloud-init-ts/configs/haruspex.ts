import * as fs from "fs";
import * as path from "path";

import {
  AutoinstallBuilder,
  docker,
  nvidia,
  rust,
  homebrew,
  yubikey,
  nix,
  bootDisk,
  zfsRootPool,
  zfsUserHome,
  toYaml,
} from "../src";

/**
 * Haruspex machine configuration.
 *
 * RTX 4070 Ti workstation — the "brain" of the Haruspex AI lab cluster.
 * NVMe boot with ZFS root, optimized for inference workloads.
 *
 * Run with: npx tsx configs/haruspex.ts
 */

// ---------------------------------------------------------------------------
// Storage layout: ZFS-on-root with NVMe
// ---------------------------------------------------------------------------

const boot = bootDisk({
  id: "nvme0",
  match: { ssd: true },
  efiSize: "512M",
  bootSize: "2G",
});

const rootPool = zfsRootPool({
  id: "nvme0",
  pool: "rpool",
  vdevs: [boot.rootPartitionId],
  systemDatasets: ["/var/lib", "/var/log", "/var/spool"],
  persistentDatasets: ["/srv"],
});

const kubedollHome = zfsUserHome({
  poolId: "nvme0-rpool",
  pool: "rpool",
  user: "kubedoll",
});

// ---------------------------------------------------------------------------
// Build config
// ---------------------------------------------------------------------------

const config = new AutoinstallBuilder()
  // Installer settings
  .refreshInstaller(true)
  .locale("en_US.UTF-8")
  .keyboard({ layout: "us" })
  .ssh({ "install-server": true, "allow-pw": false })
  .codecs(true)
  .drivers(true)
  .oem("auto")
  .kernel({ flavor: "hwe" })
  .timezone("geoip")
  .updates("all")

  // Storage
  .swap(0)
  .storage([...boot.entries, ...rootPool, kubedollHome])

  // Base packages
  .packages([
    "build-essential",
    "tmux",
    "git",
    "curl",
    "wget",
    "pkg-config",
    "cmake",
    "openssl",
    "libssl-dev",
    "libclang-dev",
    // System observability
    "nvtop",
    "lm-sensors",
    "smartmontools",
    // Security hardening
    "ufw",
    "fail2ban",
    "unattended-upgrades",
    // Optional: desktop environment (Plasma idles at ~100-150MB VRAM)
    // "kde-plasma-desktop",
  ])

  // User account
  .addUser({
    name: "kubedoll",
    groups: ["users", "docker", "plugdev"],
    sudo: "ALL=(ALL) NOPASSWD:ALL",
    lock_passwd: false,
    shell: "/bin/bash",
    ssh_import_id: ["gh:cagyirey"],
  })

  // Modules (order matters for late-commands execution)
  .addModule(homebrew({
    user: "kubedoll",
    packages: [
      // Core CLI tools
      "ripgrep", "fd", "fzf", "bat", "jq", "yq",
      "eza", "zoxide", "direnv", "btop", "mtr",
      // Dev experience
      "starship", "atuin", "git-delta", "lazygit",
      "yazi", "lazydocker",
      // Node.js toolchain (for monorepo)
      "node", "pnpm",
      // GitHub CLI
      "gh",
      // Secrets management
      "1password-cli",
      // IaC
      "pulumi", "pulumi/tap/esc",
      // Rust build acceleration
      "sccache", "mold",
      // Runtime management
      "mise",
      // System diagnostics
      "bandwhich", "dust", "hyperfine", "tokei",
    ],
  }))
  .addModule(rust({ user: "kubedoll" }))
  .addModule(docker())
  .addModule(nvidia({
    driverVersion: "590",
    cudaVersion: "13-1",
    containerToolkit: true,
  }))
  .addModule(yubikey({ githubUsers: ["cagyirey"] }))
  .addModule(nix({ user: "kubedoll" }))

  .build();

// Serialize to YAML
const yamlOutput = toYaml(config);

// Write to http/haruspex/user-data relative to the package root
const outputDir = path.resolve(__dirname, "..", "http", "haruspex");
const outputPath = path.join(outputDir, "user-data");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, yamlOutput, "utf-8");

console.log(`Written: ${outputPath}`);
console.log(`Size: ${Buffer.byteLength(yamlOutput)} bytes`);

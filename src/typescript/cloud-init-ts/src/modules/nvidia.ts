import { ModuleContribution } from "../builders";
import { WriteFile } from "../schema";

/**
 * NVIDIA module.
 *
 * Installs the NVIDIA driver (pre-built kernel modules, no DKMS) and
 * optionally the CUDA toolkit and NVIDIA Container Toolkit.
 *
 * Blacklists the nova_core/nova Rust GPU driver (kernel 6.19+) which
 * otherwise binds to the GPU before the proprietary driver can load.
 *
 * Supports installing CUDA 13 from NVIDIA's own apt repo (the Ubuntu
 * repo only carries CUDA 12.x). Uses the closest available Ubuntu repo
 * when the current release isn't published yet.
 */

export interface NvidiaModuleOptions {
  /** NVIDIA driver version number, e.g. '590'. */
  driverVersion: string;
  /** Whether to install nvidia-cuda-toolkit (Ubuntu's 12.x). Defaults to false. */
  cudaToolkit?: boolean;
  /**
   * Install CUDA toolkit from NVIDIA's repo (e.g. '13-1' for cuda-toolkit-13-1).
   * Uses the ubuntu2404 repo as a fallback when the current release isn't available.
   */
  cudaVersion?: string;
  /** Whether to install the NVIDIA Container Toolkit. Defaults to true. */
  containerToolkit?: boolean;
  /** Whether to blacklist the nova (Rust) GPU driver. Defaults to true. */
  blacklistNova?: boolean;
}

export function nvidia(options: NvidiaModuleOptions): ModuleContribution {
  const {
    driverVersion,
    cudaToolkit = false,
    cudaVersion,
    containerToolkit = true,
    blacklistNova = true,
  } = options;

  // Use pre-built kernel modules + headless-no-dkms to avoid DKMS/objtool
  // build failures on bleeding-edge kernels (e.g. MITIGATION_RETHUNK on 6.19).
  // The HWE metapackage tracks kernel upgrades so modules stay in sync.
  const packages: string[] = [
    `nvidia-headless-no-dkms-${driverVersion}`,
    `nvidia-utils-${driverVersion}`,
    `linux-modules-nvidia-${driverVersion}-generic-hwe-24.04`,
    `libnvidia-gl-${driverVersion}`,
    `libnvidia-decode-${driverVersion}`,
    `libnvidia-encode-${driverVersion}`,
    `libnvidia-extra-${driverVersion}`,
    `libnvidia-fbc1-${driverVersion}`,
  ];

  if (cudaToolkit) {
    packages.push("nvidia-cuda-toolkit");
  }

  const writeFiles: WriteFile[] = [];

  if (blacklistNova) {
    writeFiles.push({
      path: "/etc/modprobe.d/blacklist-nova.conf",
      content: [
        "# Blacklist the Nova Rust GPU driver (kernel 6.19+) so the",
        "# proprietary NVIDIA driver can bind to the GPU.",
        "blacklist nova_core",
        "blacklist nova",
      ].join("\n"),
      permissions: "0644",
      owner: "root:root",
    });
  }

  const lateCommands: string[] = [];

  // CUDA from NVIDIA's repo (e.g. cuda-toolkit-13-1)
  if (cudaVersion) {
    lateCommands.push(
      // Install CUDA keyring from NVIDIA's ubuntu2404 repo (closest available)
      "curtin in-target -- bash -c 'curl -fsSL https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb -o /tmp/cuda-keyring.deb && dpkg -i /tmp/cuda-keyring.deb && rm /tmp/cuda-keyring.deb'",
      `curtin in-target -- bash -c 'apt-get update && apt-get install -y cuda-toolkit-${cudaVersion}'`,
    );
  }

  if (containerToolkit) {
    lateCommands.push(
      // Add NVIDIA Container Toolkit GPG key
      "curtin in-target -- bash -c 'install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey -o /etc/apt/keyrings/nvidia-container-toolkit.asc && chmod a+r /etc/apt/keyrings/nvidia-container-toolkit.asc'",
      // Add NVIDIA Container Toolkit apt repository
      `curtin in-target -- bash -c 'curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed "s#deb https://#deb [signed-by=/etc/apt/keyrings/nvidia-container-toolkit.asc] https://#g" > /etc/apt/sources.list.d/nvidia-container-toolkit.list'`,
      // Install NVIDIA Container Toolkit and configure Docker runtime
      "curtin in-target -- bash -c 'apt-get update && apt-get install -y nvidia-container-toolkit && nvidia-ctk runtime configure --runtime=docker'",
    );
  }

  return { packages, lateCommands, writeFiles };
}

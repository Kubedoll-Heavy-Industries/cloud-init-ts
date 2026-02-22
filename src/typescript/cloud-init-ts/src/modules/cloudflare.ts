import { ModuleContribution } from "../builders";

/**
 * Cloudflare module.
 *
 * Installs cloudflared from Cloudflare's apt repo. The tunnel itself is
 * managed via the Zero Trust dashboard; `cloudflared service install <token>`
 * must be run after provisioning to connect the machine.
 */
export function cloudflare(): ModuleContribution {
  return {
    packages: [],
    lateCommands: [
      // Add Cloudflare GPG key
      "curtin in-target -- bash -c 'mkdir -p --mode=0755 /usr/share/keyrings && curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg -o /usr/share/keyrings/cloudflare-public-v2.gpg'",
      // Add Cloudflare apt repository
      "curtin in-target -- bash -c 'echo \"deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main\" > /etc/apt/sources.list.d/cloudflared.list'",
      // Install cloudflared
      "curtin in-target -- bash -c 'apt-get update && apt-get install -y cloudflared'",
    ],
  };
}

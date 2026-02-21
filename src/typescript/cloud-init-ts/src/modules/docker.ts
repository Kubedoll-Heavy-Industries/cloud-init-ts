import { ModuleContribution } from "../builders";

/**
 * Docker module.
 *
 * Installs Docker from Ubuntu's own docker.io package (docker-ce is not
 * always available for bleeding-edge Ubuntu releases). Adds the Docker
 * apt repo for buildx and compose plugins which *are* published early.
 */
export function docker(): ModuleContribution {
  return {
    packages: ["docker.io"],
    lateCommands: [
      // Add Docker GPG key
      "curtin in-target -- bash -c 'install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc && chmod a+r /etc/apt/keyrings/docker.asc'",
      // Add Docker apt repository (for buildx/compose plugins)
      'curtin in-target -- bash -c \'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list\'',
      // Install buildx and compose plugins from Docker's repo
      "curtin in-target -- bash -c 'apt-get update && apt-get install -y docker-buildx-plugin docker-compose-plugin'",
    ],
  };
}

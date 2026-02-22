import { ModuleContribution } from "../builders";

/**
 * YubiKey / SSH agent auth module.
 *
 * Sets up YubiKey FIDO2 udev rules for remote/SSH sessions and configures
 * pam_ssh_agent_auth for sudo authentication via forwarded SSH agent.
 * Populates /etc/security/authorized_keys from GitHub public keys.
 */
export interface YubikeyModuleOptions {
  /** GitHub usernames whose public keys are authorized for sudo via SSH agent. */
  githubUsers: string[];
}

export function yubikey(options: YubikeyModuleOptions): ModuleContribution {
  const { githubUsers } = options;

  // Fetch public keys from GitHub and write to /etc/security/authorized_keys
  const fetchKeysCmd = githubUsers
    .map((user) => `curl -fsSL https://github.com/${user}.keys`)
    .join("; ");

  return {
    packages: [
      "libpam-ssh-agent-auth",
      "fido2-tools",
    ],
    lateCommands: [
      // Populate /etc/security/authorized_keys from GitHub
      `curtin in-target -- bash -c '(${fetchKeysCmd}) > /etc/security/authorized_keys && chmod 644 /etc/security/authorized_keys'`,
      // Insert pam_ssh_agent_auth into /etc/pam.d/sudo (must modify existing file)
      'curtin in-target -- bash -c \'sed -i "1a auth sufficient pam_ssh_agent_auth.so file=/etc/security/authorized_keys" /etc/pam.d/sudo\'',
    ],
    writeFiles: [
      {
        path: "/etc/udev/rules.d/70-u2f.rules",
        content: 'KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1050", TAG+="uaccess", MODE="0660", GROUP="plugdev"',
        permissions: "0644",
        owner: "root:root",
      },
      {
        path: "/etc/sudoers.d/ssh-agent-forwarding",
        content: 'Defaults:%sudo env_keep += "SSH_AGENT_PID SSH_AUTH_SOCK"',
        permissions: "0440",
        owner: "root:root",
      },
    ],
  };
}

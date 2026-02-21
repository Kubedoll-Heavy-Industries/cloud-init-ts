import * as yaml from "js-yaml";
import { AutoinstallDocument } from "../schema";

/**
 * Serialize an autoinstall document to cloud-init YAML format.
 *
 * The output is prefixed with `#cloud-config` as required by cloud-init,
 * and uses block style for readability.
 */
export function toYaml(document: AutoinstallDocument): string {
  const yamlStr = yaml.dump(document, {
    lineWidth: -1,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false,
  });

  return `#cloud-config\n\n${yamlStr}`;
}

import { spawnSync } from "child_process";

import constants from "./constants";

class GetDependencies {
  buildPath: string;

  constructor({ buildPath }: { buildPath: string }) {
    this.buildPath = buildPath;
  }

  get() {
    return spawnSync(
      "swift",
      ["package", "--build-path", this.buildPath, "update"],
      constants.spawnSyncOptions
    );
  }
}

export default GetDependencies;

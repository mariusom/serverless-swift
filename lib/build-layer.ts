import { readdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

import constants from "./constants";

export type ConstructorParams = {
  servicePath: string;
  outputFolder: string;
  layerFolder: string;
  dockerTag: string;
};

class BuildLayer {
  servicePath: string;
  outputFolder: string;
  layerFolder: string;
  dockerTag: string;

  constructor(params: ConstructorParams) {
    const { servicePath, outputFolder, layerFolder, dockerTag } = params;

    this.servicePath = servicePath;
    this.outputFolder = outputFolder;
    this.layerFolder = layerFolder;
    this.dockerTag = dockerTag;
  }

  getBuildPath() {
    return join(this.outputFolder, this.layerFolder);
  }

  getLayer() {
    const output = {};
    const buildPath = this.getBuildPath();
    const files = readdirSync(buildPath, "utf8");

    for (const file of files) {
      if (file.endsWith(".zip")) {
        const filePath = join(buildPath, file);
        const handler = file.replace(".zip", "");

        output[handler] = filePath;
      }
    }

    return output;
  }

  runDocker(funcArgs) {
    const defaultArgs = [
      "run",
      "--rm",
      "-t",
      "-e",
      `ARTIFACT_FOLDER=${this.outputFolder}`,
      "-e",
      `ARTIFACT_LAYER_FOLDER=${this.layerFolder}`,
      "-v",
      `${this.servicePath}:/src`
    ];

    const dockerTag = (funcArgs || {}).dockerTag || this.dockerTag;
    return spawnSync(
      "docker",
      [...defaultArgs, `mariusomdev/lambda-swift:${dockerTag}`, `layer`],
      constants.outputCapture
    );
  }
}

export default BuildLayer;

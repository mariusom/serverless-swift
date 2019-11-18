import { readdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

import constants from "./constants";

export type ConstructorParams = {
  servicePath: string;
  outputFolder: string;
  lambdaFolder: string;
  dockerTag: string;
};

class BuildArtifacts {
  servicePath: string;
  outputFolder: string;
  lambdaFolder: string;
  dockerTag: string;

  constructor({
    servicePath,
    outputFolder,
    lambdaFolder,
    dockerTag
  }: ConstructorParams) {
    this.servicePath = servicePath;
    this.outputFolder = outputFolder;
    this.lambdaFolder = lambdaFolder;
    this.dockerTag = dockerTag;
  }

  getBuildPath() {
    return join(this.servicePath, this.outputFolder, this.lambdaFolder);
  }

  getArtifacts() {
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
      `ARTIFACT_LAMBDA_FOLDER=${this.lambdaFolder}`,
      "-v",
      `${this.servicePath}:/src`
    ];

    const dockerTag = (funcArgs || {}).dockerTag || this.dockerTag;
    return spawnSync(
      "docker",
      [...defaultArgs, `mariusomdev/lambda-swift:${dockerTag}`, `build`],
      constants.outputCapture
    );
  }
}

export default BuildArtifacts;

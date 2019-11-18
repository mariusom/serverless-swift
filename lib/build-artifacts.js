const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const constants = require("./constants");

class BuildArtifacts {
  constructor(outputFolder, lambdaFolder) {
    this.outputFolder = outputFolder;
    this.lambdaFolder = lambdaFolder;
  }

  getBuildPath() {
    const currentPath = process.cwd();

    return path.join(currentPath, this.outputFolder, this.lambdaFolder);
  }

  getArtifacts() {
    const output = {};
    const buildPath = getBuildPath();
    const files = fs.readdirSync(buildPath, "utf8");

    for (const file of files) {
      if (file.endsWith(".zip")) {
        const filePath = path.join(buildPath, file);
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

    const dockerTag = (funcArgs || {}).dockerTag || this.custom.dockerTag;
    return spawnSync(
      "docker",
      [...defaultArgs, `mariusomdev/lambda-swift:${dockerTag}`, `build`],
      constants.output_capture
    );
  }
}

module.exports = BuildArtifacts;

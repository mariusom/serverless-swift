const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const constants = require("./constants");

class BuildLayer {
  constructor(outputFolder, layerFolder) {
    this.outputFolder = outputFolder;
    this.layerFolder = layerFolder;
  }

  getBuildPath() {
    const currentPath = process.cwd();

    return path.join(currentPath, this.outputFolder, this.layerFolder);
  }

  getLayer() {
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
      `ARTIFACT_LAYER_FOLDER=${this.layerFolder}`,
      "-v",
      `${this.servicePath}:/src`
    ];

    const dockerTag = (funcArgs || {}).dockerTag || this.custom.dockerTag;
    return spawnSync(
      "docker",
      [...defaultArgs, `mariusomdev/lambda-swift:${dockerTag}`, `layer`],
      constants.output_capture
    );
  }
}

module.exports = BuildLayer;

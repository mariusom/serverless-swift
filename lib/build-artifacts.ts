import { readdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

import constants from "./constants";

export type ConstructorParams = {
  servicePath: string;
  outputFolder: string;
  lambdaFolder: string;
  dockerTag: string;
  forwardSshKeys?: boolean;
  forwardSshAgent?: boolean;
};

class BuildArtifacts {
  servicePath: string;
  outputFolder: string;
  lambdaFolder: string;
  dockerTag: string;
  forwardSshKeys: boolean;
  forwardSshAgent: boolean;

  constructor({
    servicePath,
    outputFolder,
    lambdaFolder,
    dockerTag,
    forwardSshKeys = false,
    forwardSshAgent = false
  }: ConstructorParams) {
    this.servicePath = servicePath;
    this.outputFolder = outputFolder;
    this.lambdaFolder = lambdaFolder;
    this.dockerTag = dockerTag;
    this.forwardSshKeys = forwardSshKeys;
    this.forwardSshAgent = forwardSshAgent;
  }

  getBuildPath() {
    return join(this.outputFolder, this.lambdaFolder);
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
    let additionalArgs = [];

    if (this.forwardSshKeys) {
      additionalArgs = [
        ...additionalArgs,
        "-v",
        `${process.env.HOME}/.ssh:/root/.ssh`
      ];
    }

    if (this.forwardSshAgent) {
      additionalArgs = [
        ...additionalArgs,
        "-v",
        "/run/host-services/ssh-auth.sock:/run/host-services/ssh-auth.sock",
        "-e",
        `SSH_AUTH_SOCK="/run/host-services/ssh-auth.sock"`
      ];
    }
    const dockerTag = (funcArgs || {}).dockerTag || this.dockerTag;

    return spawnSync(
      "docker",
      [
        ...defaultArgs,
        ...additionalArgs,
        `mariusomdev/lambda-swift:${dockerTag}`,
        "/bin/bash",
        "-c",
        "build_swift.sh"
      ],
      constants.spawnSyncOptions
    );
  }
}

export default BuildArtifacts;

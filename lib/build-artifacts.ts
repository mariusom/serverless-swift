import { spawnSync } from "child_process";

import constants from "./constants";

export type ConstructorParams = {
  servicePath: string;
  dockerTag: string;
};

class BuildArtifacts {
  servicePath: string;
  dockerTag: string;

  constructor({ servicePath, dockerTag }: ConstructorParams) {
    this.servicePath = servicePath;
    this.dockerTag = dockerTag;
  }

  runSwiftBuild(funcArgs) {
    const defaultArgs = [
      "run",
      "--rm",
      "-t",
      "-v",
      `${this.servicePath}:/src`,
      "-w",
      "/src"
    ];

    const dockerTag = (funcArgs || {}).dockerTag || this.dockerTag;

    return spawnSync(
      "docker",
      [
        ...defaultArgs,
        `mariusomdev/aws-lambda-swift:${dockerTag}`,
        "swift",
        "build",
        "--configuration",
        "release"
      ],
      constants.spawnSyncOptions
    );
  }

  runZipCreation(funcArgs: { dockerTag?: string; folderName: string }) {
    const { folderName } = funcArgs;

    const defaultArgs = [
      "run",
      "--rm",
      "-t",
      "-v",
      `${this.servicePath}:/src`,
      "-w",
      `/src/.serverless/.serverless-swift/${folderName}/`
    ];

    const dockerTag = (funcArgs || {}).dockerTag || this.dockerTag;

    return spawnSync(
      "docker",
      [
        ...defaultArgs,
        `mariusomdev/aws-lambda-swift:${dockerTag}`,
        "zip",
        "-r",
        "lambda.zip",
        ".",
        "-x",
        `".DS_Store"`
      ],
      constants.spawnSyncOptions
    );
  }
}

export default BuildArtifacts;

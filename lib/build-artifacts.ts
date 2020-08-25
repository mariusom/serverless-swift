import { spawnSync } from "child_process";

import { SwiftOptions } from "./types";

import { spawnSyncOptions, DOCKER_TAG } from "./constants";
import { dockerImage } from "./utils";

export type ConstructorParams = {
  servicePath: string;
  dockerTag: string;
  forwardSshKeys: boolean;
  swiftBuildFolder: string;
  serverlessSwiftBuildFolder: string;
};

class BuildArtifacts {
  servicePath: string;
  dockerTag: string;
  swiftBuildFolder: string;
  serverlessSwiftBuildFolder: string;
  forwardSshKeys: boolean;

  constructor({
    servicePath,
    dockerTag,
    swiftBuildFolder,
    serverlessSwiftBuildFolder,
    forwardSshKeys = false,
  }: ConstructorParams) {
    this.servicePath = servicePath;
    this.dockerTag = dockerTag;
    this.swiftBuildFolder = swiftBuildFolder;
    this.serverlessSwiftBuildFolder = serverlessSwiftBuildFolder;
    this.forwardSshKeys = forwardSshKeys;
  }

  getDockerTag(funcArgs: SwiftOptions): string {
    return (funcArgs || {}).dockerTag || this.dockerTag || DOCKER_TAG;
  }

  getDockerImage(funcArgs: SwiftOptions): string {
    return dockerImage(this.getDockerTag(funcArgs));
  }

  getDefaultArgs(): string[] {
    return ["run", "--rm", "-t", "-v", `${this.servicePath}:/src`];
  }

  runSwiftBuild(funcArgs: SwiftOptions) {
    const defaultArgs = [...this.getDefaultArgs(), "-w", "/src"];

    let additionalArgs: string[] = [];

    if (this.forwardSshKeys) {
      additionalArgs = [
        ...additionalArgs,
        "-v",
        `${process.env.HOME}/.ssh:/root/.ssh:ro`,
      ];
    }

    return spawnSync(
      "docker",
      [
        ...defaultArgs,
        ...additionalArgs,
        this.getDockerImage(funcArgs),
        "swift",
        "build",
        "--configuration",
        "release",
        "-Xswiftc",
        "-g",
        "-Xswiftc",
        "-cross-module-optimization",
        "--build-path",
        `.build/${this.swiftBuildFolder}`,
      ],
      spawnSyncOptions
    );
  }

  runZipCreation(
    funcArgs: SwiftOptions & {
      folderName: string;
    }
  ) {
    const { folderName } = funcArgs;
    const defaultArgs = [
      ...this.getDefaultArgs(),
      "-w",
      `/src/.serverless/${this.serverlessSwiftBuildFolder}/${folderName}/`,
    ];

    return spawnSync(
      "docker",
      [
        ...defaultArgs,
        this.getDockerImage(funcArgs),
        "zip",
        "-r",
        "lambda.zip",
        ".",
        "-x",
        `"*.DS_Store"`,
      ],
      spawnSyncOptions
    );
  }
}

export default BuildArtifacts;

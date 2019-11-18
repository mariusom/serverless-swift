const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DEFAULT_DOCKER_TAG = "0.0.5-swift-5.1.2";
const SWIFT_RUNTIME = "swift";
const BASE_RUNTIME = "provided";
const NO_OUTPUT_CAPTURE = { stdio: ["ignore", process.stdout, process.stderr] };

const ARTIFACTS_OUTPUT_FOLDER = ".serverless-swift";
const ARTIFACTS_LAMBDA_OUTPUT_FOLDER = "lambda";
const ARTIFACTS_LAYER_OUTPUT_FOLDER = "layer";

class SwiftPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.servicePath = this.serverless.config.servicePath || "";
    this.options = options;
    this.hooks = {
      "before:package:createDeploymentArtifacts": this.build.bind(this)
    };
    this.custom = Object.assign(
      { dockerTag: DEFAULT_DOCKER_TAG },
      (this.serverless.service.custom &&
        this.serverless.service.custom.swift) ||
        {}
    );
  }

  getArtifacts() {
    const output = {};
    const currentPath = process.cwd();
    const buildPath = path.join(
      currentPath,
      ARTIFACTS_OUTPUT_FOLDER,
      BUILD_CONFIGURATION
    );

    const files = fs.readdirSync(buildPath, "utf8");

    // Change to look for zips

    for (const file of files) {
      const filePath = path.join(buildPath, file);
      output[file] = filePath;
    }

    return output;
  }

  runDocker(funcArgs) {
    const defaultArgs = [
      "run",
      "--rm",
      "-t",
      "-e",
      `ARTIFACT_FOLDER=${ARTIFACTS_OUTPUT_FOLDER}`,
      "-e",
      `ARTIFACT_LAMBDA_FOLDER=${ARTIFACTS_LAMBDA_OUTPUT_FOLDER}`,
      "-e",
      `ARTIFACT_LAYER_FOLDER=${ARTIFACTS_LAYER_OUTPUT_FOLDER}`,
      "-v",
      `${this.servicePath}:/src`
    ];

    const dockerTag = (funcArgs || {}).dockerTag || this.custom.dockerTag;
    return spawnSync(
      "docker",
      [...defaultArgs, `mariusomdev/lambda-swift:${dockerTag}`, `build`],
      NO_OUTPUT_CAPTURE
    );
  }

  // Usefull when deploying a specific function
  functions() {
    if (this.options.function) {
      return [this.options.function];
    } else {
      return this.serverless.service.getAllFunctions();
    }
  }

  build() {
    const service = this.serverless.service;

    if (service.provider.name != "aws") {
      return;
    }

    let swiftFunctionFound = false;

    this.functions().forEach(funcName => {
      const func = service.getFunction(funcName);
      const runtime = func.runtime || service.provider.runtime;

      // Skip function which don't apply to swift
      if (runtime != SWIFT_RUNTIME) {
        return;
      }

      swiftFunctionFound = true;

      // Compile here using docker
      this.serverless.cli.log(`Building native swift ${func.handler} func...`);
      const res = this.runDocker(func.swift);
      if (res.error || res.status > 0) {
        this.serverless.cli.log(
          `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
        );
        throw new Error(res.error);
      }

      const artifacts = this.getArtifacts();
      const artifactFilenames = Object.keys(executables).map(
        f => f.split(".")[0]
      );

      this.serverless.cli.log(`Found handlers: ${artifactFilenames}`);

      if (!executableFilenames.includes(func.handler)) {
        throw new Error(`${func.handler} not found in: ${artifactFilenames}.`);
      }

      func.package = func.package || {};
      func.package.artifact = artifacts[func.handler];

      // Ensure the runtime is set to a sane value for other plugins
      if (func.runtime == SWIFT_RUNTIME) {
        func.runtime = BASE_RUNTIME;
      }
    });

    if (service.provider.runtime == SWIFT_RUNTIME) {
      service.provider.runtime = BASE_RUNTIME;
    }

    if (!swiftFunctionFound) {
      throw new Error(
        `Error: no Swift functions found. Use 'runtime ${SWIFT_RUNTIME}' in global or function configuration to use this plugin.`
      );
    }
  }
}

module.exports = SwiftPlugin;

const BuildArtifacts = require("lib/build-artifacts");
const BuildLayer = require("lib/build-layer");

const DEFAULT_DOCKER_TAG = "0.0.5-swift-5.1.2";
const SWIFT_RUNTIME = "swift";
const BASE_RUNTIME = "provided";

const ARTIFACTS_OUTPUT_FOLDER = ".serverless-swift";
const ARTIFACTS_LAMBDA_OUTPUT_FOLDER = "lambda";
const ARTIFACTS_LAYER_OUTPUT_FOLDER = "layer";

class SwiftPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.servicePath = this.serverless.config.servicePath || "";
    this.options = options;
    this.hooks = {
      "before:package:createDeploymentArtifacts": this.buildArtifacts.bind(
        this
      ),
      "before:package:compileLayers": this.buildLayer.bind(this)
    };

    this.custom = Object.assign(
      { dockerTag: DEFAULT_DOCKER_TAG },
      (this.serverless.service.custom &&
        this.serverless.service.custom.swift) ||
        {}
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

  buildArtifacts() {
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

      // Compile swift code using docker
      this.serverless.cli.log(`Building native swift ${func.handler} func...`);
      const artifactBuilder = new BuildArtifacts(
        ARTIFACTS_OUTPUT_FOLDER,
        ARTIFACTS_LAMBDA_OUTPUT_FOLDER
      );

      const res = artifactBuilder.runDocker(func.swift);
      if (res.error || res.status > 0) {
        this.serverless.cli.log(
          `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
        );
        throw new Error(res.error);
      }

      const artifacts = artifactBuilder.getArtifacts();
      const foundHandlers = Object.keys(artifacts);
      this.serverless.cli.log(`Found handlers: ${foundHandlers}`);

      func.package = func.package || {};

      try {
        func.package.artifact = artifacts[func.handler];
      } catch {
        throw new Error(`${func.handler} not found in: ${foundHandlers}.`);
      }

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

  buildLayer() {
    const service = this.serverless.service;

    if (service.provider.name != "aws") {
      return;
    }

    const layerBuilder = new BuildLayer(
      ARTIFACTS_OUTPUT_FOLDER,
      ARTIFACTS_LAYER_OUTPUT_FOLDER
    );

    // Generate layer using docker
    this.serverless.cli.log(`Building swift layer...`);
    const res = layerBuilder.runDocker(func.swift);
    if (res.error || res.status > 0) {
      this.serverless.cli.log(
        `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
      );
      throw new Error(res.error);
    }

    const layer = layerBuilder.getLayer();

    console.log(layer);
  }
}

module.exports = SwiftPlugin;

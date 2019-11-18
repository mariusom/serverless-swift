import Serverless from "serverless";
import Plugin from "serverless/classes/Plugin";

import BuildArtifacts from "./build-artifacts";
import BuildLayer from "./build-layer";

const DEFAULT_DOCKER_TAG = "0.0.6-swift-5.1.2";
const SWIFT_RUNTIME = "swift";
const BASE_RUNTIME = "provided";

const ARTIFACTS_OUTPUT_FOLDER = ".serverless-swift";
const ARTIFACTS_LAMBDA_OUTPUT_FOLDER = "lambda";
const ARTIFACTS_LAYER_OUTPUT_FOLDER = "layer";

type SwiftFunctionDefinition = Serverless.FunctionDefinition & {
  layers?: any[];
  swift?: {
    [key: string]: string;
  };
};

type Layer = {
  name?: string;
  description?: string;
  licenseInfo?: string;
  compatibleRuntimes?: string;
  retain?: boolean;
  allowedAccounts?: string[];
  package?: {
    artifact?: string;
  };
};

type ServerlessExtended = Serverless & {
  service: {
    layers?: { [key: string]: Layer };
    getLayers?: (arg0: string) => Layer;
    getAllLayers?: () => Layer[];
    provider?: {
      naming?: {
        getLambdaLayerLogicalId?: (arg0: string) => string;
      };
    };
  };
};

class SwiftPlugin {
  serverless: ServerlessExtended;
  servicePath: string;
  options: Serverless.Options;
  hooks: Plugin.Hooks;
  custom: {
    dockerTag: string;
    layer: { build: boolean; options?: { [key: string]: string } };
  } & {
    [key: string]: string;
  };
  swiftFunctions: string[];

  constructor(serverless: Serverless, options: Serverless.Options) {
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
      { dockerTag: DEFAULT_DOCKER_TAG, layer: { build: false } },
      (this.serverless.service.custom &&
        this.serverless.service.custom.swift) ||
        {}
    );

    let foundFunctions: string[];

    if (options.function) {
      foundFunctions = [options.function];
    } else {
      foundFunctions = this.serverless.service.getAllFunctions();
    }

    this.swiftFunctions = foundFunctions.filter((funcName: string) => {
      const func = this.serverless.service.getFunction(funcName);
      const runtime = func.runtime || this.serverless.service.provider.runtime;

      return runtime == SWIFT_RUNTIME;
    });
  }

  buildArtifacts() {
    const { service } = this.serverless;
    const { provider } = service;

    if (provider.name != "aws") {
      return;
    }

    // Skip function which don't use to swift
    if (this.swiftFunctions.length === 0) {
      throw new Error(
        `Error: no Swift functions found. Use 'runtime ${SWIFT_RUNTIME}' in global or function configuration to use this plugin.`
      );
    }

    for (const funcName of this.swiftFunctions) {
      const func: SwiftFunctionDefinition = service.getFunction(funcName);

      // Compile swift code using docker
      this.serverless.cli.log(`Building native swift ${func.handler} func...`);
      const artifactBuilder = new BuildArtifacts({
        servicePath: this.servicePath,
        outputFolder: ARTIFACTS_OUTPUT_FOLDER,
        lambdaFolder: ARTIFACTS_LAMBDA_OUTPUT_FOLDER,
        dockerTag: this.custom.dockerTag
      });

      const res = artifactBuilder.runDocker(func.swift);
      if (res.error || res.status > 0) {
        this.serverless.cli.log(
          `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
        );
        throw new Error(res.error.message);
      }

      const artifacts = artifactBuilder.getArtifacts();
      const foundHandlers = Object.keys(artifacts);

      const funcHandler = func.handler.split(".")[0];

      if (foundHandlers.includes(funcHandler)) {
        this.serverless.cli.log(`Found handlers: ${foundHandlers}`);
      } else {
        throw new Error(
          `Provided function handler "${funcHandler}" for "${func.name}" not found in: ${foundHandlers}`
        );
      }

      func.package = func.package || { include: [], exclude: [] };
      func.package.artifact = artifacts[funcHandler];

      // Ensure the function runtime is set to a sane value for other plugins
      if (func.runtime == SWIFT_RUNTIME) {
        func.runtime = BASE_RUNTIME;
      }
    }

    // Ensure the provider runtime is set to a sane value for other plugins
    if (provider.runtime == SWIFT_RUNTIME) {
      provider.runtime = BASE_RUNTIME;
    }
  }

  buildLayer() {
    const { service } = this.serverless;
    const { provider } = service;

    if (provider.name != "aws") {
      return;
    }

    const layerBuilder = new BuildLayer({
      servicePath: this.servicePath,
      outputFolder: ARTIFACTS_OUTPUT_FOLDER,
      layerFolder: ARTIFACTS_LAYER_OUTPUT_FOLDER,
      dockerTag: this.custom.dockerTag
    });

    // Generate layer using docker
    this.serverless.cli.log(`Building swift layer...`);
    const res = layerBuilder.runDocker(this.custom.layer.options);
    if (res.error || res.status > 0) {
      this.serverless.cli.log(
        `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
      );
      throw new Error(res.error.message);
    }

    const layer = layerBuilder.getLayer();

    const name = `${provider.stage}${service.getServiceName()}`;

    const layerObject: Layer = {
      name: name,
      description: `Layer for swift runtime with required libraries`,
      package: {
        artifact: layer["layer"]
      }
    };

    const layerName = "serverless-Swift";
    service.layers = service.layers || {};
    service.layers[layerName] = layerObject;

    // Attach runtime layer to swift functions
    const swiftFunctions = this.swiftFunctions;
    if (swiftFunctions.length === 0) {
      throw new Error(
        `Error: no Swift functions found. Use 'runtime ${SWIFT_RUNTIME}' in global or function configuration to use this plugin.`
      );
    }

    for (const funcName of swiftFunctions) {
      const func: SwiftFunctionDefinition = service.getFunction(funcName);

      func.layers = func.layers || [];
      func.layers.push({
        Ref: "ServerlessDashSwiftLambdaLayer"
      });
    }
  }
}

module.exports = SwiftPlugin;

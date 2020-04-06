import { join } from "path";
import { ensureDirSync, copySync } from "fs-extra";
import Serverless from "serverless";
import Plugin from "serverless/classes/Plugin";

import BuildArtifacts from "./build-artifacts";
import GetDependencies from "./get-dependencies";

import constants from "./constants";

const DEFAULT_DOCKER_TAG = "0.2.1-swift-5.2";
const SWIFT_RUNTIME = "swift";
const BASE_RUNTIME = "provided";

const layerArn = (region: string) =>
  `arn:aws:lambda:${region}:635835178146:layer:swift:3`;

const DOCKER_BUILD_FOLDER = ".build";

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
    layer: { options?: { [key: string]: string } };
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
      "before:package:compileLayers": this.attachSwiftLayer.bind(this),
      "before:deploy:function:packageFunction": this.buildArtifacts.bind(this),
    };

    this.custom = Object.assign(
      {
        dockerTag: DEFAULT_DOCKER_TAG,
        layer: {},
      },
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

  async buildArtifacts() {
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

      // Retriving swift packages
      this.serverless.cli.log(
        `Downloading swift packages for ${func.handler} func...`
      );
      const dependenciesDownloader = new GetDependencies({
        buildPath: DOCKER_BUILD_FOLDER,
      });

      const resDownloader = dependenciesDownloader.get();
      if (resDownloader.error || resDownloader.status > 0) {
        this.serverless.cli.log(
          `Downloading swift packages: ${resDownloader.error} ${resDownloader.status}.`
        );
        throw new Error(resDownloader.error.message);
      }

      // Compile swift code using docker
      this.serverless.cli.log(`Building native swift ${func.handler} func...`);
      const artifactBuilder = new BuildArtifacts({
        servicePath: this.servicePath,
        dockerTag: this.custom.dockerTag,
        forwardSshKeys: Boolean(this.custom.forwardSshKeys),
      });

      const res = artifactBuilder.runSwiftBuild(func.swift);
      if (res.error || res.status > 0) {
        this.serverless.cli.log(
          `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
        );
        throw new Error(res.error.message);
      }

      /**
       * Using the func handler value to keep track of the executable file that needs
       * to be included in the archive.
       *
       * Also need to rename func handler to bootstrap and put back the remaining segments
       * after the rename.
       */
      const funcHandlerSegments = func.handler.split(".");
      const funcHandler = funcHandlerSegments[0];

      let changedFuncHandler = "boostrap";

      if (funcHandlerSegments.length > 1) {
        let remainingSegments = funcHandlerSegments.splice(0, 1);
        changedFuncHandler = `boostrap.${remainingSegments.join(".")}`;
      }

      func.handler = changedFuncHandler;

      // Generate archive
      const pluginDir = join(".serverless", ".serverless-swift");
      const dir = join(pluginDir, func.name);

      ensureDirSync(dir);
      copySync(join(".build", "release", funcHandler), join(dir, "bootstrap"));

      func.package = func.package || { include: [], exclude: [] };
      func.package.individually = true;

      if (func.package.include.length > 0) {
        func.package.include.forEach((path) => {
          copySync(path, join(dir, path));
        });
      }

      artifactBuilder.runZipCreation({ folderName: func.name });
      func.package.artifact = join(dir, `lambda.zip`);

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

  attachSwiftLayer() {
    const { service } = this.serverless;
    const { provider } = service;

    if (provider.name != "aws") {
      return;
    }

    const { layerSupportedRegions } = constants;

    if (!layerSupportedRegions.includes(provider.region)) {
      throw new Error(
        `Error: there is no swift lamba layer available for the region: ${provider.region}.`
      );
    }

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

      if (func.layers.length >= 5) {
        throw new Error(
          `Error: cannot attach the swift layer because the maximum number of layers has been reached.`
        );
      }

      func.layers.push(layerArn(provider.region));
    }
  }
}

module.exports = SwiftPlugin;

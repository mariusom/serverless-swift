import * as fs from "fs";
import { join } from "path";

import Serverless from "serverless";
import Plugin from "serverless/classes/Plugin";

import BuildArtifacts from "./build-artifacts";
import constants from "./constants";
import { ServerlessExtended, SwiftFunctionDefinition } from "./types";

const DEFAULT_DOCKER_TAG = "1.0.1-swift-5.3-dev";
const SWIFT_RUNTIME = "swift";
const BASE_RUNTIME = "provided";

const layerArn = (region: string) =>
  `arn:aws:lambda:${region}:635835178146:layer:swift:4`;

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

      // Compile swift code using docker
      this.serverless.cli.log(`Building native swift ${func.handler} func...`);
      const artifactBuilder = new BuildArtifacts({
        servicePath: this.servicePath,
        dockerTag: this.custom.dockerTag,
        forwardSshKeys: Boolean(this.custom.forwardSshKeys),
      });

      const res = artifactBuilder.runSwiftBuild(func.swift);

      if (res.error) {
        this.serverless.cli.log(
          `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
        );

        throw new Error(res.error.message);
      }
      if (res.status !== null && res.status > 0) {
        this.serverless.cli.log(
          `Dockerized swift build encountered an error: ${res.error} ${res.status}.`
        );

        throw new Error(`Docker run failed with status: ${res.status}`);
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
      const dir = join(".", ".serverless", ".serverless-swift", func.name);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const from = join(".build", "release", funcHandler);
      const to = join(dir, "bootstrap");
      fs.copyFileSync(from, to);

      func.package = func.package || { include: [], exclude: [] };
      func.package.individually = true;

      if (func.package.include.length > 0) {
        func.package.include.forEach((path) => {
          const from = path;
          const to = join(dir, path);
          fs.copyFileSync(from, to);
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

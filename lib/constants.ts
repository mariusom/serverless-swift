import { SpawnSyncOptions } from "child_process";

const DOCKER_USERNAME = "mariusomdev";

const DOCKER_REPO =  "aws-lambda-swift";

const DOCKER_TAG = "swift-5.2.5";

const SWIFT_RUNTIME = "swift";

const BASE_RUNTIME = "provided";

const AWS_ACCOUNT_ID = "635835178146";

const LAMBDA_LAYER_VERSION = "6";

const LAYER_SUPPORTED_REGIONS = [
  "us-east-2",
  "us-east-1",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "sa-east-1",
];

const spawnSyncOptions: SpawnSyncOptions = {
  stdio: ["ignore", process.stdout, process.stderr],
  shell: true,
};

export {
  DOCKER_USERNAME,
  DOCKER_REPO,
  DOCKER_TAG,
  spawnSyncOptions,
  LAYER_SUPPORTED_REGIONS,
  SWIFT_RUNTIME,
  BASE_RUNTIME,
  AWS_ACCOUNT_ID,
  LAMBDA_LAYER_VERSION,
};

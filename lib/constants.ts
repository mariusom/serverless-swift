import { SpawnSyncOptions } from "child_process";

const spawnSyncOptions: SpawnSyncOptions = {
  stdio: ["ignore", process.stdout, process.stderr],
  shell: true
};

const layerSupportedRegions = [
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
  "sa-east-1"
];

const constants = {
  spawnSyncOptions: spawnSyncOptions,
  layerSupportedRegions: layerSupportedRegions
};

export default constants;

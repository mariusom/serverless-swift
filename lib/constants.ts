import { SpawnSyncOptions } from "child_process";

const spawnSyncOptions: SpawnSyncOptions = {
  stdio: [process.stdin, process.stdout, process.stderr],
  shell: true
};

const constants = {
  spawnSyncOptions: spawnSyncOptions
};

export default constants;

import { SpawnSyncOptions } from "child_process";

const NO_OUTPUT_CAPTURE: SpawnSyncOptions = {
  stdio: ["ignore", process.stdout, process.stderr]
};

const constants = {
  outputCapture: NO_OUTPUT_CAPTURE
};

export default constants;

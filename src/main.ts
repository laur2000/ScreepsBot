import { creepsController, globalController, structuresController } from "controllers";
import { rangerController } from "controllers/creeps/rangerController";
import { ErrorMapper } from "utils";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code

export const loop = ErrorMapper.wrapLoop(() => {
  creepsController.run();
  globalController.run();
  structuresController.run();
});

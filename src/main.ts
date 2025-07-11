import { creepsController, globalController, structuresController } from "controllers";
import { ErrorMapper } from "utils";
import profiler from "utils/profiler";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code

profiler.enable();
// export const loop = ErrorMapper.wrapLoop(() => {
//   creepsController.run();
//   globalController.run();
//   structuresController.run();
// });

export const loop = function () {
  profiler.wrap(function () {
    creepsController.run();
    globalController.run();
    structuresController.run();
  });
};

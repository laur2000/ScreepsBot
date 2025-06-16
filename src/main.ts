import { builderController } from "controllers/builderController";
import { garbageCollectorController } from "controllers/garbageCollectorController";
import { harvesterController } from "controllers/harvesterController";
import { linkController } from "controllers/linkController";
import { transporterController } from "controllers/transporterController";
import { turretController } from "controllers/turretController";
import { ErrorMapper } from "utils/ErrorMapper";
import "utils/Traveler";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  harvesterController.run();
  builderController.run();
  transporterController.run();
  turretController.run();
  linkController.run();
  garbageCollectorController.run();
});

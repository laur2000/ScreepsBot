import { marketController } from "controllers/MarketController";
import { builderController } from "controllers/builderController";
import { claimerController } from "controllers/claimerController";
import { garbageCollectorController } from "controllers/garbageCollectorController";
import { harvesterController } from "controllers/harvesterController";
import { haulerController } from "controllers/haulerController";
import { linkController } from "controllers/linkController";
import { pixelController } from "controllers/pixelController";
import { reserverController } from "controllers/reserverController";
import { soldierController } from "controllers/soldierController";
import { transporterController } from "controllers/transporterController";
import { turretController } from "controllers/turretController";
import { ErrorMapper } from "utils/ErrorMapper";
import "utils/Traveler";
import "utils/market";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  harvesterController.run();
  builderController.run();
  transporterController.run();
  turretController.run();
  linkController.run();
  claimerController.run();
  reserverController.run();
  haulerController.run();
  soldierController.run();
  pixelController.run();
  marketController.run();
  garbageCollectorController.run();
});

import { IController } from "controllers/controller";
import { builderController } from "./builderController";
import { claimerController } from "./claimerController";
import { harvesterController } from "./harvesterController";
import { haulerController } from "./haulerController";
import { reserverController } from "./reserverController";
import { soldierController } from "./soldierController";
import { transporterController } from "./transporterController";

class CreepsController implements IController {
  run(): void {
    builderController.run();
    claimerController.run();
    harvesterController.run();
    haulerController.run();
    reserverController.run();
    soldierController.run();
    transporterController.run();
  }
}

export const creepsController = new CreepsController();

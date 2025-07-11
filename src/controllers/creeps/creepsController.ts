import { IController } from "controllers";
import { builderController } from "./builderController";
import { claimerController } from "./claimerController";
import { harvesterController } from "./harvesterController";
import { haulerController } from "./haulerController";
import { reserverController } from "./reserverController";
import { soldierController } from "./soldierController";
import { transporterController } from "./transporterController";
import { decoyController } from "./decoyController";
import { rangerController } from "./rangerController";
import { healerController } from "./healerController";
import { boyscoutController } from "./boyscoutController";
import { patrolerController } from "./patrolerController";
import profiler from "utils/profiler";

class CreepsController implements IController {
  run(): void {
    boyscoutController.run();
    builderController.run();
    claimerController.run();
    decoyController.run();
    rangerController.run();
    healerController.run();
    harvesterController.run();
    haulerController.run();
    patrolerController.run();
    reserverController.run();
    soldierController.run();
    transporterController.run();
  }
}
profiler.registerClass(CreepsController, "CreepsController");

export const creepsController = new CreepsController();

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
import { powerHarvesterController } from "./powerHarvesterController";
import { tryRun } from "utils";

class CreepsController implements IController {
  run(): void {
    tryRun(() => boyscoutController.run());
    tryRun(() => builderController.run());
    tryRun(() => claimerController.run());
    tryRun(() => decoyController.run());
    tryRun(() => rangerController.run());
    tryRun(() => healerController.run());
    tryRun(() => harvesterController.run());
    tryRun(() => haulerController.run());
    tryRun(() => patrolerController.run());
    tryRun(() => powerHarvesterController.run());
    tryRun(() => reserverController.run());
    tryRun(() => soldierController.run());
    tryRun(() => transporterController.run());
  }
}
profiler.registerClass(CreepsController, "CreepsController");

export const creepsController = new CreepsController();

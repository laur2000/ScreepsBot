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
import { measureCpu, tryRun } from "utils";

class CreepsController implements IController {
  run(): void {
    measureCpu(() => tryRun(() => boyscoutController.run()), "boyscoutController.run");
    measureCpu(() => tryRun(() => builderController.run()), "builderController.run");
    measureCpu(() => tryRun(() => claimerController.run()), "claimerController.run");
    measureCpu(() => tryRun(() => decoyController.run()), "decoyController.run");
    measureCpu(() => tryRun(() => rangerController.run()), "rangerController.run");
    measureCpu(() => tryRun(() => healerController.run()), "healerController.run");
    measureCpu(() => tryRun(() => harvesterController.run()), "harvesterController.run");
    measureCpu(() => tryRun(() => haulerController.run()), "haulerController.run");
    measureCpu(() => tryRun(() => patrolerController.run()), "patrolerController.run");
    measureCpu(() => tryRun(() => powerHarvesterController.run()), "powerHarvesterController.run");
    measureCpu(() => tryRun(() => reserverController.run()), "reserverController.run");
    measureCpu(() => tryRun(() => soldierController.run()), "soldierController.run");
    measureCpu(() => tryRun(() => transporterController.run()), "transporterController.run");
  }
}
profiler.registerClass(CreepsController, "CreepsController");

export const creepsController = new CreepsController();

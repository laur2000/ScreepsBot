import { tryRun } from "utils";
import { factoryController } from "./factoryController";
import { labController } from "./labController";
import { linkController } from "./linkController";
import { terminalController } from "./terminalController";
import { turretController } from "./turretController";
import profiler from "utils/profiler";

class StructuresController {
  run() {
    tryRun(() => linkController.run());
    tryRun(() => terminalController.run());
    tryRun(() => turretController.run());
    tryRun(() => labController.run());
    tryRun(() => factoryController.run());
  }
}
profiler.registerClass(StructuresController, "StructuresController");

export const structuresController = new StructuresController();

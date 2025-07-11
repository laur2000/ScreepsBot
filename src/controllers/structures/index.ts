import { labController } from "./labController";
import { linkController } from "./linkController";
import { terminalController } from "./terminalController";
import { turretController } from "./turretController";
import profiler from "utils/profiler";

class StructuresController {
  run() {
    linkController.run();
    terminalController.run();
    turretController.run();
    labController.run();
  }
}
profiler.registerClass(StructuresController, "StructuresController");

export const structuresController = new StructuresController();

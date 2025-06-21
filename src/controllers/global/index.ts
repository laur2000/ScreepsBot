import { IController } from "controllers/controller";
import { garbageCollectorController } from "./garbageCollectorController";
import { pixelController } from "./pixelController";

class GlobalController implements IController {
  run(): void {
    garbageCollectorController.run();
    pixelController.run();
  }
}

export const globalController = new GlobalController();

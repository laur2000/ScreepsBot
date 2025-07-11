import { IController } from "controllers";
import { garbageCollectorController } from "./garbageCollectorController";
import { pixelController } from "./pixelController";
import profiler from "utils/profiler";

class GlobalController implements IController {
  run(): void {
    garbageCollectorController.run();
    pixelController.run();
    for (const room of Object.values(Game.rooms)) {
      const terminal = room.terminal;
      if (terminal) {
        if (terminal.store.getUsedCapacity(RESOURCE_ENERGY) < 10000) {
          global.buyCheapestEnergy(room.name, 10000);
        }
      }
      const controller = room.controller;
      if (!controller || !controller.my || controller.safeMode) continue;

      const [damagedStructure] = controller.room.find(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_TOWER:
            case STRUCTURE_SPAWN:
              return structure.hits < structure.hitsMax;
            default:
              return false;
          }
        }
      });

      if (damagedStructure) {
        controller.activateSafeMode();
      }
    }
  }
}
profiler.registerClass(GlobalController, "GlobalController");

export const globalController = new GlobalController();

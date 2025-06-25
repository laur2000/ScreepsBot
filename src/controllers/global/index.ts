import { IController } from "controllers";
import { garbageCollectorController } from "./garbageCollectorController";
import { pixelController } from "./pixelController";

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

      const attackers = room.find(FIND_HOSTILE_CREEPS, {
        filter: creep => {
          const hasAttackBodyPart = creep.getActiveBodyparts(ATTACK) > 0;
          const hasRangedAttackBodyPart = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
          return hasAttackBodyPart || hasRangedAttackBodyPart;
        }
      });

      if (attackers.length > 0) {
        controller.activateSafeMode();
      }
    }
  }
}

export const globalController = new GlobalController();

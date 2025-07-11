import { IController } from "controllers";
import profiler from "utils/profiler";


class GarbageCollectorController implements IController {
  run(): void {
    this.cleanCreeps();
    this.cleanFlags();
  }

  cleanCreeps(): void {
    const memoCreeps = Object.keys(Memory.creeps);
    const currentcreeps = Object.keys(Game.creeps);
    const creepsToDelete = memoCreeps.filter(creepName => !currentcreeps.includes(creepName));
    creepsToDelete.forEach(creepName => {
      delete Memory.creeps[creepName];
    });
  }

  cleanFlags(): void {
    const memoFlags = Object.keys(Memory.flags);
    const currentFlags = Object.keys(Game.flags);
    const flagsToDelete = memoFlags.filter(flagName => !currentFlags.includes(flagName));
    flagsToDelete.forEach(flagName => {
      delete Memory.flags[flagName];
    });
  }
}
profiler.registerClass(GarbageCollectorController, "GarbageCollectorController");

export const garbageCollectorController = new GarbageCollectorController();

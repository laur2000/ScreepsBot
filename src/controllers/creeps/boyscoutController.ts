import { IController } from "controllers";
import { BoyscoutCreep, BoyscoutMemory, BoyscoutState, CreepRole, FlagType } from "models";
import { spawnService } from "services/structures/spawnService";
import { findFlags } from "utils";
import { CacheFor } from "utils/cache";
import profiler from "utils/profiler";

const boyscoutBody = [MOVE];

class BoyscoutController implements IController {
  public constructor() {}
  run(): void {
    this.spawnBoyscout();
    this.executeBoyscout();
  }

  getInvisibleRoomFlags() {
    const boyscoutCreeps = this.getBoyscoutCreeps();
    const scoutFlags = findFlags(FlagType.Scout).filter(
      flag => !flag.room && !boyscoutCreeps.find(creep => creep.memory.targetFlag === flag.name)
    );
    return scoutFlags;
  }

  getBoyscoutCreeps() {
    return Object.values(Game.creeps).filter(creep => creep.memory.role === CreepRole.Boyscout) as BoyscoutCreep[];
  }

  spawnBoyscout() {
    const [flag] = this.getInvisibleRoomFlags();
    if (!flag) return;

    return spawnService.spawnClosestAvailable({
      target: { id: flag.name as any, pos: flag.pos },
      body: boyscoutBody,
      name: `boyscout-${flag.name}`,
      opts: {
        memory: {
          role: CreepRole.Boyscout,
          spawnId: "",
          state: BoyscoutState.Scouting,
          targetFlag: flag.name
        } as BoyscoutMemory
      }
    });
  }

  executeBoyscout() {
    const boyscoutCreeps = this.getBoyscoutCreeps();

    for (const creep of boyscoutCreeps) {
      switch (creep.memory.state) {
        case BoyscoutState.Scouting:
          this.doScout(creep);
          break;
      }
    }
  }
  doScout(creep: BoyscoutCreep) {
    const flag = Game.flags[creep.memory.targetFlag];
    if (!flag) return;
    creep.travelTo(flag);
  }
}

profiler.registerClass(BoyscoutController, "BoyscoutController");
export const boyscoutController = new BoyscoutController();

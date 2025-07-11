import { IController } from "controllers";
import { CreepRole, FlagType, DecoyCreep, DecoyMemory, DecoyState } from "models";
import { findFlag, getUniqueId } from "utils";
import "utils/Movement";
import profiler from "utils/profiler";

class DecoyController implements IController {
  constructor() {}
  run(): void {
    const creeps = Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Decoy
    ) as DecoyCreep[];

    const maxCreeps = 0;
    if (creeps.length < maxCreeps) {
      const name = "decoy-" + getUniqueId();
      const spawn = Object.values(Game.spawns)[0];
      if (!spawn) return;

      spawn.spawnCreep(
        [
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          TOUGH,
          ATTACK,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          ATTACK
        ],
        name,
        {
          memory: { role: CreepRole.Decoy, spawnId: spawn.id, state: DecoyState.Idle } as DecoyMemory
        }
      );
    } else {
      creeps.forEach(x => (x.memory.state = DecoyState.Distracting));
    }

    creeps.filter(x => x.memory.state === DecoyState.Distracting).forEach(x => this.distract(x));
  }

  distract(creep: DecoyCreep): void {
    // Get close to the enemy to be in range for attack, then attack and flee away
    const decoyFlag = findFlag(FlagType.Decoy);
    if (!decoyFlag) return;
    const room = decoyFlag.room?.name;

    if (creep.room.name !== room) {
      creep.moveTo(decoyFlag);
      return;
    }
    const closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (!closestHostile || creep.room.controller?.safeMode) {
      creep.moveTo(decoyFlag);
      return;
    }

    this.actionOrMove(creep, () => creep.attack(closestHostile), closestHostile);
  }

  actionOrMove(creep: DecoyCreep, action: () => ScreepsReturnCode, target: RoomPosition | HasPos): ScreepsReturnCode {
    const result = action();

    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
      return OK;
    }
    return result;
  }
}
profiler.registerClass(DecoyController, "DecoyController");

export const decoyController = new DecoyController();

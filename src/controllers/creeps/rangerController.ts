import { IController } from "controllers";
import { CreepRole, FlagType, RangerCreep, RangerMemory, RangerState } from "models";
import { findFlag, getUniqueId } from "utils";
import "utils/Movement";
class RangerController implements IController {
  constructor() {}
  run(): void {
    const creeps = Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Ranger
    ) as RangerCreep[];

    const maxCreeps = 0;
    if (creeps.length < maxCreeps) {
      const name = "ranger-" + getUniqueId();
      const spawn = Object.values(Game.spawns)[0];
      if (!spawn) return;

      spawn.spawnCreep([TOUGH, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE], name, {
        memory: { role: CreepRole.Ranger, spawnId: spawn.id, state: RangerState.Idle } as RangerMemory
      });
    } else {
      creeps.forEach(x => (x.memory.state = RangerState.Attacking));
    }

    creeps.filter(x => x.memory.state === RangerState.Attacking).forEach(x => this.attack(x));
  }

  attack(creep: RangerCreep): void {
    // Get close to the enemy to be in range for attack, then attack and flee away
    const rangeFlag = findFlag(FlagType.Range);
    if (!rangeFlag) return;
    const room = rangeFlag.room?.name;

    if (creep.room.name !== room) {
      creep.moveTo(rangeFlag);
      return;
    }
    const closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (!closestHostile || creep.room.controller?.safeMode) {
      creep.moveTo(rangeFlag);
      return;
    }
    // creep.rangedAttack(closestHostile);
    const result = this.actionOrMove(creep, () => creep.rangedAttack(closestHostile), closestHostile);
    creep.moveTo(closestHostile);
    // const distance = creep.pos.getRangeTo(closestHostile);
    // if (distance < 4) {
    //   const pathAway = PathFinder.search(creep.pos, { pos: closestHostile.pos, range: 3 }, { flee: true,  });
    //   console.log(JSON.stringify(pathAway.path[0]));
    //   console.log("Direction", creep.pos.getDirectionTo(pathAway.path[0]));
    //   const res = creep.move(creep.pos.getDirectionTo(pathAway.path[0]));
    //   // const res = creep.travelTo(pathAway.path[0]);
    //   console.log(`creep ${creep.name} move result: ${res}`);
    //   creep.fleeFrom([closestHostile], 3);
    // }
  }

  actionOrMove(creep: RangerCreep, action: () => ScreepsReturnCode, target: RoomPosition | HasPos): ScreepsReturnCode {
    const result = action();

    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
      return OK;
    }
    return result;
  }
}

export const rangerController = new RangerController();

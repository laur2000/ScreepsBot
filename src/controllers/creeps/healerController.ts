import { IController } from "controllers";
import { CreepRole, FlagType, HealerCreep, HealerMemory, HealerState } from "models";
import { findFlag, getUniqueId } from "utils";
import "utils/Movement";
import profiler from "utils/profiler";

class HealerController implements IController {
  constructor() {}
  run(): void {
    const creeps = Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Healer
    ) as HealerCreep[];

    const maxCreeps = 0;
    if (creeps.length < maxCreeps) {
      const name = "healer-" + getUniqueId();
      const spawn = Object.values(Game.spawns)[0];
      if (!spawn) return;

      RESOURCE_CATALYZED_GHODIUM_ALKALIDE;
      spawn.spawnCreep(
        [
          TOUGH,
          TOUGH, // 60 catalyzed ghodium alkalide
          MOVE,
          MOVE,
          MOVE, // 120 catalyzed zynthium alkalide
          MOVE,
          HEAL,
          HEAL,
          HEAL,
          HEAL,
          HEAL,
          HEAL,
          HEAL,
          HEAL // 240 catalyzed lemergium alkalide
        ],
        name,
        {
          memory: { role: CreepRole.Healer, spawnId: spawn.id, state: HealerState.Idle } as HealerMemory
        }
      );
    } else {
      creeps.forEach(x => (x.memory.state = HealerState.Healing));
      // const lab = Game.getObjectById("68603ad225bbf972127e05e5") as StructureLab | undefined;
      // if (lab) {
      //   lab.boostCreep(creeps[0]);
      //   lab.boostCreep(creeps[1]);
      // }
    }

    creeps.filter(x => x.memory.state === HealerState.Healing).forEach(x => this.heal(x));
  }

  heal(creep: HealerCreep): void {
    // Get close to the enemy to be in range for attack, then attack and flee away
    // if (creep.hits < creep.hitsMax) {
    //   creep.heal(creep);
    // }
    creep.heal(creep);
    const healerFlag = findFlag(FlagType.Heal);
    if (!healerFlag) return;
    const room = healerFlag.room?.name;

    if (creep.room.name !== room) {
      creep.moveTo(healerFlag);
      return;
    }
    const closestAlly = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: creep => creep.hits < creep.hitsMax
    });
    if (!closestAlly) {
      creep.moveTo(healerFlag);
      return;
    }

    this.actionOrMove(creep, () => creep.heal(closestAlly), closestAlly);
  }

  actionOrMove(creep: HealerCreep, action: () => ScreepsReturnCode, target: RoomPosition | HasPos): ScreepsReturnCode {
    if (creep.pos.getRangeTo(target) > 1) {
      creep.travelTo(target);
      return OK;
    }
    const result = action();

    return result;
  }
}
profiler.registerClass(HealerController, "HealerController");

export const healerController = new HealerController();

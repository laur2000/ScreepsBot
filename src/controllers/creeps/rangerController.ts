import { IController } from "controllers";
import { CreepRole, FlagType, RangerCreep, RangerMemory, RangerState } from "models";
import { doRecycle, findFlag, getUniqueId } from "utils";
import "utils/Movement";
class RangerController implements IController {
  constructor() {}
  run(): void {
    const creeps = Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Ranger
    ) as RangerCreep[];

    const enemiesPresent = Object.values(Game.spawns)[0].room.find(FIND_HOSTILE_CREEPS).length > 0;

    const maxCreeps = enemiesPresent ? 2 : 0;
    if (creeps.length < maxCreeps) {
      const name = "ranger-" + getUniqueId();
      const spawn = Object.values(Game.spawns)[0];
      if (!spawn) return;
      // spawn.spawnCreep([WORK, MOVE], name, {
      //   memory: { role: CreepRole.Ranger, spawnId: spawn.id, state: RangerState.Idle } as RangerMemory
      // });

      spawn.spawnCreep(
        [
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          ATTACK,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE
        ],
        name,
        {
          memory: { role: CreepRole.Ranger, spawnId: spawn.id, state: RangerState.Idle } as RangerMemory
        }
      );
    }
    creeps.forEach(x => {
      if (enemiesPresent) {
        x.memory.state = RangerState.Defending;
      } else {
        x.memory.state = RangerState.Recycling;
        doRecycle(x);
      }
    });
    creeps.filter(x => x.memory.state === RangerState.Attacking).forEach(x => this.attack(x));
    creeps.filter(x => x.memory.state === RangerState.Defending).forEach(x => this.defend(x));
  }

  defend(creep: RangerCreep): void {
    // Get closest rampart of enemy, stay inside of it and attack nearest enemy
    const [enemy] = creep.room.find(FIND_HOSTILE_CREEPS);
    if (!enemy) return;

    const closestRampart = enemy.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: s => {
        const isRampart = s.structureType === STRUCTURE_RAMPART;
        if (!isRampart) return false;
        const hasCreep = s.pos.lookFor(LOOK_CREEPS).length > 0;
        return !hasCreep;
      }
    }) as StructureRampart | null;
    if (!closestRampart) return;

    const distance = creep.pos.getRangeTo(closestRampart);
    if (distance > 0) {
      creep.moveTo(closestRampart);
      return;
    }
    const closestEnemy = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (!closestEnemy) {
      creep.memory.state = RangerState.Recycling;
      doRecycle(creep);
      return;
    }

    creep.attack(closestEnemy);
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

    const rampart = rangeFlag.pos.lookFor(LOOK_STRUCTURES)[0];
    if (rampart) {
      if (creep.getActiveBodyparts(ATTACK) > 0) {
        const result = this.actionOrMove(creep, () => creep.attack(rampart), rampart);
      } else if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
        this.actionOrMove(creep, () => creep.rangedAttack(rampart), rampart);
      } else if (creep.getActiveBodyparts(WORK) > 0) {
        this.actionOrMove(creep, () => creep.dismantle(rampart), rampart);
      }
      return;
    } else {
      creep.moveTo(rangeFlag);
      return;
    }
    // const closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    // if (!closestHostile || creep.room.controller?.safeMode) {
    //   creep.moveTo(rangeFlag);
    //   return;
    // }
    // // creep.rangedAttack(closestHostile);
    // if (creep.getActiveBodyparts(ATTACK) > 0) {
    //   const result = this.actionOrMove(creep, () => creep.attack(closestHostile), closestHostile);
    // } else {
    //   this.actionOrMove(creep, () => creep.rangedAttack(closestHostile), closestHostile);
    // }

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

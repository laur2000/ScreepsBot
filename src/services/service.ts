import { IRepository } from "repositories/repository";

export type TSpawnCreepResponse =
  | OK
  | ERR_NOT_OWNER
  | ERR_NAME_EXISTS
  | ERR_BUSY
  | ERR_NOT_ENOUGH_ENERGY
  | ERR_INVALID_ARGS
  | ERR_RCL_NOT_ENOUGH;

export interface IService<T extends Creep> {
  needMoreCreeps(spawn: StructureSpawn): boolean;
  spawn(spawn: StructureSpawn): TSpawnCreepResponse;
  execute(creep: T): void;
  getCreeps(spawn: StructureSpawn): T[];
}

export abstract class ABaseService<T extends Creep> implements IService<T> {
  constructor(private repository: IRepository<T>) {}

  protected doRecycle(creep: T): void {
    const spawn = Game.getObjectById(creep.memory.spawnId) as StructureSpawn;
    if (!spawn) return;

    const err = spawn.recycleCreep(creep);

    switch (err) {
      case ERR_NOT_IN_RANGE:
        this.move(creep, spawn);
        break;
    }
  }

  protected actionOrMove(creep: T, action: () => ScreepsReturnCode, target: RoomPosition | HasPos): ScreepsReturnCode {
    const result = action();

    if (result === ERR_NOT_IN_RANGE) {
      this.move(creep, target);
    }
    return result;
  }

  protected move(creep: T, target: RoomPosition | HasPos): void {
    // const roadExists = creep.pos.look().some(tile => {
    //   switch (tile.type) {
    //     case LOOK_CONSTRUCTION_SITES:
    //       return tile.constructionSite?.structureType === STRUCTURE_ROAD;
    //     case LOOK_STRUCTURES:
    //       return tile.structure?.structureType === STRUCTURE_ROAD;
    //     default:
    //       return false;
    //   }
    // });

    // if (!roadExists) {
    //   creep.pos.createConstructionSite(STRUCTURE_ROAD);
    // }
    if (creep.fatigue === 0) {
      // creep.moveTo(target, { visualizePathStyle: pathStyles[creep.memory.role as CreepRole] });
      creep.travelTo(target);
    }
  }

  abstract execute(creep: T): void;
  abstract needMoreCreeps(spawn: StructureSpawn): boolean;
  abstract spawn(spawn: StructureSpawn): TSpawnCreepResponse;

  getCreeps(spawn: StructureSpawn): T[] {
    return this.repository.getCreeps(spawn.id);
  }
}

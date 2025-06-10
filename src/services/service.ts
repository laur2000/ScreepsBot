import { CreepRole, IRepository } from "repositories/repository";
import { pathStyles } from "utils/pathStyles";

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
    const spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
    if (!spawn) return;

    const err = spawn.recycleCreep(creep);

    switch (err) {
      case ERR_NOT_IN_RANGE:
        this.move(creep, spawn);
        break;
    }
  }

  protected move(creep: T, target: RoomPosition | { pos: RoomPosition }): void {
    if (creep.fatigue === 0) {
      creep.moveTo(target, { visualizePathStyle: pathStyles[creep.memory.role as CreepRole] });
    }
  }

  abstract execute(creep: T): void;
  abstract needMoreCreeps(spawn: StructureSpawn): boolean;
  abstract spawn(spawn: StructureSpawn): TSpawnCreepResponse;

  getCreeps(spawn: StructureSpawn): T[] {
    return this.repository.getCreeps(spawn.id);
  }
}

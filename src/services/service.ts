import { IRepository } from "repositories";

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
    if (creep.fatigue === 0) {
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

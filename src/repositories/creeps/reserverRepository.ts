import { CreepRole, FlagType, ReserverCreep, ReserverState } from "models";
import { IRepository } from "repositories";
import { findFlags } from "utils";

export interface IReserverRepository extends IRepository<ReserverCreep> {
  countReserveFlags(): number;
  getReserveFlags(): Flag[];
}

export class ReserverRepository implements IReserverRepository {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Reserver && creep.memory.spawnId === spawnId
    ).length;
  }

  getCreeps(): ReserverCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Reserver && creep.memory.state !== ReserverState.Recycling
    ) as ReserverCreep[];
  }

  countReserveFlags(): number {
    return this.getReserveFlags().length;
  }

  getReserveFlags(): Flag[] {
    return findFlags(FlagType.Reserve);
  }
}

export const reserverRepository = new ReserverRepository();

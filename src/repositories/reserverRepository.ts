import { CreepRole, IRepository } from "./repository";

export enum ReserverState {
  Reserving = "reserving",
  Recycling = "recycling"
}

export interface ReserverCreep extends Creep {
  memory: ReserverMemory;
}

export interface ReserverMemory {
  role: CreepRole.Reserver;
  spawnId: string;
  state: ReserverState;
}

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

  getCreeps(spawnId: string): ReserverCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Reserver && creep.memory.spawnId === spawnId
    ) as ReserverCreep[];
  }

  countReserveFlags(): number {
    return this.getReserveFlags().length;
  }

  getReserveFlags(): Flag[] {
    return Object.values(Game.flags).filter(flag => flag.name === "reserve");
  }
}

export const reserverRepository = new ReserverRepository();

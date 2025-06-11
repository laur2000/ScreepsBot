import { CreepRole, IRepository } from "./repository";

export enum TransporterState {
  Transferring = "transferring",
  Collecting = "collecting",
  Recycling = "recycling"
}

export interface TransporterCreep extends Creep {
  memory: TransporterMemory;
}

export interface TransporterMemory {
  role: CreepRole.Transporter;
  spawnId: string;
  state: TransporterState;
}

export class TransporterRepository implements IRepository<TransporterCreep> {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Transporter && creep.memory.spawnId === spawnId
    ).length;
  }

  getCreeps(spawnId: string): TransporterCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Transporter && creep.memory.spawnId === spawnId
    ) as TransporterCreep[];
  }
}

export const transporterRepository = new TransporterRepository();

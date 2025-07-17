import { CreepRole, TransporterCreep, TransporterState } from "models";
import { IRepository } from "repositories";

export interface ITransporterRepository extends IRepository<TransporterCreep> {
  countCreepsByTargetId(): Record<string, number>;
}

export class TransporterRepository implements ITransporterRepository {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) =>
        creep.memory.role === CreepRole.Transporter &&
        creep.memory.spawnId === spawnId &&
        creep.memory.state !== TransporterState.Recycling
    ).length;
  }

  getCreeps(spawnId: string): TransporterCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Transporter && creep.memory.spawnId === spawnId
    ) as TransporterCreep[];
  }

  countCreepsByTargetId() {
    return Object.values(Game.creeps)
      .filter(creep => creep.memory.role === CreepRole.Transporter)
      .reduce((acc, creep) => {
        const targetId = creep.memory.containerTargetId;
        if (!targetId) return acc;

        acc[targetId] = (acc[targetId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }
}

export const transporterRepository = new TransporterRepository();

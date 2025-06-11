import {
  TransporterCreep,
  TransporterMemory,
  transporterRepository,
  TransporterState
} from "repositories/transporterRepository";
import { ABaseService, IService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { IRepository } from "repositories/repository";
import { getUniqueId, recordCountToArray } from "utils";
class TransporterService extends ABaseService<TransporterCreep> {
  MAX_CREEPS = 2;
  MIN_CREEPS_TTL = 60;
  public constructor(private transporterRepository: IRepository<TransporterCreep>) {
    super(transporterRepository);
  }

  override execute(transporter: TransporterCreep): void {
    this.updateTransporterState(transporter);
    this.executeTransporterState(transporter);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const creepCount = this.transporterRepository.countCreepsInSpawn(spawn.id);
    return creepCount < this.MAX_CREEPS;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const name = `transporter-${spawn.name}-${getUniqueId()}`;

    const bodyParts: Partial<Record<CreepBodyPart, number>> = {
      [CreepBodyPart.Carry]: 3,
      [CreepBodyPart.Move]: 3
    };
    const res = spawn.spawnCreep(recordCountToArray(bodyParts), name, {
      memory: {
        role: CreepRole.Transporter,
        spawnId: spawn.id,
        state: TransporterState.Collecting
      } as TransporterMemory
    });

    return res as TSpawnCreepResponse;
  }

  private updateTransporterState(creep: TransporterCreep): void {
    switch (creep.memory.state) {
      case TransporterState.Transferring:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.state = TransporterState.Collecting;
        }
        break;
      case TransporterState.Collecting:
        if (creep.store.getFreeCapacity() === 0) {
          creep.memory.state = TransporterState.Transferring;
        }
        break;
      case TransporterState.Recycling:
        break;
      default:
        creep.memory.state = TransporterState.Collecting;
    }

    if ((creep.ticksToLive || this.MIN_CREEPS_TTL) < this.MIN_CREEPS_TTL) {
      creep.memory.state = TransporterState.Recycling;
    }
  }

  private executeTransporterState(creep: TransporterCreep): void {
    switch (creep.memory.state) {
      case TransporterState.Transferring:
        this.doTransfer(creep);
        break;
      case TransporterState.Collecting:
        this.doCollect(creep);
        break;
      case TransporterState.Recycling:
        this.doRecycle(creep);
        break;
    }
  }

  private doTransfer(creep: TransporterCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
          case STRUCTURE_TOWER:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          default:
            return false;
        }
      }
    });
    if (!target) return;
    this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
  }

  private doCollect(creep: TransporterCreep): void {
    const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tombstone => tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });

    const target =
      tombstone ||
      creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
              return structure.store.getFreeCapacity(RESOURCE_ENERGY) !== structure.store.getCapacity(RESOURCE_ENERGY);
            default:
              return false;
          }
        }
      });
    if (!target) return;
    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

export const transporterService = new TransporterService(transporterRepository);

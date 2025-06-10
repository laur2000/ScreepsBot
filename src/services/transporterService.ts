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
    const harvesterName = `transporter-${spawn.name}-${getUniqueId()}`;

    const bodyParts: Partial<Record<CreepBodyPart, number>> = {
      [CreepBodyPart.Carry]: 3,
      [CreepBodyPart.Move]: 3
    };
    const res = spawn.spawnCreep(recordCountToArray(bodyParts), harvesterName, {
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
      default:
        creep.memory.state = TransporterState.Collecting;
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
          case STRUCTURE_CONTROLLER:
            return true;
          default:
            return false;
        }
      }
    });
    if (!target) return;

    const transferErr = creep.transfer(target, RESOURCE_ENERGY);

    switch (transferErr) {
      case ERR_NOT_IN_RANGE:
        this.move(creep, target);
        break;
      default:
        break;
    }
  }

  private doCollect(creep: TransporterCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_CONTAINER
    });
    if (!target) return;

    const harvestErr = creep.withdraw(target, RESOURCE_ENERGY);

    switch (harvestErr) {
      case ERR_NOT_IN_RANGE:
        this.move(creep, target);
        break;
      default:
        break;
    }
  }
}

export const transporterService = new TransporterService(transporterRepository);

import {
  ITransporterRepository,
  TransporterCreep,
  TransporterMemory,
  transporterRepository,
  TransporterState
} from "repositories/transporterRepository";
import { ABaseService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { getUniqueId, recordCountToArray } from "utils";
import { findRepository, IFindRepository } from "repositories/findRepository";
class TransporterService extends ABaseService<TransporterCreep> {
  MIN_CREEPS_TTL = 60;
  MAX_CREEPS_PER_CONTAINER = 2;
  public constructor(private transporterRepository: ITransporterRepository, private findRepository: IFindRepository) {
    super(transporterRepository);
  }

  override execute(transporter: TransporterCreep): void {
    this.assignSource(transporter);
    this.updateTransporterState(transporter);
    this.executeTransporterState(transporter);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const creepCount = this.transporterRepository.countCreepsInSpawn(spawn.id);
    const containersCount = this.findRepository.containersCount(spawn.room);
    const containerFlags = Object.values(Game.flags).filter(flag => flag.name === "container").length;
    const maxCreeps = (containerFlags + containersCount) * this.MAX_CREEPS_PER_CONTAINER;
    return creepCount < 2;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const name = `transporter-${spawn.name}-${getUniqueId()}`;

    const bodyParts: Partial<Record<CreepBodyPart, number>> = {
      [CreepBodyPart.Carry]: 6,
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
    const target = creep.findClosestByPriority([FIND_STRUCTURES], {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
          case STRUCTURE_LAB:
            return (
              (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ||
              (creep.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID) > 0 &&
                structure.store.getFreeCapacity(RESOURCE_CATALYZED_GHODIUM_ACID))
            );
          case STRUCTURE_TERMINAL:
            const terminalId = creep.room.terminal?.id;
            const transaction = global.getTransaction(terminalId);
            if (!transaction) return false;
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) < transaction.energyNeeded;
          case STRUCTURE_STORAGE:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;

          case STRUCTURE_TOWER:
            return (
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY) &&
              creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          default:
            return false;
        }
      },
      priority: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
            return 1;
          case STRUCTURE_TERMINAL:
            return 2;
          case STRUCTURE_TOWER:
            return 3;
          case STRUCTURE_LAB:
            return 4;
          case STRUCTURE_STORAGE:
            return 10;

          default:
            return 1000;
        }
      }
    });
    if (!target) return;

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
    } else if (creep.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0) {
      this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_HYDROGEN), target);
    } else if (creep.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID) > 0) {
      this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_CATALYZED_GHODIUM_ACID), target);
    }
  }
  private assignSource(creep: TransporterCreep): void {
    if (creep.memory.containerTargetId) return;

    const sources = this.findRepository.findAvailableContainers(creep.room, this.MAX_CREEPS_PER_CONTAINER);

    if (sources[0]) {
      creep.memory.containerTargetId = sources[0].id;
    }
  }

  private doCollect(creep: TransporterCreep): void {
    const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tombstone =>
        tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0 || tombstone.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0
    });

    const droppedResource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);

    const target = tombstone || (creep.memory.containerTargetId && Game.getObjectById(creep.memory.containerTargetId));

    if (droppedResource) {
      this.actionOrMove(creep, () => creep.pickup(droppedResource), droppedResource);
    }
    if (!target) return;
    if (target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
    } else if (target.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0) {
      this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_HYDROGEN), target);
    }
  }
}

export const transporterService = new TransporterService(transporterRepository, findRepository);

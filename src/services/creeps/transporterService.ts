import { CreepRole, FlagType, TransporterCreep, TransporterMemory, TransporterState } from "models";
import { findRepository, IFindRepository, ITransporterRepository, transporterRepository } from "repositories";
import { ABaseService, TSpawnCreepResponse, roomServiceConfig } from "services";
import { findFlags, getUniqueId, recordCountToArray } from "utils";

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
    const { transporter } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const creepCount = this.transporterRepository.countCreepsInSpawn(spawn.id);
    const containersCount = this.findRepository.containersCount(spawn.room);
    const containerFlags = findFlags(FlagType.Container).length;
    const maxCreeps = (containerFlags + containersCount) * this.MAX_CREEPS_PER_CONTAINER;
    return creepCount < (transporter?.maxCreeps ?? 1);
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const name = `transporter-${spawn.name}-${getUniqueId()}`;
    const { transporter } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const res = spawn.spawnCreep(recordCountToArray(transporter!.bodyParts), name, {
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

  private getTarget(creep: TransporterCreep): Structure | null {
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
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 100 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          default:
            return false;
        }
      },
      priority: structure => {
        const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
            return 1;
          case STRUCTURE_TERMINAL:
            return 2;
          case STRUCTURE_TOWER:
            return hostileCreeps.length > 0 ? 0 : 5;
          case STRUCTURE_LAB:
            return 4;
          case STRUCTURE_STORAGE:
            return 10;

          default:
            return 1000;
        }
      }
    });
    return target || null;
  }
  private doTransfer(creep: TransporterCreep): void {
    const target = this.getTarget(creep);
    if (!target) return;

    for (const resourceType in creep.store) {
      if (creep.store.getUsedCapacity(resourceType as ResourceConstant) > 0) {
        this.actionOrMove(creep, () => creep.transfer(target, resourceType as ResourceConstant), target);
      }
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
    const terminal = creep.room.terminal;
    // if (terminal) {
    //   this.actionOrMove(creep, () => creep.withdraw(terminal, RESOURCE_ENERGY), terminal);
    //   return;
    // }
    const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tombstone =>
        tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0 || tombstone.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0
    });

    const droppedResource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);

    const target = tombstone || (creep.memory.containerTargetId && Game.getObjectById(creep.memory.containerTargetId));
    // if (droppedResource) {
    //   this.actionOrMove(creep, () => creep.pickup(droppedResource), droppedResource);
    //   return;
    // }
    if (!target) return;
    if (target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
    } else if (target.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0) {
      this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_HYDROGEN), target);
    }
    // else if (creep.room.terminal && creep.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 10000) {
    //   this.actionOrMove(creep, () => creep.withdraw(creep.room.terminal!, RESOURCE_ENERGY), creep.room.terminal);
    // }
    else {
      const target = this.getTarget(creep);
      if (target?.structureType === STRUCTURE_STORAGE) return;
      const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure =>
          structure.structureType === STRUCTURE_STORAGE && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      });
      if (!storage) return;
      this.actionOrMove(creep, () => creep.withdraw(storage, RESOURCE_ENERGY), storage);
    }
  }
}

export const transporterService = new TransporterService(transporterRepository, findRepository);

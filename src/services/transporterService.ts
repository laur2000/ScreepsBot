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
class TransporterService extends ABaseService<TransporterCreep> {
  MAX_CREEPS = 5;
  MIN_CREEPS_TTL = 60;
  MAX_CREEPS_PER_CONTAINER = 2;
  public constructor(private transporterRepository: ITransporterRepository) {
    super(transporterRepository);
  }

  override execute(transporter: TransporterCreep): void {
    this.assignSource(transporter);
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
          case STRUCTURE_STORAGE:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;

          case STRUCTURE_TOWER:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY);
          default:
            return false;
        }
      },
      priority: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
            return 1;
          case STRUCTURE_SPAWN:
            return 1;
          case STRUCTURE_TOWER:
            return 3;
          case STRUCTURE_STORAGE:
            return 4;
          default:
            return 1000;
        }
      }
    });

    if (!target) return;
    this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
  }
  private assignSource(creep: TransporterCreep): void {
    if (creep.memory.containerTargetId) return;

    const containersCount = this.transporterRepository.countCreepsByTargetId();
    const sources = creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        if (structure.structureType !== STRUCTURE_CONTAINER) return false;

        const count = containersCount[structure.id] || 0;
        // const flagMax = structure.pos.look().find(s => s.type === "flag");
        // return count < structure.pos.look().filter(s => s.type === Flag)[0].flag?.name;
        Memory.containers = Memory.containers || {};
        const maxCount = Memory.containers?.[structure.id]?.maxCreeps || this.MAX_CREEPS_PER_CONTAINER;
        return count < maxCount;
      }
    });

    if (sources[0]) {
      creep.memory.containerTargetId = sources[0].id;
    }
  }

  private doCollect(creep: TransporterCreep): void {
    const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tombstone => tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });

    const target = tombstone || (creep.memory.containerTargetId && Game.getObjectById(creep.memory.containerTargetId));

    if (!target) return;
    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

export const transporterService = new TransporterService(transporterRepository);

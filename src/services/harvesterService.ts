import {
  HarvesterCreep,
  HarvesterMemory,
  harvesterRepository,
  HarvesterState,
  IHarvesterRepository
} from "repositories/harvesterRepository";
import { ABaseService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { getUniqueId, recordCountToArray } from "utils";

class HarvesterService extends ABaseService<HarvesterCreep> {
  constructor(private harvesterRepository: IHarvesterRepository) {
    super(harvesterRepository);
  }
  MAX_CREEPS = 4;
  MAX_CREEPS_PER_SOURCE = 2;
  MIN_CREEPS_TTL = 60;

  needMoreCreeps(spawn: StructureSpawn): boolean {
    const creepCount = this.harvesterRepository.countCreepsInSpawn(spawn.id);
    return creepCount < this.MAX_CREEPS;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `harvester-${spawn.name}-${getUniqueId()}`;
    const bodyParts: Partial<Record<CreepBodyPart, number>> = {
      [CreepBodyPart.Work]: 4,
      [CreepBodyPart.Carry]: 1,
      [CreepBodyPart.Move]: 2
    };
    const res = spawn.spawnCreep(recordCountToArray(bodyParts), harvesterName, {
      memory: { role: CreepRole.Harvester, spawnId: spawn.id, state: HarvesterState.Harvesting } as HarvesterMemory
    });

    return res as TSpawnCreepResponse;
  }

  override execute(harvester: HarvesterCreep): void {
    this.assignSource(harvester);
    this.updateHarvesterState(harvester);
    this.executeHarvesterState(harvester);
  }

  private updateHarvesterState(creep: HarvesterCreep): void {
    switch (creep.memory.state) {
      case HarvesterState.Harvesting:
        if (creep.store.getFreeCapacity() === 0) {
          creep.memory.state = HarvesterState.Transferring;
        }
        break;
      case HarvesterState.Transferring:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.state = HarvesterState.Harvesting;
        }
        break;
      case HarvesterState.Recycling:
        break;
      default:
        creep.memory.state = HarvesterState.Harvesting;
    }

    if ((creep.ticksToLive || this.MIN_CREEPS_TTL) < this.MIN_CREEPS_TTL) {
      creep.memory.state = HarvesterState.Recycling;
    }
  }

  private executeHarvesterState(creep: HarvesterCreep): void {
    switch (creep.memory.state) {
      case HarvesterState.Harvesting:
        this.doHarvest(creep);
        break;
      case HarvesterState.Transferring:
        this.doTransfer(creep);
        break;
      case HarvesterState.Recycling:
        this.doRecycle(creep);
        break;
    }
  }

  private assignSource(creep: HarvesterCreep): void {
    if (creep.memory.harvestTargetId) return;

    const sourcesCount = this.harvesterRepository.countCreepsBySource();
    const sources = creep.room.find(FIND_SOURCES, {
      filter: source => {
        const count = sourcesCount[source.id] || 0;
        return count < this.MAX_CREEPS_PER_SOURCE;
      }
    });

    if (sources[0]) {
      creep.memory.harvestTargetId = sources[0].id;
    }
  }

  private doHarvest(harvester: HarvesterCreep): void {
    if (!harvester.memory.harvestTargetId) return;
    const target = Game.getObjectById(harvester.memory.harvestTargetId) as Source | Deposit | Mineral;
    if (!target) return;
    this.actionOrMove(harvester, () => harvester.harvest(target), target);
  }

  private doTransfer(creep: HarvesterCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_CONTAINER:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          case STRUCTURE_CONTROLLER:
            return true;
          default:
            return false;
        }
      }
    });

    if (!target) return;

    this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
  }
}

export const harvesterService = new HarvesterService(harvesterRepository);

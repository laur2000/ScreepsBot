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
import { IFindRepository, findRepository } from "repositories/findRepository";
import { roomServiceConfig } from "./roomServiceConfig";

class HarvesterService extends ABaseService<HarvesterCreep> {
  constructor(private harvesterRepository: IHarvesterRepository, private findRepository: IFindRepository) {
    super(harvesterRepository);
  }
  MAX_CREEPS_PER_SOURCE = 2;
  MIN_CREEPS_TTL = 60;

  needMoreCreeps(spawn: StructureSpawn): boolean {
    const { harvester } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;
    const creepCount = this.harvesterRepository.countCreepsInSpawn(spawn.id);
    const sourcesCount = this.findRepository.sourcesCount(spawn.room);
    const harvestFlags = this.harvesterRepository.countHarvestFlags();
    const maxCreeps = (harvestFlags + sourcesCount) * (harvester?.maxCreepsPerSource || 1);
    return creepCount < maxCreeps;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const { harvester } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;
    const harvesterName = `harvester-${spawn.name}-${getUniqueId()}`;
    const res = spawn.spawnCreep(recordCountToArray(harvester!.bodyParts), harvesterName, {
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
        if (creep.store.getFreeCapacity() < 3) {
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
    const sources = this.findRepository.findAvailableSources(creep.room, this.MAX_CREEPS_PER_SOURCE);
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
          case STRUCTURE_STORAGE:
            return (
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ||
              structure.store.getFreeCapacity(RESOURCE_HYDROGEN) > 0
            );
          case STRUCTURE_LINK:
            return (
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          case STRUCTURE_CONTROLLER:
            return structure.my;
          default:
            return false;
        }
      }
    });
    if (!target) return;

    if (creep.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0) {
      this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_HYDROGEN), target);
    } else {
      this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
    }
  }
}

export const harvesterService = new HarvesterService(harvesterRepository, findRepository);

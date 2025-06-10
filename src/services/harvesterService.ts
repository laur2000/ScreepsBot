import {
  HarvesterCreep,
  HarvesterMemory,
  harvesterRepository,
  HarvesterState,
  IHarvesterRepository
} from "repositories/harvesterRepository";
import { ABaseService, IService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole, IRepository } from "repositories/repository";
import { harvesterPathStyle } from "utils/pathStyles";
import { getUniqueId, recordCountToArray } from "utils";

class HarvesterService extends ABaseService<HarvesterCreep> {
  constructor(private harvesterRepository: IHarvesterRepository) {
    super(harvesterRepository);
  }
  MAX_CREEPS = 4;
  MAX_CREEPS_PER_SOURCE = 2;
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

    const harvestErr = harvester.harvest(target);

    switch (harvestErr) {
      case ERR_NOT_IN_RANGE:
        this.move(harvester, target);
        break;
      default:
        break;
    }
  }

  private doTransfer(creep: HarvesterCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_CONTAINER:
          case STRUCTURE_EXTENSION:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
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
}

export const harvesterService = new HarvesterService(harvesterRepository);

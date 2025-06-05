import { HarvesterCreep, HarvesterMemory, harvesterRepository, HarvesterState } from "repositories/harvesterRepository";
import { IService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { harvesterPathStyle } from "utils/pathStyles";

class HarvesterService implements IService<HarvesterCreep> {
  MAX_CREEPS = 5;
  needMoreCreeps(spawn: StructureSpawn): boolean {
    const creepCount = harvesterRepository.countCreepsInSpawn(spawn.id);
    return creepCount < this.MAX_CREEPS;
  }

  spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `harvester-${spawn.name}-${harvesterRepository.countCreepsInSpawn(spawn.id)}`;

    const res = spawn.spawnCreep([CreepBodyPart.Work, CreepBodyPart.Carry, CreepBodyPart.Move], harvesterName, {
      memory: { role: CreepRole.Harvester, spawnId: spawn.id, state: HarvesterState.Harvesting } as HarvesterMemory
    });

    return res as TSpawnCreepResponse;
  }

  execute(harvester: HarvesterCreep): void {
    this.updateHarvesterState(harvester);
    this.executeHarvesterState(harvester);
  }

  getCreeps(spawn: StructureSpawn): HarvesterCreep[] {
    return harvesterRepository.getCreeps(spawn.id);
  }

  private updateHarvesterState(creep: HarvesterCreep): void {
    switch (creep.memory.state) {
      case HarvesterState.Harvesting:
        if (creep.store.getFreeCapacity() === 0) {
          creep.memory.state = HarvesterState.transferring;
        }
        break;
      case HarvesterState.transferring:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.state = HarvesterState.Harvesting;
        }
        break;
    }
  }

  private executeHarvesterState(creep: HarvesterCreep): void {
    switch (creep.memory.state) {
      case HarvesterState.Harvesting:
        this.doHarvest(creep);
        break;
      case HarvesterState.transferring:
        this.doTransfer(creep);
        break;
    }
  }
  private doHarvest(harvester: HarvesterCreep): void {
    const target = harvester.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
    if (!target) return;

    const harvestErr = harvester.harvest(target);

    switch (harvestErr) {
      case ERR_NOT_IN_RANGE:
        harvester.moveTo(target, {
          visualizePathStyle: harvesterPathStyle
        });
        break;
      default:
        break;
    }
  }

  private doTransfer(creep: HarvesterCreep): void {
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
        creep.moveTo(target, {
          visualizePathStyle: harvesterPathStyle
        });
        break;
      default:
        break;
    }
  }
}

export const harvesterService = new HarvesterService();

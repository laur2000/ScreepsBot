import { CreepRole, HarvesterCreep, HarvesterMemory, HarvesterState } from "models";
import { harvesterRepository, IHarvesterRepository, IFindRepository, findRepository } from "repositories";
import { ABaseService, roomServiceConfig, TSpawnCreepResponse } from "services";
import { getCreepConfigPerRoom, getUniqueId, recordCountToArray } from "utils";

export class HarvesterService extends ABaseService<HarvesterCreep> {
  constructor(private harvesterRepository: IHarvesterRepository, private findRepository: IFindRepository) {
    super(harvesterRepository);
  }
  MAX_CREEPS_PER_SOURCE = 2;
  MIN_CREEPS_TTL = 60;

  needMoreCreeps(): boolean {
    return this.findRepository.findAvailableHarvesterSources().length > 0;
  }

  override spawn(): TSpawnCreepResponse {
    const name = `harvester-${getUniqueId()}`;
    const harvesterSources = this.findRepository.findAvailableHarvesterSources();
    for (const harvesterSource of harvesterSources) {
      const result = this.findRepository.findClosestSpawnOfTarget(harvesterSource);
      if (!result) return ERR_BUSY;

      const { closestSpawn, closestAvailableSpawn } = result;

      const harvesterConfig = getCreepConfigPerRoom(CreepRole.Harvester, closestAvailableSpawn.room);

      closestAvailableSpawn.spawnCreep(recordCountToArray(harvesterConfig.bodyParts), name, {
        memory: {
          role: CreepRole.Harvester,
          spawnId: closestSpawn.id,
          state: HarvesterState.Harvesting,
          harvestTargetId: harvesterSource.id
        } as HarvesterMemory
      });
    }

    return OK;
  }

  override execute(harvester: HarvesterCreep): void {
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

  private doHarvest(harvester: HarvesterCreep): void {
    if (!harvester.memory.harvestTargetId) return;
    const target = Game.getObjectById(harvester.memory.harvestTargetId) as Source | Deposit | Mineral;
    if (!target) return;
    const err = this.actionOrMove(harvester, () => harvester.harvest(target), target);
  }

  private doTransfer(creep: HarvesterCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_CONTAINER:
          case STRUCTURE_STORAGE:
          case STRUCTURE_SPAWN:
          case STRUCTURE_EXTENSION:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          case STRUCTURE_LINK:
            return (
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );

          // case STRUCTURE_CONTROLLER:
          //   return structure.my;
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

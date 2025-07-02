import { CreepRole, HarvesterCreep, HarvesterMemory, HarvesterState } from "models";
import {
  harvesterRepository,
  IHarvesterRepository,
  IFindRepository,
  findRepository,
  THarvesterSource
} from "repositories";
import { ABaseService, roomServiceConfig, TSpawnCreepResponse } from "services";
import { calculateBodyCost, getCreepConfigPerRoom, getUniqueId, recordCountToArray } from "utils";

export class HarvesterService extends ABaseService<HarvesterCreep> {
  constructor(private harvesterRepository: IHarvesterRepository, private findRepository: IFindRepository) {
    super(harvesterRepository);
  }
  MAX_CREEPS_PER_SOURCE = 2;
  MIN_CREEPS_TTL = 60;

  needMoreCreeps(): boolean {
    return this.findRepository.findAvailableHarvesterSources().length > 0;
  }

  getBodyNeededForSource(source: THarvesterSource): { body: BodyPartConstant[]; energy: number } {
    const room = source.room || ({ name: "" } as Room);
    const { bodyParts } = getCreepConfigPerRoom(CreepRole.Harvester, room);
    const body = recordCountToArray(bodyParts);
    const energy = calculateBodyCost(body);
    return { body, energy };
  }

  override spawn(): TSpawnCreepResponse {
    const name = `harvester-${getUniqueId()}`;
    const harvesterSources = this.findRepository.findAvailableHarvesterSources();
    for (const harvesterSource of harvesterSources) {
      const { body, energy } = this.getBodyNeededForSource(harvesterSource);
      const closestAvailableSpawn = this.findRepository.findClosestAvailableSpawnOfTarget(harvesterSource, energy);
      if (!closestAvailableSpawn) return ERR_BUSY;

      closestAvailableSpawn.spawnCreep(body, name, {
        memory: {
          role: CreepRole.Harvester,
          spawnId: closestAvailableSpawn.id,
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
        if (creep.store.getFreeCapacity() < 3) {
          this.doTransfer(creep);
        } else if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          this.doHarvest(creep);
        }
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
        const distance = creep.pos.getRangeTo(structure);
        if (distance > 4) return false;
        switch (structure.structureType) {
          case STRUCTURE_CONTAINER:
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

    if (target.hits < target.hitsMax && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      this.actionOrMove(creep, () => creep.repair(target), target);
      return;
    }

    if (creep.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0) {
      this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_HYDROGEN), target);
    } else {
      this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
    }
  }
}

export const harvesterService = new HarvesterService(harvesterRepository, findRepository);

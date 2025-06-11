import { BuilderCreep, BuilderMemory, builderRepository, BuilderState } from "repositories/builderRepository";
import { ABaseService, IService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { IRepository } from "repositories/repository";
import { getUniqueId, recordCountToArray } from "utils";
class BuilderService extends ABaseService<BuilderCreep> {
  MAX_CREEPS = 5;
  MIN_CREEPS_TTL = 60;
  public constructor(private builderRepository: IRepository<BuilderCreep>) {
    super(builderRepository);
  }

  override execute(builder: BuilderCreep): void {
    this.updateBuilderState(builder);
    this.executeBuilderState(builder);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const creepCount = this.builderRepository.countCreepsInSpawn(spawn.id);
    return creepCount < this.MAX_CREEPS;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `builder-${spawn.name}-${getUniqueId()}`;

    const bodyParts: Partial<Record<CreepBodyPart, number>> = {
      [CreepBodyPart.Work]: 2,
      [CreepBodyPart.Carry]: 4,
      [CreepBodyPart.Move]: 4
    };
    const res = spawn.spawnCreep(recordCountToArray(bodyParts), harvesterName, {
      memory: { role: CreepRole.Builder, spawnId: spawn.id, state: BuilderState.Building } as BuilderMemory
    });

    return res as TSpawnCreepResponse;
  }

  private updateBuilderState(creep: BuilderCreep): void {
    switch (creep.memory.state) {
      case BuilderState.Building:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.state = BuilderState.Collecting;
        }
        break;
      case BuilderState.Collecting:
        if (creep.store.getFreeCapacity() === 0) {
          creep.memory.state = BuilderState.Building;
        }
        break;
      case BuilderState.Recycling:
        break;
      default:
        creep.memory.state = BuilderState.Building;
    }

    if ((creep.ticksToLive || this.MIN_CREEPS_TTL) < this.MIN_CREEPS_TTL) {
      creep.memory.state = BuilderState.Recycling;
    }
  }

  private executeBuilderState(creep: BuilderCreep): void {
    switch (creep.memory.state) {
      case BuilderState.Building:
        this.doBuild(creep);
        break;
      case BuilderState.Collecting:
        this.doCollect(creep);
        break;
      case BuilderState.Recycling:
        this.doRecycle(creep);
        break;
    }
  }

  private doBuild(creep: BuilderCreep): void {
    const target = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
      filter: site => {
        switch (site.structureType) {
          default:
            return true;
        }
      }
    });
    if (!target) {
      const controller = creep.room.controller;
      if (!controller) return;
      this.actionOrMove(creep, () => creep.upgradeController(controller), controller);
      return;
    }
    this.actionOrMove(creep, () => creep.build(target), target);
  }

  private doCollect(creep: BuilderCreep): void {
    // TODO: Assign targetId to builder and calculate the energy that will be consumed from the container
    // for each creep with that target, if the container has enough energy then make it the target for new creeps
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_CONTAINER:
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 300;
          default:
            return false;
        }
      }
    });
    if (!target) return;
    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

export const builderService = new BuilderService(builderRepository);

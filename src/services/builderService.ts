import { BuilderCreep, BuilderMemory, builderRepository, BuilderState } from "repositories/builderRepository";
import { ABaseService, IService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { IRepository } from "repositories/repository";
import { getUniqueId, recordCountToArray } from "utils";
class BuilderService extends ABaseService<BuilderCreep> {
  MAX_CREEPS = 5;
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
      [CreepBodyPart.Carry]: 2,
      [CreepBodyPart.Move]: 2
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
      default:
        creep.memory.state = BuilderState.Building;
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
    }
  }

  private doBuild(creep: BuilderCreep): void {
    const target = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
      filter: site => {
        switch (site.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_CONTAINER:
          case STRUCTURE_ROAD:
            return true;
          default:
            return false;
        }
      }
    });
    if (!target) return;

    const buildErr = creep.build(target);

    switch (buildErr) {
      case ERR_NOT_IN_RANGE:
        this.move(creep, target);
        break;
      default:
        break;
    }
  }

  private doCollect(creep: BuilderCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_CONTAINER
    });
    if (!target) return;

    const harvestErr = creep.withdraw(target, RESOURCE_ENERGY);

    switch (harvestErr) {
      case ERR_NOT_IN_RANGE:
        this.move(creep, target);
        break;
      default:
        break;
    }
  }
}

export const builderService = new BuilderService(builderRepository);

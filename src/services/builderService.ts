import { BuilderCreep, BuilderMemory, builderRepository, BuilderState } from "repositories/builderRepository";
import { ABaseService, IService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { IRepository } from "repositories/repository";
import { getUniqueId, recordCountToArray } from "utils";
import { findRepository, IFindRepository } from "repositories/findRepository";
import { roomServiceConfig } from "./roomServiceConfig";
class BuilderService extends ABaseService<BuilderCreep> {
  MAX_CREEPS_PER_SOURCE = 1;
  MIN_CREEPS_TTL = 60;
  public constructor(private builderRepository: IRepository<BuilderCreep>, private findRepository: IFindRepository) {
    super(builderRepository);
  }

  override execute(builder: BuilderCreep): void {
    this.updateBuilderState(builder);
    this.executeBuilderState(builder);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const { builder } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const creepCount = this.builderRepository.countCreepsInSpawn(spawn.id);
    return creepCount < (builder?.maxCreeps || 1);
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `builder-${spawn.name}-${getUniqueId()}`;
    const { builder } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const res = spawn.spawnCreep(recordCountToArray(builder!.bodyParts), harvesterName, {
      memory: {
        role: CreepRole.Builder,
        spawnId: spawn.id,
        state: builder?.useBoost ? BuilderState.Boosting : BuilderState.Collecting
      } as BuilderMemory
    });

    return res as TSpawnCreepResponse;
  }

  private updateBuilderState(creep: BuilderCreep): void {
    switch (creep.memory.state) {
      case BuilderState.Boosting:
        if (creep.body.every(b => b.type === CreepBodyPart.Work && b.boost)) {
          creep.memory.state = BuilderState.Collecting;
        }
        break;
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
      case BuilderState.Boosting:
        this.doBoost(creep);
        break;
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

  protected override doRecycle(creep: BuilderCreep): void {
    if (!creep.body.some(b => b.boost)) {
      return super.doRecycle(creep);
    }

    const [boostFlag] = creep.room.find(FIND_FLAGS, {
      filter: flag => flag.name === "builder,boost"
    });
    if (!boostFlag) return;
    const lab = boostFlag.pos.lookFor(LOOK_STRUCTURES)[0] as StructureLab | undefined;
    if (!lab) return;
    const err = this.actionOrMove(creep, () => lab.unboostCreep(creep), lab);
  }

  private doBoost(creep: BuilderCreep): void {
    const [boostFlag] = creep.room.find(FIND_FLAGS, {
      filter: flag => flag.name === "builder,boost"
    });
    if (!boostFlag) return;
    const lab = boostFlag.pos.lookFor(LOOK_STRUCTURES)[0] as StructureLab | undefined;
    if (!lab) return;

    const err = this.actionOrMove(creep, () => lab.boostCreep(creep), lab);

    if (err !== ERR_NOT_IN_RANGE) {
      console.log("error boosting creep: ", creep.name, err);
      creep.memory.state = BuilderState.Collecting;
    }
  }

  private doBuild(creep: BuilderCreep): void {
    const buildFlag = Object.values(Game.flags).find(flag => flag.name === "build");
    const targetPos = buildFlag?.pos || creep.pos;
    if (targetPos.roomName !== creep.room.name) {
      this.move(creep, targetPos);
      return;
    }
    const target = targetPos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
      filter: site => {
        switch (site.structureType) {
          default:
            return true;
        }
      }
    });

    const controller = creep.room.controller;
    if (controller && (!target || controller.ticksToDowngrade < 1000)) {
      this.actionOrMove(creep, () => creep.upgradeController(controller), controller);
      return;
    }

    if (!target) return;
    this.actionOrMove(creep, () => creep.build(target), target);
  }

  private doCollect(creep: BuilderCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_STORAGE:
          case STRUCTURE_CONTAINER:
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
          default:
            return false;
        }
      }
    });
    if (!target) {
      const buildFlag = Object.values(Game.flags).find(flag => flag.name === "build");
      if (!buildFlag) return;
      const source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
      if (!source) return;
      this.actionOrMove(creep, () => creep.harvest(source), source);
      return;
    }
    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

export const builderService = new BuilderService(builderRepository, findRepository);

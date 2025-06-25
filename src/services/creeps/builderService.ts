import { IRepository, builderRepository, findRepository, IFindRepository } from "repositories";
import { findFlag, getUniqueId, recordCountToArray } from "utils";
import { ABaseService, roomServiceConfig, TSpawnCreepResponse } from "services";
import { BuilderCreep, BuilderMemory, BuilderState, CreepBodyPart, CreepRole, FlagType } from "models";

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
    const builder = roomServiceConfig[spawn.room.name]?.builder || roomServiceConfig.default?.builder;

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
      filter: flag => flag.name.startsWith("builder,boost")
    });
    if (!boostFlag) return;
    const lab = boostFlag.pos.lookFor(LOOK_STRUCTURES)[0] as StructureLab | undefined;
    if (!lab) return;
    const err = this.actionOrMove(creep, () => lab.unboostCreep(creep), lab);
  }

  private doBoost(creep: BuilderCreep): void {
    const [boostFlag] = creep.room.find(FIND_FLAGS, {
      filter: flag => flag.name.startsWith("builder,boost")
    });
    if (!boostFlag) return;
    const lab = boostFlag.pos.lookFor(LOOK_STRUCTURES)[0] as StructureLab | undefined;
    if (!lab) return;

    const err = this.actionOrMove(creep, () => lab.boostCreep(creep), lab);

    if (err !== ERR_NOT_IN_RANGE) {
      // TODO Creep tries to boost immediately after starting to spawn and fails
      creep.memory.state = BuilderState.Collecting;
    }
  }

  private doBuild(creep: BuilderCreep): void {
    // const road = creep.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_ROAD);
    // if (road && road.hits < road.hitsMax) {
    //   this.actionOrMove(creep, () => creep.repair(road), road);
    //   return;
    // }

    // const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
    //   filter: structure => {
    //     switch (structure.structureType) {
    //       case STRUCTURE_CONTAINER:
    //         return structure.hits < structure.hitsMax;
    //       default:
    //         return false;
    //     }
    //   }
    // });

    // if (container) {
    //   this.actionOrMove(creep, () => creep.repair(container), container);
    //   return;
    // }
    const buildFlag = findFlag(FlagType.Build);
    const targetPos = buildFlag?.pos || creep.pos;
    if (buildFlag && targetPos.roomName !== creep.room.name) {
      this.move(creep, targetPos);
      return;
    }

    const originalRoom = (Game.getObjectById(creep.memory.spawnId) as StructureSpawn).pos;

    if (!buildFlag && targetPos.roomName !== originalRoom.roomName) {
      this.move(creep, originalRoom);
      return;
    }

    // const terminal = creep.room.terminal;
    // if (terminal) {
    //   this.actionOrMove(creep, () => creep.transfer(terminal, RESOURCE_ENERGY), terminal);
    //   return;
    // }

    const target = targetPos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
      filter: site => {
        switch (site.structureType) {
          default:
            return true;
        }
      }
    });

    const controller = creep.room.controller;
    if (controller && controller.my && (!target || controller.ticksToDowngrade < 1000)) {
      this.actionOrMove(creep, () => creep.upgradeController(controller), controller);
      return;
    }

    if (!target) {
      if (buildFlag) {
        buildFlag.remove();
      }
      return;
    }
    this.actionOrMove(creep, () => creep.build(target), target);
  }

  private doRepair(creep: BuilderCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_RAMPART:
          case STRUCTURE_WALL:
            return structure.hits < 100000;
          default:
            return false;
        }
      }
    });
    if (!target) return;
    this.actionOrMove(creep, () => creep.repair(target), target);
  }
  private doCollect(creep: BuilderCreep): void {
   const buildFlag = findFlag(FlagType.Build);
    const targetPos = buildFlag?.pos || creep.pos;
    if (buildFlag && targetPos.roomName !== creep.room.name) {
      this.move(creep, targetPos);
      return;
    }

    const originalRoom = (Game.getObjectById(creep.memory.spawnId) as StructureSpawn).pos;

    if (!buildFlag && targetPos.roomName !== originalRoom.roomName) {
      this.move(creep, originalRoom);
      return;
    }


    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_STORAGE:
          case STRUCTURE_CONTAINER:
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity(RESOURCE_ENERGY);
          default:
            return false;
        }
      }
    });

    const groundResource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
      filter: resource => resource.resourceType === RESOURCE_ENERGY
    });
    if (groundResource) {
      this.actionOrMove(creep, () => creep.pickup(groundResource), groundResource);
      return;
    }

    const ruin = creep.pos.findClosestByRange(FIND_RUINS, {
      filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });

    if (ruin) {
      this.actionOrMove(creep, () => creep.withdraw(ruin, RESOURCE_ENERGY), ruin);
      return;
    }

    if (!target) {
      const buildFlag = findFlag(FlagType.Build);
      if (!buildFlag) return;
      const source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);

      if (!source) return;

      const err = this.actionOrMove(creep, () => creep.harvest(source), source);
      return;
    }

    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

export const builderService = new BuilderService(builderRepository, findRepository);

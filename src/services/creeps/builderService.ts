import { IRepository, builderRepository, findRepository, IFindRepository } from "repositories";
import { findFlag, findFlags, getLabs, getUniqueId, recordCountToArray, throttleTicks } from "utils";
import { ABaseService, roomServiceConfig, TSpawnCreepResponse } from "services";
import { BuilderCreep, BuilderMemory, BuilderState, CreepBodyPart, CreepRole, FlagType } from "models";
import profiler from "utils/profiler";

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
    if (!throttleTicks(10)) return false;
    const { builder } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const creepCount = this.builderRepository.countCreepsInSpawn(spawn.id);
    return creepCount < (builder?.maxCreeps ?? 1);
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const builderName = `builder-${spawn.name}-${getUniqueId()}`;
    const builder = roomServiceConfig[spawn.room.name]?.builder || roomServiceConfig.default?.builder;

    const res = spawn.spawnCreep(recordCountToArray(builder!.bodyParts), builderName, {
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
    const skCreep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
      filter: (sk: Creep) => creep.pos.getRangeTo(sk) < 6
    });
    if (skCreep) {
      creep.fleeFrom([skCreep], 6);
      return;
    }
    const skLair = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
      filter: sk =>
        sk.structureType === STRUCTURE_KEEPER_LAIR &&
        creep.pos.getRangeTo(sk) < 6 &&
        sk.ticksToSpawn &&
        sk.ticksToSpawn < 10
    });

    if (skLair) {
      creep.fleeFrom([skLair], 6);
      return;
    }
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
        if (creep.store.getFreeCapacity() === 0) {
          this.doCollect(creep);
        } else {
          this.doBuild(creep);
        }
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
    if (creep.spawning) return;
    const boostLab = getLabs(creep.room.name).find(
      x => x.mineral === "XGH2O" && x.lab.store.getUsedCapacity(x.mineral) > creep.getActiveBodyparts(WORK) * 30
    );
    if (!boostLab) return;

    const err = this.actionOrMove(creep, () => boostLab.lab.boostCreep(creep), boostLab.lab);

    if (err !== ERR_NOT_IN_RANGE) {
      // TODO Creep tries to boost immediately after starting to spawn and fails
      creep.memory.state = BuilderState.Collecting;
    }
  }

  private doBuild(creep: BuilderCreep): void {
    // const rampart = Game.getObjectById("685bf1cb20ced15ea441d51b") as StructureRampart;
    // if (rampart) {
    //   this.actionOrMove(creep, () => creep.repair(rampart), rampart);
    //   return;
    // }
    // const repairTaget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
    //   filter: structure => {
    //     switch (structure.structureType) {
    //       case STRUCTURE_ROAD:
    //       case STRUCTURE_CONTAINER:
    //         return structure.hits < structure.hitsMax;
    //       default:
    //         return false;
    //     }
    //   }
    // });

    // if (repairTaget) {
    //   this.actionOrMove(creep, () => creep.repair(repairTaget), repairTaget);
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
    const originalRoom = (Game.getObjectById(creep.memory.spawnId) as StructureSpawn).pos;

    if (
      !creep.room.find(FIND_FLAGS, { filter: flag => flag.name.startsWith(FlagType.Build) })[0] &&
      creep.room.name !== originalRoom.roomName
    ) {
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

    const ruin = creep.pos.findClosestByRange(FIND_RUINS, {
      filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });

    if (ruin) {
      this.actionOrMove(creep, () => creep.withdraw(ruin, RESOURCE_ENERGY), ruin);
      return;
    }

    const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tombstone => tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && tombstone.pos.getRangeTo(creep) < 3
    });

    if (tombstone) {
      this.actionOrMove(creep, () => creep.withdraw(tombstone, RESOURCE_ENERGY), tombstone);
      return;
    }

    if (!target) {
      const buildFlag = findFlag(FlagType.Build);
      if (!buildFlag) return;
      const source = buildFlag.pos.findClosestByRange(FIND_SOURCES_ACTIVE);

      if (!source) return;

      const err = this.actionOrMove(creep, () => creep.harvest(source), source);
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) < 21) {
        creep.fleeFrom([source], 2);
      }
      return;
    }

    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

profiler.registerClass(BuilderService, "BuilderService");

export const builderService = new BuilderService(builderRepository, findRepository);

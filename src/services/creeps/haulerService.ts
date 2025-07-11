import { CreepRole, FlagType, HaulerCreep, HaulerMemory, HaulerState } from "models";
import { findRepository, haulerRepository, IFindRepository, IHaulerRepository, THaulerContainer } from "repositories";
import { ABaseService, roomServiceConfig, TSpawnCreepResponse } from "services";
import { calculateBodyCost, findFlag, getCreepConfigPerRoom, getUniqueId, recordCountToArray } from "utils";
import profiler from "utils/profiler";

export class HaulerService extends ABaseService<HaulerCreep> {
  MIN_CREEPS_TTL = 60;
  MAX_CREEPS_PER_CONTAINER = 2;
  public constructor(private haulerRepository: IHaulerRepository, private findRepository: IFindRepository) {
    super(haulerRepository);
  }

  override execute(hauler: HaulerCreep): void {
    if (hauler.spawning) return;
    this.updateHaulerState(hauler);
    this.executeHaulerState(hauler);
  }

  override needMoreCreeps(): boolean {
    return this.findRepository.findAvailableHaulerContainers().length > 0;
  }

  getBodyNeededForContainer(source: THaulerContainer): { body: BodyPartConstant[]; energy: number } {
    const room = source.room || ({ name: "" } as Room);
    const { bodyParts } = getCreepConfigPerRoom(CreepRole.Hauler, room);
    const body = recordCountToArray(bodyParts);
    const energy = calculateBodyCost(body);
    return { body, energy };
  }

  override spawn(): TSpawnCreepResponse {
    const haulerContainers = this.findRepository.findAvailableHaulerContainers();
    for (const haulerContainer of haulerContainers) {
      const name = `hauler-${haulerContainer.room?.name}-${getUniqueId()}`;

      const { body, energy } = this.getBodyNeededForContainer(haulerContainer);
      const closestAvailableSpawn = this.findRepository.findClosestAvailableSpawnOfTarget(haulerContainer, energy);
      if (!closestAvailableSpawn) return ERR_BUSY;

      closestAvailableSpawn.spawnCreep(body, name, {
        memory: {
          role: CreepRole.Hauler,
          spawnId: closestAvailableSpawn.id,
          state: HaulerState.Collecting,
          containerTargetId: haulerContainer.id
        } as HaulerMemory
      });
    }

    return OK;
  }

  private updateHaulerState(creep: HaulerCreep): void {
    switch (creep.memory.state) {
      case HaulerState.Transferring:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.state = HaulerState.Collecting;
        }
        break;
      case HaulerState.Collecting:
        if (creep.store.getFreeCapacity() === 0) {
          creep.memory.state = HaulerState.Transferring;
        }
        break;
      case HaulerState.Repairing:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.state = HaulerState.Transferring;
        } else {
          const needsRepair = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
              switch (structure.structureType) {
                case STRUCTURE_ROAD:
                case STRUCTURE_CONTAINER:
                  return structure.hits < structure.hitsMax;
                default:
                  return false;
              }
            }
          });
          if (needsRepair.length === 0) {
            creep.memory.state = HaulerState.Transferring;
          }
        }
        break;
      case HaulerState.Recycling:
        break;
      default:
        creep.memory.state = HaulerState.Collecting;
    }

    if ((creep.ticksToLive || this.MIN_CREEPS_TTL) < this.MIN_CREEPS_TTL) {
      creep.memory.state = HaulerState.Recycling;
    }
  }

  private executeHaulerState(creep: HaulerCreep): void {
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
      case HaulerState.Transferring:
        this.doTransfer(creep);
        break;
      case HaulerState.Collecting:
        this.doCollect(creep);
        break;
      case HaulerState.Repairing:
        this.doRepair(creep);
        break;
      case HaulerState.Recycling:
        this.doRecycle(creep);
        break;
    }
  }

  private doRepair(creep: HaulerCreep): void {
    const needsRepair = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_ROAD:
          case STRUCTURE_CONTAINER:
            return structure.hits < structure.hitsMax;
          default:
            return false;
        }
      }
    });
    if (!needsRepair) return;
    this.actionOrMove(creep, () => creep.repair(needsRepair), needsRepair);
  }
  private doTransfer(creep: HaulerCreep): void {
    const spawn: StructureSpawn | null = Game.getObjectById(creep.memory.spawnId);
    if (!spawn) return;
    const originRoom = spawn.room;

    if (!originRoom) return;

    if (creep.room.name !== originRoom.name) {
      this.move(creep, spawn);
      return;
    }

    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_LINK:
            return (
              creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          case STRUCTURE_STORAGE:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;

          default:
            return false;
        }
      }
    });

    if (!target) return;

    // if (!target) {
    //   const [buildStructure] = originRoom.find(FIND_CONSTRUCTION_SITES);
    //   if (buildStructure) {
    //     this.actionOrMove(creep, () => creep.build(buildStructure), buildStructure);
    //   } else if (originRoom.controller) {
    //     this.actionOrMove(creep, () => creep.upgradeController(originRoom.controller!), originRoom.controller);
    //   }
    //   return;
    // }

    for (const resourceType in creep.store) {
      this.actionOrMove(creep, () => creep.transfer(target, resourceType as ResourceConstant), target);
    }
  }

  private doCollect(creep: HaulerCreep): void {
    const target: StructureContainer | null = (creep.memory.containerTargetId &&
      Game.getObjectById(creep.memory.containerTargetId)) as any;
    if (!target) {
      const haulerFlag = findFlag(FlagType.HaulerContainer);
      if (haulerFlag) {
        creep.travelTo(haulerFlag);
      }
      return;
    }

    const droppedResource = target.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
      filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.pos.getRangeTo(target) < 4
    });
    if (droppedResource) {
      this.actionOrMove(creep, () => creep.pickup(droppedResource), droppedResource);
      return;
    }

    const tombstone = target.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tomb => Object.keys(tomb.store).length > 0 && tomb.pos.getRangeTo(target) < 4
    });

    if (tombstone) {
      for (const resourceType in tombstone.store) {
        this.actionOrMove(creep, () => creep.withdraw(tombstone, resourceType as ResourceConstant), tombstone);
      }
      return;
    }

    for (const resourceType in target.store) {
      this.actionOrMove(creep, () => creep.withdraw(target, resourceType as ResourceConstant), target);
    }
  }
}
profiler.registerClass(HaulerService, "HaulerService");

export const haulerService = new HaulerService(haulerRepository, findRepository);

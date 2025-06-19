import {
  IHaulerRepository,
  HaulerCreep,
  HaulerMemory,
  haulerRepository,
  HaulerState
} from "repositories/haulerRepository";
import { ABaseService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
import { getUniqueId, recordCountToArray } from "utils";
import { findRepository, IFindRepository } from "repositories/findRepository";
import { roomServiceConfig } from "./roomServiceConfig";
class HaulerService extends ABaseService<HaulerCreep> {
  MIN_CREEPS_TTL = 60;
  MAX_CREEPS_PER_CONTAINER = 2;
  public constructor(private haulerRepository: IHaulerRepository, private findRepository: IFindRepository) {
    super(haulerRepository);
  }

  override execute(hauler: HaulerCreep): void {
    this.assignSource(hauler);
    this.updateHaulerState(hauler);
    this.executeHaulerState(hauler);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const { hauler } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const creepCount = this.haulerRepository.countCreepsInSpawn(spawn.id);
    const containerFlags = Object.values(Game.flags).filter(flag => flag.name === "hauler_container").length;
    const maxCreeps = containerFlags * (hauler?.maxCreepsPerSource || 1);
    return creepCount < maxCreeps;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const name = `hauler-${spawn.name}-${getUniqueId()}`;
    const { hauler } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const res = spawn.spawnCreep(recordCountToArray(hauler!.bodyParts), name, {
      memory: {
        role: CreepRole.Hauler,
        spawnId: spawn.id,
        state: HaulerState.Collecting
      } as HaulerMemory
    });

    return res as TSpawnCreepResponse;
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
          creep.memory.state = HaulerState.Repairing;
        }
        break;
      case HaulerState.Repairing:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.state = HaulerState.Collecting;
        } else {
          const needsRepair = creep.room.find(FIND_STRUCTURES, {
            filter: structure => {
              switch (structure.structureType) {
                case STRUCTURE_ROAD:
                  return structure.hits < structure.hitsMax;
                default:
                  return "my" in structure && structure.my && structure.hits < structure.hitsMax;
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
            return structure.hits < structure.hitsMax;
          default:
            return "my" in structure && structure.my && structure.hits < structure.hitsMax;
        }
      }
    });

    if (!needsRepair) return;
    this.actionOrMove(creep, () => creep.repair(needsRepair), needsRepair);
  }
  private doTransfer(creep: HaulerCreep): void {
    const originRoom = Game.spawns[creep.memory.spawnId].room;

    if (!originRoom) return;

    const [target] = originRoom.find(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
          case STRUCTURE_LAB:
            return (
              creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          case STRUCTURE_TERMINAL:
            const terminalId = creep.room.terminal?.id;
            const transaction = global.getTransaction(terminalId);
            if (!transaction) return false;
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) < transaction.energyNeeded;
          case STRUCTURE_STORAGE:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;

          case STRUCTURE_TOWER:
            return (
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY) &&
              creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          default:
            return false;
        }
      }
    });

    if (!target) return;

    this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
  }
  private assignSource(creep: HaulerCreep): void {
    if (creep.memory.containerTargetId) return;
    const { hauler } = roomServiceConfig[Game.spawns[creep.memory.spawnId].room.name] || roomServiceConfig.default;

    const sources = this.findRepository.findHaulerContainers(hauler?.maxCreepsPerSource ?? 1);

    if (sources[0]) {
      creep.memory.containerTargetId = sources[0].id;
    }
  }

  private doCollect(creep: HaulerCreep): void {
    const target: any = creep.memory.containerTargetId && Game.getObjectById(creep.memory.containerTargetId);
    if (!target) return;
    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

export const haulerService = new HaulerService(haulerRepository, findRepository);

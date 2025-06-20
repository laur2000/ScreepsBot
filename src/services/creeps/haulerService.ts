import { CreepRole, HaulerCreep, HaulerMemory, HaulerState } from "models";
import { findRepository, haulerRepository, IFindRepository, IHaulerRepository, THaulerContainer } from "repositories";
import { ABaseService, roomServiceConfig, TSpawnCreepResponse } from "services";
import { getCreepConfigPerRoom, getUniqueId, recordCountToArray } from "utils";

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

  override spawn(): TSpawnCreepResponse {
    const name = `hauler-${getUniqueId()}`;
    const haulerContainers = this.findRepository.findAvailableHaulerContainers();
    for (const haulerContainer of haulerContainers) {
      const result = this.findRepository.findClosestSpawnOfTarget(haulerContainer);
      if (!result) return ERR_BUSY;

      const { closestSpawn, closestAvailableSpawn } = result;

      const haulerConfig = getCreepConfigPerRoom(CreepRole.Hauler, closestAvailableSpawn.room);

      closestAvailableSpawn.spawnCreep(recordCountToArray(haulerConfig.bodyParts), name, {
        memory: {
          role: CreepRole.Hauler,
          spawnId: closestSpawn.id,
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
          case STRUCTURE_CONTAINER:
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
    const spawn: StructureSpawn | null = Game.getObjectById(creep.memory.spawnId);
    if (!spawn) return;
    const originRoom = spawn.room;

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

  private doCollect(creep: HaulerCreep): void {
    const target: any = creep.memory.containerTargetId && Game.getObjectById(creep.memory.containerTargetId);
    if (!target) return;
    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }
}

export const haulerService = new HaulerService(haulerRepository, findRepository);

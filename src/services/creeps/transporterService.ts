import { CreepRole, FlagType, TransporterCreep, TransporterMemory, TransporterState } from "models";
import { findRepository, IFindRepository, ITransporterRepository, transporterRepository } from "repositories";
import { ABaseService, TSpawnCreepResponse, roomServiceConfig } from "services";
import {
  findFlag,
  findFlags,
  getLabs,
  getLabsBy,
  getUniqueId,
  isTombstone,
  measureCpu,
  recordCountToArray,
  throttleTicks
} from "utils";
import { CacheFor } from "utils/cache";
import profiler from "utils/profiler";

class TransporterService extends ABaseService<TransporterCreep> {
  MIN_CREEPS_TTL = 60;
  MAX_CREEPS_PER_CONTAINER = 1;
  public constructor(private transporterRepository: ITransporterRepository, private findRepository: IFindRepository) {
    super(transporterRepository);
  }

  override execute(transporter: TransporterCreep): void {
    this.updateTransporterState(transporter);
    this.executeTransporterState(transporter);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    if (!throttleTicks(10)) return false;
    const { transporter } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const creepCount = this.transporterRepository.countCreepsInSpawn(spawn.id);
    const containersCount = this.findRepository.containersCount(spawn.room);
    const containerFlags = findFlags(FlagType.Container).length;
    const maxCreeps = (containerFlags + containersCount) * this.MAX_CREEPS_PER_CONTAINER;
    return creepCount < (transporter?.maxCreeps ?? 1);
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const name = `transporter-${spawn.name}-${getUniqueId()}`;
    const transporter = roomServiceConfig[spawn.room.name]?.transporter || roomServiceConfig.default.transporter;

    const res = spawn.spawnCreep(recordCountToArray(transporter!.bodyParts), name, {
      memory: {
        role: CreepRole.Transporter,
        spawnId: spawn.id,
        state: TransporterState.Collecting
      } as TransporterMemory
    });

    return res as TSpawnCreepResponse;
  }

  private updateTransporterState(creep: TransporterCreep): void {
    switch (creep.memory.state) {
      case TransporterState.Transferring:
        if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
          creep.memory.targetId = null;
          creep.memory.resource = null;
          creep.memory.state = TransporterState.Collecting;
        }
        break;
      case TransporterState.Collecting:
        if (creep.store.getFreeCapacity() === 0) {
          creep.memory.targetId = null;
          creep.memory.resource = null;
          creep.memory.state = TransporterState.Transferring;
        }
        break;
      case TransporterState.Recycling:
        break;
      default:
        creep.memory.state = TransporterState.Collecting;
    }

    if ((creep.ticksToLive || this.MIN_CREEPS_TTL) < this.MIN_CREEPS_TTL) {
      creep.memory.state = TransporterState.Recycling;
    }
  }

  private executeTransporterState(creep: TransporterCreep): void {
    switch (creep.memory.state) {
      case TransporterState.Transferring:
        this.doTransfer(creep);
        break;
      case TransporterState.Collecting:
        this.doCollect(creep);
        break;
      case TransporterState.Recycling:
        if ((creep.ticksToLive ?? 0) < 10) {
          this.doTransfer(creep);
        } else if (creep.store.getFreeCapacity() < 3) {
          this.doCollect(creep);
        } else {
          this.doTransfer(creep);
        }
        break;
    }
  }

  private getTarget(creep: TransporterCreep): Structure | null {
    const target = creep.findClosestByPriority([FIND_STRUCTURES], {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
          case STRUCTURE_LAB:
            return (
              creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          case STRUCTURE_TERMINAL:
            if (creep.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0) return true;
            const terminalId = creep.room.terminal?.id;
            const transaction = global.getTransaction(terminalId);
            if (!transaction) return false;
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) < transaction.energyNeeded;
          case STRUCTURE_STORAGE:
            return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;

          case STRUCTURE_TOWER:
            return (
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 100 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          case STRUCTURE_FACTORY:
            const factoryFlags = findFlags(FlagType.Factory, creep.room.name);
            for (const flag of factoryFlags) {
              const [_, resource, amount] = flag.name.split(",") as [string, ResourceConstant, number];
              if (
                structure.store.getFreeCapacity(resource) > 0 &&
                structure.store.getUsedCapacity(resource) < amount &&
                creep.store.getUsedCapacity(resource) > 0
              ) {
                return true;
              }
            }
            return false;
          default:
            return false;
        }
      },
      priority: structure => {
        const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
            return 1;
          case STRUCTURE_TERMINAL:
            return 2;
          case STRUCTURE_LAB:
            return 4;
          case STRUCTURE_TOWER:
            return hostileCreeps.length > 0 ? 0 : 5;
          case STRUCTURE_FACTORY:
            return 6;
          case STRUCTURE_STORAGE:
            return 10;

          default:
            return 1000;
        }
      }
    });
    return target || null;
  }
  private doTransfer(creep: TransporterCreep): void {
    let { targetId, resource } = creep.memory;
    if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
      console.log("transferring");
    }
    if (targetId && resource) {
      const target = Game.getObjectById(targetId) as Structure | null;
      if (target) {
        const result = this.actionOrMove(creep, () => creep.transfer(target, resource as ResourceConstant), target);
        if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
          console.log("transferred", target, resource, result);
        }
        if (result === ERR_NOT_IN_RANGE) return;

        creep.memory.targetId = null;
        creep.memory.resource = null;
      }
    }

    const assignTarget = () => {
      const transportRequest = this.getTransportRequest(creep.room.name);

      if (transportRequest && creep.store.getUsedCapacity(transportRequest.resource) > 0) {
        creep.memory.targetId = transportRequest.target.id;
        creep.memory.resource = transportRequest.resource;
        // this.actionOrMove(
        //   creep,
        //   () => creep.transfer(transportRequest.target, transportRequest.resource),
        //   transportRequest.target
        // );
        return;
      }
      const labs = getLabs(creep.room.name);

      for (const { lab, mineral } of labs) {
        if (
          lab.store.getFreeCapacity(mineral) > creep.store.getUsedCapacity(mineral) &&
          creep.store.getUsedCapacity(mineral) > 0
        ) {
          creep.memory.targetId = lab.id;
          creep.memory.resource = mineral;
          // this.actionOrMove(creep, () => creep.transfer(lab, mineral), lab);
          return;
        }
      }

      // const lab = Game.getObjectById("68603ad225bbf972127e05e5") as StructureLab;
      // // if (lab && creep.store.getUsedCapacity(RESOURCE_OXYGEN) > 0 && lab.store.getFreeCapacity(RESOURCE_OXYGEN) > 0) {
      // //   this.actionOrMove(creep, () => creep.transfer(lab, RESOURCE_OXYGEN), lab);
      // //   // this.actionOrMove(creep, () => creep.transfer(lab, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE), lab);
      // //   // const c = Game.creeps["healer-7ebn9km13oo"];

      // //   // lab.boostCreep(c);
      // //   return;
      // // }

      // if (lab && creep.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0 && lab.store.getFreeCapacity(RESOURCE_HYDROGEN) > 0) {
      //   this.actionOrMove(creep, () => creep.transfer(lab, RESOURCE_HYDROGEN), lab);
      //   // this.actionOrMove(creep, () => creep.transfer(lab, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE), lab);
      //   // const c = Game.creeps["healer-7ebn9km13oo"];

      //   // lab.boostCreep(c);
      //   return;
      // }

      const orders = this.getSellOrders(creep);

      for (const order of orders) {
        const terminal = creep.room.terminal;
        if (!terminal) break;
        const { remainingAmount, resourceType } = order;
        if (
          terminal.store.getUsedCapacity(resourceType as ResourceConstant) < remainingAmount &&
          creep.store.getUsedCapacity(resourceType as ResourceConstant) > 0
        ) {
          creep.memory.targetId = terminal.id;
          creep.memory.resource = resourceType;
          // this.actionOrMove(creep, () => creep.transfer(terminal, resourceType as ResourceConstant), terminal);
          return;
        }
      }

      const target = this.getTarget(creep);
      if (!target) return;

      if (target.structureType === STRUCTURE_FACTORY) {
        const factoryFlags = findFlags(FlagType.Factory, creep.room.name);
        for (const flag of factoryFlags) {
          const [_, resource, amount] = flag.name.split(",") as [string, ResourceConstant, number];
          if (
            (target as StructureFactory).store.getFreeCapacity(resource) > 0 &&
            (target as StructureFactory).store.getUsedCapacity(resource) < amount &&
            creep.store.getUsedCapacity(resource) > 0
          ) {
            creep.memory.targetId = target.id;
            creep.memory.resource = resource;
            // this.actionOrMove(creep, () => creep.transfer(target, resource), target);
            return;
          }
        }
      }

      for (const resourceType in creep.store) {
        if (creep.store.getUsedCapacity(resourceType as ResourceConstant) > 0) {
          creep.memory.targetId = target.id;
          creep.memory.resource = resourceType;
          // this.actionOrMove(creep, () => creep.transfer(target, resourceType as ResourceConstant), target);
          return;
        }
      }
    };

    assignTarget();

    targetId = creep.memory.targetId;
    resource = creep.memory.resource;

    if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
      console.log("target reassigned");
    }
    if (targetId && resource) {
      const target = Game.getObjectById(targetId) as Structure | null;
      if (target) {
        const result = this.actionOrMove(creep, () => creep.transfer(target, resource as ResourceConstant), target);
        if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
          console.log("transferred", target, resource, result);
        }
        if (result === ERR_NOT_IN_RANGE) return;

        creep.memory.targetId = null;
        creep.memory.resource = null;
      }
    }
  }

  private getSellOrders(creep: TransporterCreep) {
    const terminal = creep.room.terminal;
    if (!terminal) return [];

    // const mySellOrders = Game.market.getAllOrders({
    //   roomName: creep.room.name,
    //   type: ORDER_SELL
    // });

    const mySellOrders = [Game.market.getOrderById("687b7544af4edf0012568bce")].filter(order => !!order);
    return mySellOrders as Order[];
  }

  private getTransportRequest(roomName: string) {
    const transportFlags = findFlags(FlagType.Transport, roomName);

    for (const flag of transportFlags) {
      const [_, resource, amount] = flag.name.split(",") as [string, ResourceConstant, number];
      const target = flag.pos.lookFor(LOOK_STRUCTURES).find(structure => {
        switch (structure.structureType) {
          case STRUCTURE_TERMINAL:
            if (
              resource === RESOURCE_ENERGY &&
              (structure as StructureTerminal).store.getUsedCapacity(RESOURCE_ENERGY) < 13000
            )
              return false;
          case STRUCTURE_FACTORY:
          case STRUCTURE_STORAGE:
          case STRUCTURE_LINK:
          case STRUCTURE_CONTAINER:
          case STRUCTURE_LAB:
            return (
              (structure as any).store.getFreeCapacity(resource) > 0 &&
              (structure as any).store.getUsedCapacity(resource) < amount
            );
          default:
            return false;
        }
      });

      if (target) {
        return {
          target: target as Structure,
          resource,
          amount
        };
      }
    }

    return null;
  }

  private findClosestTargetForTransportRequest(
    creepName: string,
    transportRequestId: string,
    resource: ResourceConstant
  ) {
    const creep = Game.creeps[creepName];
    return creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        if (structure.id === transportRequestId) return false;
        switch (structure.structureType) {
          case STRUCTURE_TERMINAL:
            if (
              resource === RESOURCE_ENERGY &&
              (structure as StructureTerminal).store.getUsedCapacity(RESOURCE_ENERGY) < 13000
            )
              return false;
          case STRUCTURE_LAB:
            if (resource === RESOURCE_ENERGY) return false;
          case STRUCTURE_STORAGE:
          case STRUCTURE_LINK:
          case STRUCTURE_CONTAINER:
          case STRUCTURE_FACTORY:
            const usedAmount = structure.store.getUsedCapacity(resource) || 0;
            return usedAmount > 0;

          default:
            return false;
        }
      }
    });
  }

  private assignCollectTarget(creep: TransporterCreep): void {
    const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tombstone => {
        const dist = creep.pos.getRangeTo(tombstone);
        if (dist > 3) return false;

        for (const rs in tombstone.store) {
          if (
            tombstone.store.getUsedCapacity(rs as ResourceConstant) > 0 &&
            creep.store.getFreeCapacity(rs as ResourceConstant) > 0
          ) {
            return true;
          }
        }
        return false;
      }
    });

    if (tombstone) {
      creep.memory.targetId = tombstone.id;
      creep.memory.resource = Object.keys(tombstone.store)[0];
      return;
    }

    let resource = null;
    const target = creep.findClosestByPriority([FIND_STRUCTURES], {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_LINK:
            const isContainer = Memory.links?.[structure.id]?.isContainer ?? false;
            if (!isContainer) return false;

            if (
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
              creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            ) {
              resource = RESOURCE_ENERGY;
              return true;
            }
            return false;
          case STRUCTURE_CONTAINER:
            for (const rs in structure.store) {
              if (
                structure.store.getUsedCapacity(rs as ResourceConstant) > structure.store.getCapacity() &&
                creep.store.getFreeCapacity() === creep.store.getCapacity()
              ) {
                resource = rs;
                return true;
              }
            }
            return false;
          case STRUCTURE_TERMINAL:
          case STRUCTURE_FACTORY:
            if (
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 13000 &&
              creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            ) {
              resource = RESOURCE_ENERGY;
              return true;
            }
            return false;
          case STRUCTURE_STORAGE:
            if (
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
              creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            ) {
              resource = RESOURCE_ENERGY;
              return true;
            }
            return false;
          case STRUCTURE_LAB:
            const roomLabs = creep.room.find(FIND_STRUCTURES, {
              filter: structure => structure.structureType === STRUCTURE_LAB
            }) as StructureLab[];

            for (const lab of roomLabs) {
              const labFlag = lab.pos.lookFor(LOOK_FLAGS)[0];
              if (labFlag) continue;
              for (const rs in lab.store) {
                if (
                  lab.store.getUsedCapacity(rs as MineralConstant) > 0 &&
                  creep.store.getFreeCapacity(rs as MineralConstant) > 0
                ) {
                  resource = rs;
                  return true;
                }
              }
            }
            return false;

          default:
            return false;
        }
      },
      priority: structure => {
        switch (structure.structureType) {
          case STRUCTURE_LINK:
            return 0;
          case STRUCTURE_LAB:
            return 2;
          case STRUCTURE_CONTAINER:
            return 3;
          case STRUCTURE_TERMINAL:
            return 4;
          case STRUCTURE_FACTORY:
            return 5;
          case STRUCTURE_STORAGE:
            const areEnemiesPresent = creep.room.find(FIND_HOSTILE_CREEPS).length > 0;
            if (areEnemiesPresent) return 1;
            return 6;
          default:
            return 10000;
        }
      }
    });

    if (target) {
      creep.memory.targetId = target.id;
      creep.memory.resource = resource;
      return;
    }
    console.log("[WARNING] No target to collect for: ", creep.name);
  }

  private assignTransferTarget(creep: TransporterCreep): void {
    let resource = null;
    const target = creep.findClosestByPriority([FIND_STRUCTURES], {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
          case STRUCTURE_SPAWN:
          case STRUCTURE_TOWER:
          case STRUCTURE_LAB:
            if (
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
              creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            ) {
              resource = RESOURCE_ENERGY;
              return true;
            }
          case STRUCTURE_TERMINAL:
            if (
              structure.store.getUsedCapacity(RESOURCE_ENERGY) < 10000 &&
              creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            ) {
              resource = RESOURCE_ENERGY;
              return true;
            }
            return false;
          case STRUCTURE_STORAGE:
            if (structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return false;
            for (const rs in creep.store) {
              resource = rs;
              return true;
            }
            return false;
          default:
            return false;
        }
      },
      priority: structure => {
        switch (structure.structureType) {
          case STRUCTURE_EXTENSION:
            return 1;
          case STRUCTURE_SPAWN:
            return 2;
          case STRUCTURE_TOWER:
            return 3;
          case STRUCTURE_LAB:
            return 5;
          case STRUCTURE_TERMINAL:
            return 4;
          case STRUCTURE_STORAGE:
            return 6;
          default:
            return 10000;
        }
      }
    });

    if (target) {
      creep.memory.targetId = target.id;
      creep.memory.resource = resource;
      return;
    }
    console.log("[WARNING] No target to transfer for: ", creep.name);
  }

  private doCollectTarget(creep: TransporterCreep): void {
    if (!creep.memory.targetId) {
      this.assignCollectTarget(creep);
    }

    if (!creep.memory.targetId) return;

    const target = Game.getObjectById(creep.memory.targetId) as Structure | Tombstone | null;
    const resource = creep.memory.resource as ResourceConstant | null;
    if (!target || !resource) return;

    const result = this.actionOrMove(creep, () => creep.withdraw(target, resource), target);
    if (result !== ERR_NOT_IN_RANGE) {
      creep.memory.targetId = null;
      creep.memory.resource = null;
    }
  }

  private doTransferTarget(creep: TransporterCreep): void {
    if (!creep.memory.targetId) {
      this.assignTransferTarget(creep);
    }

    if (!creep.memory.targetId) return;

    const target = Game.getObjectById(creep.memory.targetId) as Structure | null;
    const resource = creep.memory.resource as ResourceConstant | null;
    if (!target || !resource) return;

    const result = this.actionOrMove(creep, () => creep.transfer(target, resource), target);
    if (result !== ERR_NOT_IN_RANGE) {
      creep.memory.targetId = null;
    }
  }

  private doCollect(creep: TransporterCreep): void {
    // TODO refactor this collect into a more generic method
    const originalSpawn = Game.getObjectById(creep.memory.spawnId) as StructureSpawn;

    if (creep.room.name !== originalSpawn.room.name) {
      this.move(creep, originalSpawn);
      return;
    }

    let { targetId, resource } = creep.memory;
    if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
      console.log("collecting");
    }
    if (targetId && resource) {
      const target = Game.getObjectById(targetId) as Structure | null;
      if (target) {
        const result = this.actionOrMove(creep, () => creep.withdraw(target, resource as ResourceConstant), target);
        if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
          console.log("collected", target, resource, result);
        }
        if (result === ERR_NOT_IN_RANGE) return;
        creep.memory.targetId = null;
        creep.memory.resource = null;
      }
    }

    const assignTarget = () => {
      const linkTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_LINK:
              const isContainer = Memory.links?.[structure.id]?.isContainer ?? false;
              if (!isContainer) return false;
              return (
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0
              );
            default:
              return false;
          }
        }
      });

      if (linkTarget) {
        creep.memory.targetId = linkTarget.id;
        creep.memory.resource = RESOURCE_ENERGY;
        // this.actionOrMove(creep, () => creep.withdraw(linkTarget, RESOURCE_ENERGY), linkTarget);
        return;
      }
      // const enemyCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
      // const stayFlag = findFlag(FlagType.Stay);

      // if (enemyCreeps.length > 0 && stayFlag) {
      //   const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      //     filter: structure => {
      //       const distance = stayFlag.pos.getRangeTo(structure.pos);
      //       if (distance > 2) return false;
      //       switch (structure.structureType) {
      //         case STRUCTURE_STORAGE:
      //         case STRUCTURE_TERMINAL:
      //         case STRUCTURE_LINK:
      //           return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
      //         default:
      //           return false;
      //       }
      //     }
      //   }) as StructureStorage | StructureTerminal | null;
      //   if (!storage) {
      //     this.move(creep, stayFlag);
      //     return;
      //   }
      //   this.actionOrMove(creep, () => creep.withdraw(storage, RESOURCE_ENERGY), stayFlag);
      //   return;
      // }

      const transportRequest = this.getTransportRequest(creep.room.name);
      if (transportRequest) {
        const collectTarget = this.findClosestTargetForTransportRequest(
          creep.name,
          transportRequest.target.id,
          transportRequest.resource
        );

        if (collectTarget) {
          creep.memory.targetId = collectTarget.id;
          creep.memory.resource = transportRequest.resource;
          // this.actionOrMove(creep, () => creep.withdraw(collectTarget, transportRequest.resource), collectTarget);
          return;
        }
      }

      const labs = getLabs(creep.room.name);
      const outputLabs = getLabsBy({ roomName: creep.room.name, flagType: FlagType.Output });
      const allLabs = creep.room.find(FIND_STRUCTURES, {
        filter: structure => structure.structureType === STRUCTURE_LAB
      }) as StructureLab[];

      for (const labA of allLabs) {
        const flaggedLab = labs.find(({ lab }) => lab.id === labA.id);
        const [mineral] = Object.keys(labA.store).filter(x => x !== RESOURCE_ENERGY) as MineralConstant[];
        if (!flaggedLab && mineral && labA.store.getUsedCapacity(mineral) > creep.store.getFreeCapacity(mineral)) {
          creep.memory.targetId = labA.id;
          creep.memory.resource = mineral;
          // this.actionOrMove(creep, () => creep.withdraw(labA, mineral), labA);
          return;
        }
        if (flaggedLab && mineral && mineral !== flaggedLab.mineral && labA.store.getUsedCapacity(mineral) > 0) {
          creep.memory.targetId = labA.id;
          creep.memory.resource = mineral;
          // this.actionOrMove(creep, () => creep.withdraw(labA, mineral), labA);
          return;
        }

        const outputLab = outputLabs.find(({ lab }) => lab.id === labA.id);

        if (outputLab) {
          for (const mineral in labA.store) {
            if (mineral === RESOURCE_ENERGY) continue;

            if (labA.store.getUsedCapacity(mineral as ResourceConstant)! < creep.store.getCapacity()) continue;
            creep.memory.targetId = labA.id;
            creep.memory.resource = mineral;
            // this.actionOrMove(creep, () => creep.withdraw(labA, mineral as ResourceConstant), labA);
            return;
          }
        } else {
          const reactionFlags = findFlags(FlagType.Reaction).filter(flag => flag.room?.name === creep.room.name);

          if (
            !flaggedLab &&
            !reactionFlags.find(flag => flag.pos.lookFor(LOOK_STRUCTURES).find(structure => structure.id === labA.id))
          ) {
            for (const mineral in labA.store) {
              if (mineral === RESOURCE_ENERGY) continue;
              creep.memory.targetId = labA.id;
              creep.memory.resource = mineral;
              // this.actionOrMove(creep, () => creep.withdraw(labA, mineral as ResourceConstant), labA);
              return;
            }
          }
        }
      }

      const mineralContainer = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
              for (const { mineral } of labs) {
                if (structure.store.getUsedCapacity(mineral) > 0 && creep.store.getFreeCapacity(mineral)) return true;
              }
            case STRUCTURE_STORAGE:
            case STRUCTURE_TERMINAL:
              for (const { mineral, lab } of labs) {
                if (
                  lab.store.getFreeCapacity(mineral) > creep.store.getCapacity() &&
                  structure.store.getUsedCapacity(mineral) > 0
                )
                  return true;
              }
            default:
              return false;
          }
        }
      }) as StructureContainer | StructureStorage | StructureTerminal | null;

      if (mineralContainer) {
        if (mineralContainer.structureType === STRUCTURE_CONTAINER) {
          for (const { mineral } of labs) {
            if (mineralContainer.store.getUsedCapacity(mineral) > creep.store.getFreeCapacity(mineral)) {
              creep.memory.targetId = mineralContainer.id;
              creep.memory.resource = mineral;
              // this.actionOrMove(creep, () => creep.withdraw(mineralContainer, mineral), mineralContainer);
              return;
            }
          }
        } else {
          for (const { mineral, lab } of labs) {
            if (
              mineralContainer.store.getUsedCapacity(mineral) > 0 &&
              lab.store.getFreeCapacity(mineral) > creep.store.getFreeCapacity(mineral)
            ) {
              creep.memory.targetId = mineralContainer.id;
              creep.memory.resource = mineral;
              // this.actionOrMove(creep, () => creep.withdraw(mineralContainer, mineral), mineralContainer);
              return;
            }
          }
        }
      }

      const orders = this.getSellOrders(creep);

      for (const order of orders) {
        const terminal = creep.room.terminal;
        if (!terminal) break;
        const { remainingAmount, resourceType } = order;
        if (terminal.store.getUsedCapacity(resourceType as ResourceConstant) < remainingAmount) {
          const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: structure => {
              if (structure.structureType !== STRUCTURE_STORAGE) return false;

              return structure.store.getUsedCapacity(resourceType as ResourceConstant) > 0;
            }
          });
          if (!storage) continue;

          creep.memory.targetId = storage.id;
          creep.memory.resource = resourceType;
          // this.actionOrMove(creep, () => creep.withdraw(storage, resourceType as ResourceConstant), storage);
          return;
        }
      }

      const factoryFlags = findFlags(FlagType.Factory, creep.room.name);
      for (const flag of factoryFlags) {
        const factory = flag.pos
          .lookFor(LOOK_STRUCTURES)
          .find(structure => structure.structureType === STRUCTURE_FACTORY) as StructureFactory | undefined;
        if (!factory) continue;

        const [_, resource, amount] = flag.name.split(",") as [string, ResourceConstant, number];

        if (factory.store.getUsedCapacity(resource) >= amount) {
          continue;
        }

        const [storage] = creep.room.find(FIND_STRUCTURES, {
          filter: structure => {
            switch (structure.structureType) {
              case STRUCTURE_TERMINAL:
                if (resource === RESOURCE_ENERGY) return false;
              case STRUCTURE_STORAGE:
                return structure.store.getUsedCapacity(resource) > 0;
              default:
                return false;
            }
          }
        });
        if (!storage) continue;

        creep.memory.targetId = storage.id;
        creep.memory.resource = resource;
        // this.actionOrMove(creep, () => creep.withdraw(storage, resource), storage);
        return;
      }

      const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_LINK:
              const isContainer = Memory.links?.[structure.id]?.isContainer ?? false;
              if (!isContainer) return false;
              return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
            case STRUCTURE_CONTAINER:
              for (const r in structure.store) {
                const resource = r as ResourceConstant;
                if (resource === RESOURCE_ENERGY) return true;

                return structure.store.getUsedCapacity(resource)! > creep.store.getCapacity(resource);
              }

            default:
              return false;
          }
        }
      }) as StructureLink | StructureContainer | null;

      const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
        filter: tombstone => {
          if (tombstone.pos.getRangeTo(creep) > 3) return false;

          return Object.keys(tombstone.store).length >= 0;
        }
      });

      const droppedResource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);

      const target = tombstone || container;

      // if (droppedResource) {
      //   this.actionOrMove(creep, () => creep.pickup(droppedResource), droppedResource);
      //   return;
      // }

      if (target) {
        for (const r in target.store) {
          const resource = r as ResourceConstant;
          if (resource === RESOURCE_ENERGY) {
            creep.memory.targetId = target.id;
            creep.memory.resource = resource;
            // this.actionOrMove(creep, () => creep.withdraw(target, resource), target);
            return;
          }

          if (target.store.getUsedCapacity(resource)! > creep.store.getCapacity(resource)) {
            creep.memory.targetId = target.id;
            creep.memory.resource = resource;
            // this.actionOrMove(creep, () => creep.withdraw(target, resource), target);
            return;
          }
        }
      }

      if (!!target?.store?.getUsedCapacity(RESOURCE_ENERGY)) {
        creep.memory.targetId = target.id;
        creep.memory.resource = RESOURCE_ENERGY;
        // this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
      } else if (!!target?.store?.getUsedCapacity(RESOURCE_HYDROGEN)) {
        creep.memory.targetId = target.id;
        creep.memory.resource = RESOURCE_HYDROGEN;
        // this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_HYDROGEN), target);
      } else if (creep.room.terminal && creep.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 13000) {
        creep.memory.targetId = creep.room.terminal.id;
        creep.memory.resource = RESOURCE_ENERGY;
        // this.actionOrMove(creep, () => creep.withdraw(creep.room.terminal!, RESOURCE_ENERGY), creep.room.terminal);
      } else {
        const factory = creep.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: structure =>
            structure.structureType === STRUCTURE_FACTORY && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 10000
        });
        if (!factory) {
          const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: structure =>
              structure.structureType === STRUCTURE_STORAGE && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
          });
          if (!storage) return;

          creep.memory.targetId = storage.id;
          creep.memory.resource = RESOURCE_ENERGY;
          return;
        }
        creep.memory.targetId = factory.id;
        creep.memory.resource = RESOURCE_ENERGY;
        // this.actionOrMove(creep, () => creep.withdraw(factory, RESOURCE_ENERGY), factory);
        return;

        // this.actionOrMove(creep, () => creep.withdraw(storage, RESOURCE_ENERGY), storage);
      }
    };

    assignTarget();

    targetId = creep.memory.targetId;
    resource = creep.memory.resource;

    if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
      console.log("reassigned target");
    }
    if (targetId && resource) {
      const target = Game.getObjectById(targetId) as Structure | null;
      if (target) {
        const result = this.actionOrMove(creep, () => creep.withdraw(target, resource as ResourceConstant), target);
        if (creep.name === "transporter-Neolite-2ekv0ho7koo") {
          console.log("collected", target, resource, result);
        }
        if (result === ERR_NOT_IN_RANGE) return;
        creep.memory.targetId = null;
        creep.memory.resource = null;
      }
    }
  }
}
profiler.registerClass(TransporterService, "TransporterService");

export const transporterService = new TransporterService(transporterRepository, findRepository);

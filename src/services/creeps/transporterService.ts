import { CreepRole, FlagType, TransporterCreep, TransporterMemory, TransporterState } from "models";
import { findRepository, IFindRepository, ITransporterRepository, transporterRepository } from "repositories";
import { ABaseService, TSpawnCreepResponse, roomServiceConfig } from "services";
import { findFlag, findFlags, getLabs, getLabsBy, getUniqueId, recordCountToArray } from "utils";
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
          creep.memory.state = TransporterState.Collecting;
        }
        break;
      case TransporterState.Collecting:
        if (creep.store.getFreeCapacity() === 0) {
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
          this.doTransfer(creep);
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
    const transportRequest = this.getTransportRequest(creep.room.name);

    if (transportRequest && creep.store.getUsedCapacity(transportRequest.resource) > 0) {
      this.actionOrMove(
        creep,
        () => creep.transfer(transportRequest.target, transportRequest.resource),
        transportRequest.target
      );
      return;
    }
    const labs = getLabs(creep.room.name);

    for (const { lab, mineral } of labs) {
      if (
        lab.store.getFreeCapacity(mineral) > creep.store.getUsedCapacity(mineral) &&
        creep.store.getUsedCapacity(mineral) > 0
      ) {
        this.actionOrMove(creep, () => creep.transfer(lab, mineral), lab);
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
        this.actionOrMove(creep, () => creep.transfer(terminal, resourceType as ResourceConstant), terminal);
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
          this.actionOrMove(creep, () => creep.transfer(target, resource), target);
          return;
        }
      }
    }

    for (const resourceType in creep.store) {
      if (creep.store.getUsedCapacity(resourceType as ResourceConstant) > 0) {
        this.actionOrMove(creep, () => creep.transfer(target, resourceType as ResourceConstant), target);
        return;
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

    const mySellOrders = [Game.market.getOrderById("6873a237af4edf00125a5dbc")].filter(order => !!order);
    return mySellOrders as Order[];
  }

  @CacheFor(10)
  private getTransportRequest(roomName: string) {
    const transportFlags = findFlags(FlagType.Transport, roomName);

    for (const flag of transportFlags) {
      const [_, resource, amount] = flag.name.split(",") as [string, ResourceConstant, number];
      const target = flag.pos.lookFor(LOOK_STRUCTURES).find(structure => {
        switch (structure.structureType) {
          case STRUCTURE_FACTORY:
          case STRUCTURE_STORAGE:
          case STRUCTURE_TERMINAL:
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

  private doCollect(creep: TransporterCreep): void {
    // TODO refactor this collect into a more generic method
    const originalSpawn = Game.getObjectById(creep.memory.spawnId) as StructureSpawn;

    if (creep.room.name !== originalSpawn.room.name) {
      this.move(creep, originalSpawn);
      return;
    }
    const enemyCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
    const stayFlag = findFlag(FlagType.Stay);

    if (enemyCreeps.length > 0 && stayFlag) {
      const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          const distance = stayFlag.pos.getRangeTo(structure.pos);
          if (distance > 2) return false;
          switch (structure.structureType) {
            case STRUCTURE_STORAGE:
            case STRUCTURE_TERMINAL:
            case STRUCTURE_LINK:
              return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
            default:
              return false;
          }
        }
      }) as StructureStorage | StructureTerminal | null;
      if (!storage) {
        this.move(creep, stayFlag);
        return;
      }
      this.actionOrMove(creep, () => creep.withdraw(storage, RESOURCE_ENERGY), stayFlag);
      return;
    }

    const transportRequest = this.getTransportRequest(creep.room.name);
    if (transportRequest) {
      const collectTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          if (structure.id === transportRequest.target.id) return false;
          switch (structure.structureType) {
            case STRUCTURE_TERMINAL:
            case STRUCTURE_STORAGE:
            case STRUCTURE_LINK:
            case STRUCTURE_CONTAINER:
            case STRUCTURE_FACTORY:
            case STRUCTURE_LAB:
              const usedAmount = structure.store.getUsedCapacity(transportRequest.resource) || 0;
              return usedAmount > 0;

            default:
              return false;
          }
        }
      });

      if (collectTarget) {
        this.actionOrMove(creep, () => creep.withdraw(collectTarget, transportRequest.resource), collectTarget);
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
        this.actionOrMove(creep, () => creep.withdraw(labA, mineral), labA);
        return;
      }
      if (flaggedLab && mineral && mineral !== flaggedLab.mineral && labA.store.getUsedCapacity(mineral) > 0) {
        this.actionOrMove(creep, () => creep.withdraw(labA, mineral), labA);
        return;
      }

      const outputLab = outputLabs.find(({ lab }) => lab.id === labA.id);

      if (outputLab) {
        for (const mineral in labA.store) {
          if (mineral === RESOURCE_ENERGY) continue;

          if (labA.store.getUsedCapacity(mineral as ResourceConstant)! < creep.store.getCapacity()) continue;

          this.actionOrMove(creep, () => creep.withdraw(labA, mineral as ResourceConstant), labA);
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
            this.actionOrMove(creep, () => creep.withdraw(labA, mineral as ResourceConstant), labA);
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
            this.actionOrMove(creep, () => creep.withdraw(mineralContainer, mineral), mineralContainer);
            return;
          }
        }
      } else {
        for (const { mineral, lab } of labs) {
          if (
            mineralContainer.store.getUsedCapacity(mineral) > 0 &&
            lab.store.getFreeCapacity(mineral) > creep.store.getFreeCapacity(mineral)
          ) {
            this.actionOrMove(creep, () => creep.withdraw(mineralContainer, mineral), mineralContainer);
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

        this.actionOrMove(creep, () => creep.withdraw(storage, resourceType as ResourceConstant), storage);
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

      this.actionOrMove(creep, () => creep.withdraw(storage, resource), storage);
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
    if (droppedResource) {
      this.actionOrMove(creep, () => creep.pickup(droppedResource), droppedResource);
      return;
    }

    if (target) {
      for (const r in target.store) {
        const resource = r as ResourceConstant;
        if (resource === RESOURCE_ENERGY) {
          this.actionOrMove(creep, () => creep.withdraw(target, resource), target);
          return;
        }

        if (target.store.getUsedCapacity(resource)! > creep.store.getCapacity(resource)) {
          this.actionOrMove(creep, () => creep.withdraw(target, resource), target);
          return;
        }
      }
    }

    if (!!target?.store?.getUsedCapacity(RESOURCE_ENERGY)) {
      this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
    } else if (!!target?.store?.getUsedCapacity(RESOURCE_HYDROGEN)) {
      this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_HYDROGEN), target);
    } else if (creep.room.terminal && creep.room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 13000) {
      this.actionOrMove(creep, () => creep.withdraw(creep.room.terminal!, RESOURCE_ENERGY), creep.room.terminal);
    } else {
      const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure =>
          structure.structureType === STRUCTURE_STORAGE && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      });
      if (!storage) return;
      this.actionOrMove(creep, () => creep.withdraw(storage, RESOURCE_ENERGY), storage);
    }
  }
}
profiler.registerClass(TransporterService, "TransporterService");

export const transporterService = new TransporterService(transporterRepository, findRepository);

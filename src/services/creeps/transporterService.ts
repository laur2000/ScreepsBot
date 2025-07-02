import { CreepRole, FlagType, TransporterCreep, TransporterMemory, TransporterState } from "models";
import { findRepository, IFindRepository, ITransporterRepository, transporterRepository } from "repositories";
import { ABaseService, TSpawnCreepResponse, roomServiceConfig } from "services";
import { findFlag, findFlags, getUniqueId, recordCountToArray } from "utils";

class TransporterService extends ABaseService<TransporterCreep> {
  MIN_CREEPS_TTL = 60;
  MAX_CREEPS_PER_CONTAINER = 1;
  public constructor(private transporterRepository: ITransporterRepository, private findRepository: IFindRepository) {
    super(transporterRepository);
  }

  override execute(transporter: TransporterCreep): void {
    // this.runReactions();
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
    const { transporter } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

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
        this.doRecycle(creep);
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
              (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ||
              (creep.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID) > 0 &&
                structure.store.getFreeCapacity(RESOURCE_CATALYZED_GHODIUM_ACID))
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
          case STRUCTURE_TOWER:
            return hostileCreeps.length > 0 ? 0 : 5;
          case STRUCTURE_LAB:
            return 4;
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
    const labs = this.getLabs();

    for (const { lab, mineral } of labs) {
      if (creep.store.getUsedCapacity(mineral) > 0 && lab.store.getFreeCapacity(mineral) > 0) {
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

    const target = this.getTarget(creep);
    if (!target) return;

    for (const resourceType in creep.store) {
      if (creep.store.getUsedCapacity(resourceType as ResourceConstant) > 0) {
        this.actionOrMove(creep, () => creep.transfer(target, resourceType as ResourceConstant), target);
        return;
      }
    }
  }

  private getLabs() {
    return findFlags(FlagType.Lab)
      .map(flag => {
        const lab = flag.pos
          .lookFor(LOOK_STRUCTURES)
          .find(structure => structure.structureType === STRUCTURE_LAB) as StructureLab;
        const mineral = flag.name.split(",")[1];
        if (!lab || !mineral) return null;
        return {
          lab,
          mineral
        };
      })
      .filter(x => !!x) as { lab: StructureLab; mineral: MineralConstant | MineralCompoundConstant }[];
  }

  private getReactions() {
    return findFlags(FlagType.Reaction)
      .map(flag => {
        const outputLab = flag.pos
          .lookFor(LOOK_STRUCTURES)
          .find(structure => structure.structureType === STRUCTURE_LAB) as StructureLab;
        const [_, mineral1, mineral2] = flag.name.split(",");

        const sourceLabs = this.getLabs();
        const sourceLab1 = sourceLabs.find(({ mineral }) => mineral === mineral1)?.lab;
        const sourceLab2 = sourceLabs.find(({ mineral }) => mineral === mineral2)?.lab;
        if (!outputLab || !sourceLab1 || !sourceLab2) return null;
        return { outputLab, sourceLab1, sourceLab2 };
      })
      .filter(x => !!x) as { outputLab: StructureLab; sourceLab1: StructureLab; sourceLab2: StructureLab }[];
  }

  private runReactions() {
    const reactions = this.getReactions();
    for (const { outputLab, sourceLab1, sourceLab2 } of reactions) {
      outputLab.runReaction(sourceLab1, sourceLab2);
    }
  }
  private doCollect(creep: TransporterCreep): void {
    const labs = this.getLabs();

    const allLabs = creep.room.find(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_LAB
    }) as StructureLab[];

    for (const labA of allLabs) {
      const flaggedLab = labs.find(({ lab }) => lab.id === labA.id);
      const [mineral] = Object.keys(labA.store).filter(x => x !== RESOURCE_ENERGY) as MineralConstant[];
      if (!flaggedLab && mineral) {
        this.actionOrMove(creep, () => creep.withdraw(labA, mineral), labA);
        return;
      }
      if (flaggedLab && mineral !== flaggedLab.mineral) {
        this.actionOrMove(creep, () => creep.withdraw(labA, mineral), labA);
        return;
      }
    }

    const mineralContainer = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_CONTAINER:
          case STRUCTURE_STORAGE:
          case STRUCTURE_TERMINAL:
            for (const { mineral } of labs) {
              if (structure.store.getUsedCapacity(mineral) > 0) return true;
            }
          default:
            return false;
        }
      }
    }) as StructureContainer | StructureStorage | StructureTerminal | null;

    if (mineralContainer) {
      for (const { mineral } of labs) {
        if (mineralContainer.store.getUsedCapacity(mineral) > 0) {
          this.actionOrMove(creep, () => creep.withdraw(mineralContainer, mineral), mineralContainer);
          return;
        }
      }
    }

    // if (mineralContainer && (mineralContainer?.store?.getUsedCapacity?.(RESOURCE_HYDROGEN) ?? 0) > 0) {
    //   this.actionOrMove(creep, () => creep.withdraw(mineralContainer, RESOURCE_HYDROGEN), mineralContainer);
    //   return;
    // }
    // const terminal = creep.room.terminal;
    // if (terminal) {
    //   this.actionOrMove(creep, () => creep.withdraw(terminal, RESOURCE_CATALYZED_GHODIUM_ALKALIDE), terminal);
    //   // this.actionOrMove(creep, () => creep.transfer(terminal, RESOURCE_ENERGY), terminal);
    //   return;
    // }

    // const lab = Game.getObjectById("685e21e3aed1553d572f40be") as StructureLab;
    // if (lab && lab.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ALKALIDE) > 0) {
    //   this.actionOrMove(creep, () => creep.withdraw(lab, RESOURCE_CATALYZED_GHODIUM_ALKALIDE), lab);
    //   // this.actionOrMove(creep, () => creep.transfer(lab, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE), lab);
    //   // const c = Game.creeps["healer-7ebn9km13oo"];

    //   // lab.boostCreep(c);
    //   return;
    // }

    // const storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {
    //   filter: structure => {
    //     return structure.structureType === STRUCTURE_STORAGE;
    //   }
    // });

    // if (storage) {
    //   this.actionOrMove(creep, () => creep.withdraw(storage, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE), storage);
    //   return;
    // }
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

    const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_LINK:
            const isContainer = Memory.links?.[structure.id]?.isContainer ?? false;
            if (!isContainer) return false;
          case STRUCTURE_CONTAINER:
            return (
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 ||
              (structure.store.getUsedCapacity(RESOURCE_HYDROGEN) ?? 0) > creep.store.getCapacity(RESOURCE_HYDROGEN)
            );
          default:
            return false;
        }
      }
    }) as StructureLink | StructureContainer | null;

    const tombstone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
      filter: tombstone =>
        tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0 || tombstone.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0
    });

    const droppedResource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);

    const target = tombstone || container;
    if (droppedResource) {
      this.actionOrMove(creep, () => creep.pickup(droppedResource), droppedResource);
      return;
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

export const transporterService = new TransporterService(transporterRepository, findRepository);

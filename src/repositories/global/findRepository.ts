import { CreepRole } from "models";
import {
  harvesterRepository,
  haulerRepository,
  IHarvesterRepository,
  IHaulerRepository,
  ITransporterRepository,
  transporterRepository
} from "repositories/creeps";
import { roomServiceConfig } from "services/roomServiceConfig";
import { getMaxCreepsPerTarget, getVisibleFlaggedRooms } from "utils";

export type THaulerContainer = StructureContainer | StructureLink;
export type THarvesterSource = Source | Mineral;
export type TTarget = _HasId & HasPos;
export type TClosestSpawns = {
  closestSpawn: StructureSpawn;
  closestAvailableSpawn: StructureSpawn;
};

export interface IFindRepository {
  findAvailableContainers(room: Room, max: number): StructureContainer[];
  findAvailableHaulerContainers(): THaulerContainer[];
  // findAllHaulerContainers(): THaulerContainer[];
  findAvailableHarvesterSources(): THarvesterSource[];
  // findAllHarvesterSources(): THarvesterSource[];
  findClosestSpawn(spawns: StructureSpawn[], target: TTarget): StructureSpawn | null;
  findClosestSpawnOfTarget(target: TTarget): TClosestSpawns | null;
  sourcesCount(room: Room): number;
  containersCount(room: Room): number;
}

export class FindRepository implements IFindRepository {
  public constructor(
    private harvesterRepository: IHarvesterRepository,
    private transporterRepository: ITransporterRepository,
    private haulerRepository: IHaulerRepository
  ) {}

  findAvailableContainers(room: Room, max: number) {
    const containersCount = this.transporterRepository.countCreepsByTargetId();
    const rooms = [room, ...getVisibleFlaggedRooms("container")];
    return rooms.flatMap(room =>
      room.find(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
              break;
            case STRUCTURE_LINK:
              const linkMemory = Memory.links?.[structure.id] || {};
              if (!linkMemory.isContainer) return false;
              break;
            default:
              return false;
          }

          const count = containersCount[structure.id] || 0;
          Memory.containers = Memory.containers || {};
          const maxCount = Memory.containers?.[structure.id]?.maxCreeps ?? max;
          return count < maxCount;
        }
      })
    ) as StructureContainer[];
  }

  findAvailableHaulerContainers() {
    const containersCount = this.haulerRepository.countCreepsByTargetId();
    return getVisibleFlaggedRooms("hauler_container").flatMap(room =>
      room.find(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
              break;
            case STRUCTURE_LINK:
              const linkMemory = Memory.links?.[structure.id] || {};
              if (!linkMemory.isContainer) return false;
              break;
            default:
              return false;
          }
          const roomName = structure.room.name;
          const { hauler } = roomServiceConfig[roomName] || roomServiceConfig.default;
          const max = hauler?.maxCreepsPerSource ?? 1;

          const count = containersCount[structure.id] || 0;
          Memory.containers = Memory.containers || {};
          const maxCount = Memory.containers?.[structure.id]?.maxCreeps ?? max;
          return count < maxCount;
        }
      })
    ) as THaulerContainer[];
  }

  // findAllHaulerContainers(): THaulerContainer[] {
  //   return getVisibleFlaggedRooms("hauler_container").flatMap(room =>
  //     room.find(FIND_STRUCTURES, {
  //       filter: structure => {
  //         switch (structure.structureType) {
  //           case STRUCTURE_CONTAINER:
  //             return true;
  //           case STRUCTURE_LINK:
  //             const linkMemory = Memory.links?.[structure.id] || {};
  //             return linkMemory.isContainer;
  //           default:
  //             return false;
  //         }
  //       }
  //     })
  //   ) as THaulerContainer[];
  // }

  findAvailableHarvesterSources() {
    const sourcesCount = this.harvesterRepository.countCreepsBySource();
    const rooms = getVisibleFlaggedRooms("harvest");

    const sources = rooms.flatMap(room =>
      room.find(FIND_SOURCES, {
        filter: source => {
          const count = sourcesCount[source.id] ?? 0;
          const maxCreeps = getMaxCreepsPerTarget(CreepRole.Harvester, source);
          return count < maxCreeps;
        }
      })
    );

    const minerals = rooms.flatMap(room =>
      room.find(FIND_MINERALS, {
        filter: mineral => {
          if (mineral.mineralAmount === 0) return false;

          const extractor = mineral.pos
            .lookFor(LOOK_STRUCTURES)
            .find(structure => structure.structureType === STRUCTURE_EXTRACTOR);

          if (!extractor) return false;

          const count = sourcesCount[mineral.id] || 0;
          const maxCreeps = getMaxCreepsPerTarget(CreepRole.Harvester, extractor);

          return count < maxCreeps;
        }
      })
    );

    return [...sources, ...minerals];
  }

  // findAllHarvesterSources(): (Source | Mineral)[] {
  //   const rooms = getVisibleFlaggedRooms("harvest");
  //   const sources = rooms.flatMap(room => room.find(FIND_SOURCES));
  //   const minerals = rooms.flatMap(room =>
  //     room.find(FIND_MINERALS, {
  //       filter: mineral => {
  //         const extractor = mineral.pos
  //           .lookFor(LOOK_STRUCTURES)
  //           .find(structure => structure.structureType === STRUCTURE_EXTRACTOR);
  //         return !!extractor;
  //       }
  //     })
  //   );
  //   return [...sources, ...minerals];
  // }

  private targetCostCache: Record<string, Record<string, number>> = {};
  findClosestSpawn(spawns: StructureSpawn[], target: TTarget) {
    let maxCost = Number.MAX_SAFE_INTEGER;
    let closestSpawn = null;
    for (const spawn of spawns) {
      let cost = this.targetCostCache[spawn.id]?.[target.id];

      if (!cost) {
        const path = PathFinder.search(spawn.pos, target.pos);
        this.targetCostCache[spawn.id] = this.targetCostCache[spawn.id] || {};
        this.targetCostCache[spawn.id][target.id] = path.cost;
        cost = path.cost;
      }

      if (cost < maxCost) {
        maxCost = cost;
        closestSpawn = spawn;
      }
    }
    return closestSpawn;
  }

  findClosestSpawnOfTarget(target: TTarget) {
    const allSpawns = Object.values(Game.spawns);
    // TODO  Also check if energyAvailable in room is enough to spawn target
    const availableSpawns = allSpawns.filter(spawn => !spawn.spawning);
    const closestAvailableSpawn = this.findClosestSpawn(availableSpawns, target);
    if (!closestAvailableSpawn) return null;

    const closestSpawn = this.findClosestSpawn(allSpawns, target)!;
    return { closestSpawn, closestAvailableSpawn };
  }

  sourcesCount(room: Room): number {
    const sourcesCount = room.find(FIND_SOURCES).length;
    const extractorCount = room.find(FIND_STRUCTURES, {
      filter: structure => {
        if (structure.structureType !== STRUCTURE_EXTRACTOR) {
          return false;
        }
        const mineral = structure.pos.lookFor(LOOK_MINERALS)[0];
        if (!mineral) {
          return false;
        }
        return mineral.mineralAmount > 0;
      }
    }).length;
    const total = sourcesCount + extractorCount;
    return total;
  }

  containersCount(room: Room): number {
    return room.find(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_CONTAINER:
            break;
          case STRUCTURE_LINK:
            const linkMemory = Memory.links?.[structure.id] || {};
            if (!linkMemory.isContainer) return false;
            break;
          default:
            return false;
        }

        return true;
      }
    }).length;
  }
}

export const findRepository = new FindRepository(harvesterRepository, transporterRepository, haulerRepository);

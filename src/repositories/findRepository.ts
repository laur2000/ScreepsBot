import { harvesterRepository, IHarvesterRepository } from "./harvesterRepository";
import { haulerRepository, IHaulerRepository } from "./haulerRepository";
import { ITransporterRepository, transporterRepository } from "./transporterRepository";

export interface IFindRepository {
  findAvailableSources(room: Room, max: number): (Source | Mineral)[];
  findAvailableContainers(room: Room, max: number): StructureContainer[];
  findHaulerContainers(max: number): StructureContainer[];
  sourcesCount(room: Room): number;
  containersCount(room: Room): number;
}

export class FindRepository implements IFindRepository {
  public constructor(
    private harvesterRepository: IHarvesterRepository,
    private transporterRepository: ITransporterRepository,
    private haulerRepository: IHaulerRepository
  ) {}

  findAvailableSources(room: Room, max: number) {
    const sourcesCount = this.harvesterRepository.countCreepsBySource();
    const harvestFlags = Object.values(Game.flags).filter(flag => flag.name === "harvest");
    const rooms = [room, ...harvestFlags.map(flag => flag.room)].filter(room => !!room) as Room[];

    const sources = rooms.flatMap(room =>
      room.find(FIND_SOURCES, {
        filter: source => {
          const count = sourcesCount[source.id] || 0;
          return count < max;
        }
      })
    );

    const minerals = rooms.flatMap(room =>
      room.find(FIND_MINERALS, {
        filter: mineral => {
          if (mineral.mineralAmount === 0) return false;
          const count = sourcesCount[mineral.id] || 0;
          return count < max;
        }
      })
    );

    return [...sources, ...minerals];
  }

  findAvailableContainers(room: Room, max: number) {
    const containersCount = this.transporterRepository.countCreepsByTargetId();
    const containerFlags = Object.values(Game.flags).filter(flag => flag.name === "container");
    const rooms = [room, ...containerFlags.map(flag => flag.room)].filter(room => !!room) as Room[];
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

  findHaulerContainers(max: number) {
    const containersCount = this.haulerRepository.countCreepsByTargetId();
    const containerFlags = Object.values(Game.flags).filter(flag => flag.name === "hauler_container");
    const rooms = containerFlags.map(flag => flag.room).filter(room => !!room) as Room[];
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

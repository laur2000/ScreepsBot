import { ILinkRepository, linkRepository } from "repositories";

export interface ILinkService {
  getRoomLinks(room: Room): StructureLink[];
  doTransferEnergy(link: StructureLink): void;
  executeRoom(room: Room): void;
}
class LinkService implements ILinkService {
  public constructor(private linkRepository: ILinkRepository) {}

  getRoomLinks(room: Room): StructureLink[] {
    return this.linkRepository.getRoomLinks(room);
  }

  executeRoom(room: Room): void {
    const links = this.getRoomLinks(room);
    for (const link of links) {
      this.doTransferEnergy(link);
    }
  }

  doTransferEnergy(link: StructureLink): void {
    const { targetId } = Memory.links[link.id] || {};
    if (link.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && targetId) {
      const targetLink = Game.getObjectById<StructureLink>(targetId);
      if (
        !!targetLink &&
        targetLink.structureType === STRUCTURE_LINK &&
        targetLink.store.getUsedCapacity(RESOURCE_ENERGY) === 0
      ) {
        link.transferEnergy(Game.getObjectById(targetId) as StructureLink);
      }
    }
  }
}

export const linkService = new LinkService(linkRepository);

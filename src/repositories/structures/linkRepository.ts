export interface ILinkRepository {
  getRoomLinks(room: Room): StructureLink[];
}

export class LinkRepository implements ILinkRepository {
  getRoomLinks(room: Room): StructureLink[] {
    return room.find(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_LINK
    });
  }
}

export const linkRepository = new LinkRepository();

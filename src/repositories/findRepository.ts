import { harvesterRepository, IHarvesterRepository } from "./harvesterRepository";

export interface IFindRepository {
    findAvailableSource(room: Room, max: number): Source[]
    sourcesCount(room: Room): number
}

export class FindRepository implements IFindRepository {
    public constructor(private harvesterRepository: IHarvesterRepository){}

    findAvailableSource(room: Room, max: number){
        const sourcesCount = this.harvesterRepository.countCreepsBySource();
        return room.find(FIND_SOURCES, {
            filter: source => {
                const count = sourcesCount[source.id] || 0;
                return count < max;
            }
        });
    }

    sourcesCount(room: Room): number {
        return room.find(FIND_SOURCES).length
    }
}

export const findRepository = new FindRepository(harvesterRepository);

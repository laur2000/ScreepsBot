import { IService } from "services/service";
import { IController } from "./controller";
import { HarvesterCreep } from "repositories/harvesterRepository";

class GarbageCollectorController implements IController {


    run(): void {
        this.cleanCreeps();
    }

    cleanCreeps(): void {
        const memoCreeps = Object.keys(Memory.creeps);
        const currentcreeps = Object.keys(Game.creeps);
        const creepsToDelete = memoCreeps.filter(creepName => !currentcreeps.includes(creepName));
        creepsToDelete.forEach(creepName => {
            delete Memory.creeps[creepName];
            console.log(`Deleted creep ${creepName} from memory.`);
        });
    }
}
export const garbageCollectorController = new GarbageCollectorController();

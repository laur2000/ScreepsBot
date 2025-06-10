import { IService } from "services/service";
import { IController } from "./controller";
import { HarvesterCreep } from "repositories/harvesterRepository";
import { harvesterService } from "services/harvesterService";

class HarvesterController implements IController {
  constructor(private harvesterService: IService<HarvesterCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      const needMoreCreeps = this.harvesterService.needMoreCreeps(spawn);
      if (needMoreCreeps) {
        const err = this.harvesterService.spawn(spawn);
      }

      for (const harvester of this.harvesterService.getCreeps(spawn)) {
        this.harvesterService.execute(harvester);
      }
    }
  }
}

export const harvesterController = new HarvesterController(harvesterService);

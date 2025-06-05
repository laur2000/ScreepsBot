import { IService } from "services/service";
import { IController } from "./controller";
import { HarvesterCreep } from "repositories/harvesterRepository";
import { harvesterService } from "services/harvesterService";

class HarvesterController implements IController {
  constructor(private harvesterService: IService<HarvesterCreep>) {}
  run(): void {
    for(const spawn of Object.values(Game.spawns)){
      if(harvesterService.needMoreCreeps(spawn)){
        harvesterService.spawn(spawn)
      }

      for(const harvester of harvesterService.getCreeps(spawn)){
        harvesterService.execute(harvester)
      }
    }


  }
}

export const harvesterController = new HarvesterController(harvesterService);

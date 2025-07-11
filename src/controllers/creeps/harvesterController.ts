import { IController } from "controllers";
import { HarvesterCreep } from "models";
import { HarvesterService, harvesterService, IService } from "services";
import profiler from "utils/profiler";

class HarvesterController implements IController {
  constructor(private harvesterService: HarvesterService) {}
  run(): void {
    const needMoreCreeps = this.harvesterService.needMoreCreeps();
    if (needMoreCreeps) {
      const err = this.harvesterService.spawn();
    }
    for (const spawn of Object.values(Game.spawns)) {
      for (const harvester of this.harvesterService.getCreeps(spawn)) {
        this.harvesterService.execute(harvester);
      }
    }
  }
}
profiler.registerClass(HarvesterController, "HarvesterController");

export const harvesterController = new HarvesterController(harvesterService);

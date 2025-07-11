import { IController } from "controllers";
import { ClaimerCreep } from "models";
import { claimerService, IService } from "services";
import profiler from "utils/profiler";

class ClaimerController implements IController {
  public constructor(private claimerService: IService<ClaimerCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      if (this.claimerService.needMoreCreeps(spawn)) {
        this.claimerService.spawn(spawn);
      }

      for (const claimer of this.claimerService.getCreeps(spawn)) {
        this.claimerService.execute(claimer);
      }
    }
  }
}
profiler.registerClass(ClaimerController, "ClaimerController");

export const claimerController = new ClaimerController(claimerService);

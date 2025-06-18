import { ClaimerCreep } from "repositories/claimerRepository";
import { IController } from "./controller";
import { IService } from "services/service";
import { claimerService } from "services/claimerService";
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

export const claimerController = new ClaimerController(claimerService);

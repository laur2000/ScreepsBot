import { IController } from "controllers";
import { ClaimerCreep } from "models";
import { claimerService, IService } from "services";

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

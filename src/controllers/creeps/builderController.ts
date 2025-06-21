import { IService } from "services/service";
import { BuilderCreep } from "repositories/builderRepository";
import { IController } from "controllers/controller";
import { builderService } from "services/builderService";
class BuilderController implements IController {
  public constructor(private builderService: IService<BuilderCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      if (this.builderService.needMoreCreeps(spawn)) {
        this.builderService.spawn(spawn);
      }

      for (const builder of this.builderService.getCreeps(spawn)) {
        this.builderService.execute(builder);
      }
    }
  }
}

export const builderController = new BuilderController(builderService);

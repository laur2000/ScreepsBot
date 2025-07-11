import { IController } from "controllers";
import { BuilderCreep } from "models";
import { builderService, IService } from "services";
import profiler from "utils/profiler";

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
profiler.registerClass(BuilderController, "BuilderController");

export const builderController = new BuilderController(builderService);

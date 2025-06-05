import { IController } from "./controller";

class BuilderController implements IController {
  run(): void {
    // do nothing
  }
}

export const builderController = new BuilderController();

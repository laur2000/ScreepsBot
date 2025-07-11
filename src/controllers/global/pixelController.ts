import { IController } from "controllers";
import profiler from "utils/profiler";

class PixelController implements IController {
  run(): void {
    if (Game.cpu.bucket === 10000) {
      Game.cpu.generatePixel();
    }
  }
}
profiler.registerClass(PixelController, "PixelController");

export const pixelController = new PixelController();

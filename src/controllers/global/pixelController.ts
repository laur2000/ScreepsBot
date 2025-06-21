import { IController } from "controllers";

class PixelController implements IController {
  run(): void {
    if (Game.cpu.bucket === 10000) {
      Game.cpu.generatePixel();
    }
  }
}
export const pixelController = new PixelController();

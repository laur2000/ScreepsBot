import { IController } from "controllers";
import { FlagType } from "models";
import { findFlags } from "utils";
import profiler from "utils/profiler";

class FactoryController implements IController {
  run(): void {
    this.produceItems();
  }

  produceItems(): void {
    const produceFlags = findFlags(FlagType.Produce);
    for (const flag of produceFlags) {
      const factory = flag.pos
        .lookFor(LOOK_STRUCTURES)
        .find(structure => structure.structureType === STRUCTURE_FACTORY) as StructureFactory | undefined;
      if (!factory) continue;

      const [_, product] = flag.name.split(",") as [string, CommodityConstant];
      factory.produce(product);
    }
  }
}
profiler.registerClass(FactoryController, "FactoryController");

export const factoryController = new FactoryController();

import { IController } from "controllers";
import { FlagType } from "models";
import { findFlags, getLabs } from "utils";
import profiler from "utils/profiler";

class LabController implements IController {
  run(): void {
    this.runReactions();
    this.runReverseReactions();
  }

  private getReactions() {
    return findFlags(FlagType.Reaction)
      .map(flag => {
        const outputLab = flag.pos
          .lookFor(LOOK_STRUCTURES)
          .find(structure => structure.structureType === STRUCTURE_LAB) as StructureLab;
        const [_, mineral1, mineral2] = flag.name.split(",");

        const sourceLabs = getLabs(flag.room?.name);
        const sourceLab1 = sourceLabs.find(({ mineral }) => mineral === mineral1)?.lab;
        const sourceLab2 = sourceLabs.find(({ mineral }) => mineral === mineral2)?.lab;
        if (!outputLab || !sourceLab1 || !sourceLab2) return null;
        return { outputLab, sourceLab1, sourceLab2 };
      })
      .filter(x => !!x) as { outputLab: StructureLab; sourceLab1: StructureLab; sourceLab2: StructureLab }[];
  }

  private getReverseReactions() {
    return findFlags(FlagType.Reverse)
      .map(flag => {
        const sourceLab = flag.pos
          .lookFor(LOOK_STRUCTURES)
          .find(structure => structure.structureType === STRUCTURE_LAB) as StructureLab;

        if (!sourceLab) return null;

        const [outputFlag1, outputFlag2] = sourceLab.pos.findInRange(FIND_FLAGS, 2, {
          filter: flag => flag.name.startsWith(FlagType.Output)
        });

        const outputLab1 = outputFlag1?.pos
          .lookFor(LOOK_STRUCTURES)
          .find(structure => structure.structureType === STRUCTURE_LAB) as StructureLab;
        const outputLab2 = outputFlag2?.pos
          .lookFor(LOOK_STRUCTURES)
          .find(structure => structure.structureType === STRUCTURE_LAB) as StructureLab;

        if (!outputLab1 || !outputLab2) return null;

        return { sourceLab, outputLab1, outputLab2 };
      })
      .filter(x => !!x) as { sourceLab: StructureLab; outputLab1: StructureLab; outputLab2: StructureLab }[];
  }

  private runReactions() {
    const reactions = this.getReactions();

    for (const { outputLab, sourceLab1, sourceLab2 } of reactions) {
      outputLab.runReaction(sourceLab1, sourceLab2);
    }
  }

  private runReverseReactions() {
    const reverseReactions = this.getReverseReactions();
    for (const { sourceLab, outputLab1, outputLab2 } of reverseReactions) {
      const err = sourceLab.reverseReaction(outputLab1, outputLab2);
    }
  }
}
profiler.registerClass(LabController, "LabController");

export const labController = new LabController();

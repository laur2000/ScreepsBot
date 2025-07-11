import { IController } from "controllers";
import profiler from "utils/profiler";

class TerminalController implements IController {
  run(): void {
    for (const terminalId in Memory.terminals) {
      const transactions = Memory.terminals[terminalId].transactions;
      const terminal = Game.getObjectById(terminalId) as StructureTerminal;
      for (const transaction of transactions) {
        const order = Game.market.getOrderById(transaction.orderId);

        if (!order) {
          Memory.terminals[terminalId].transactions = transactions.filter(t => t.orderId !== transaction.orderId);
          continue;
        }

        if (terminal.store.getUsedCapacity(RESOURCE_ENERGY) >= transaction.energyNeeded) {
          const err = Game.market.deal(
            transaction.orderId,
            Math.min(order?.remainingAmount, transaction.amount),
            transaction.roomName
          );
          if (!err) {
            Memory.terminals[terminalId].transactions = transactions.filter(t => t.orderId !== transaction.orderId);
          }
        }
      }
    }
  }
}
profiler.registerClass(TerminalController, "TerminalController");

export const terminalController = new TerminalController();

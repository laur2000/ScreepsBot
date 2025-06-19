declare global {
  namespace NodeJS {
    interface Global {
      makeDeal(roomName: string, dealId: string, amount: number): boolean;
      buyCheapestEnergy(roomName: string, amount: number, maxUnitPrice?: number): boolean;
      getOrders(params: {
        roomName: string;
        ord?: "asc" | "desc";
        limit?: number;
        orderType?: ORDER_BUY | ORDER_SELL;
        resourceType?: MarketResourceConstant;
      }): IOrder[];
      getTransaction(terminalId?: string): ITransaction | null;
    }
  }
}

global.getOrders = function ({ roomName, limit, ord = "asc", orderType, resourceType }): IOrder[] {
  return Game.market
    .getAllOrders({ type: orderType, resourceType })
    .filter(order => !!order.roomName)
    .sort((a, b) => {
      const aTransferCost = Game.market.calcTransactionCost(a.remainingAmount, roomName, a.roomName!);
      const bTransferCost = Game.market.calcTransactionCost(b.remainingAmount, roomName, b.roomName!);

      const aUnitPrice = (a.remainingAmount * a.price) / (a.remainingAmount - aTransferCost);
      const bUnitPrice = (b.remainingAmount * b.price) / (b.remainingAmount - bTransferCost);

      return ord === "asc" ? aUnitPrice - bUnitPrice : bUnitPrice - aUnitPrice;
    })
    .slice(0, limit)
    .map(order => {
      const transferCost = Game.market.calcTransactionCost(order.remainingAmount, roomName, order.roomName!);
      const unitPrice = (order.remainingAmount * order.price) / (order.remainingAmount - transferCost);
      return { ...order, realUnitPrice: unitPrice, totalTransactionCost: transferCost };
    });
};

global.buyCheapestEnergy = function (roomName: string, amount: number, maxUnitPrice?: number) {
  const [order] = global.getOrders({
    roomName,
    limit: 1,
    ord: "asc",
    orderType: ORDER_SELL,
    resourceType: RESOURCE_ENERGY
  });
  if (!order) return false;
  if (maxUnitPrice && order.realUnitPrice > maxUnitPrice) return false;
  return global.makeDeal(roomName, order.id, amount);
};

global.makeDeal = function (roomName: string, orderId: string, amount: number) {
  const order = Game.market.getOrderById(orderId);

  if (!order) {
    console.log("No order", orderId);
    return false;
  }

  const room = Game.rooms[roomName];
  if (!room || !room.terminal) {
    console.log("No terminal", roomName);
    return false;
  }

  const transactionConst = order.roomName ? Game.market.calcTransactionCost(amount, roomName, order.roomName) : 0;

  Memory.terminals = Memory.terminals || {};

  Memory.terminals[room.terminal.id] = Memory.terminals[room.terminal.id] || {
    transactions: []
  };
  Memory.terminals[room.terminal.id].transactions.push({ energyNeeded: transactionConst, orderId, amount, roomName });
  console.log(JSON.stringify(Memory.terminals[room.terminal.id]));
  return true;
};

global.getTransaction = function (terminalId?: string) {
  if (!terminalId) return null;
  const [transaction] = Memory.terminals[terminalId]?.transactions || [];
  if (!transaction) return null;
  const order = Game.market.getOrderById(transaction.orderId);
  if (!order) return null;
  return transaction;
};
export default {};

interface PathfinderReturn {
  path: RoomPosition[];
  ops: number;
  cost: number;
  incomplete: boolean;
}

interface TravelToReturnData {
  nextPos?: RoomPosition;
  pathfinderReturn?: PathfinderReturn;
  state?: TravelState;
  path?: string;
}

interface TravelToOptions {
  ignoreRoads?: boolean;
  ignoreCreeps?: boolean;
  ignoreStructures?: boolean;
  preferHighway?: boolean;
  highwayBias?: number;
  allowHostile?: boolean;
  allowSK?: boolean;
  range?: number;
  obstacles?: { pos: RoomPosition }[];
  roomCallback?: (roomName: string, matrix: CostMatrix) => CostMatrix | boolean;
  routeCallback?: (roomName: string) => number;
  returnData?: TravelToReturnData;
  restrictDistance?: number;
  useFindRoute?: boolean;
  maxOps?: number;
  movingTarget?: boolean;
  freshMatrix?: boolean;
  offRoad?: boolean;
  stuckValue?: number;
  maxRooms?: number;
  repath?: number;
  route?: { [roomName: string]: boolean };
  ensurePath?: boolean;
}

interface TravelData {
  state: any[];
  path?: string;
}

interface TravelState {
  stuckCount: number;
  lastCoord: Coord;
  destination: RoomPosition;
  cpu: number;
}

type PriorityFunction<T> = (object: T) => number;

interface PriorityOptions<T extends FindConstant> {
  priority: PriorityFunction<FindTypes[T]>;
}

interface Array<T> {
  flatMap<U>(callback: (value: T, index: number, array: T[]) => U | U[], thisArg?: any): U[];
}

interface Creep {
  travelTo(destination: HasPos | RoomPosition, ops?: TravelToOptions): number;
  fleeFrom(targets: HasPos[], dist?: number, maxRooms?: number): number;
  moveOffRoad(towards?: HasPos | RoomPosition): number;
  moveToRoom(roomName: string, range?: number): number;
  setStatic(value?: boolean): void;
  findClosestByPriority<T extends FindConstant, S extends FindTypes[T]>(
    type: T[],
    opts?: PriorityOptions<T> & FilterOptions<T, S>
  ): S | null;
}

type Coord = { x: number; y: number };
type HasPos = { pos: RoomPosition };

/*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
// Memory extension samples
interface ITransaction {
  energyNeeded: number;
  amount: number;
  orderId: string;
  roomName: string;
}

interface IOrder extends Order {
  realUnitPrice: number;
  totalTransactionCost: number;
}

interface Memory {
  uuid: number;
  log: any;
  empire: any;
  links: {
    [key: string]: {
      targetId?: string;
      isContainer?: boolean;
    };
  };
  terminals: {
    [key: string]: {
      transactions: ITransaction[];
    };
  };
  [key: string]: any;
}

interface CreepMemory {
  [key: string]: any;
}

interface RoomMemory {
  avoid?: number;
}

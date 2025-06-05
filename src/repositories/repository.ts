export enum CreepRole {
  Harvester = "harvester",
  Soldier = "soldier",
  Turret = "turret",
  Builder = "builder"
}

export enum CreepBodyPart {
  Move = "move",
  Work = "work",
  Carry = "carry",
  Attack = "attack",
  RangedAttack = "ranged_attack",
  Tough = "tough",
  Heal = "heal",
  Claim = "claim"
}


export interface IRepository<T extends Creep>{
  countCreepsInSpawn(spawn: string): number;
  getCreeps(spawnId: string): T[]
}




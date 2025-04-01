import { handlerContext, Monster, BigDecimal } from "generated";

export const createMonster = async (
    context: handlerContext,
    id: string,
    overrides?: Partial<Monster>
  ) => {  
    const monster: Monster = {
      id: id,
      name: "",
      symbol: "",
      supply: 0n,
      price: new BigDecimal(0),
      marketCap: new BigDecimal(0),
      totalVolumeTraded: 0n,
      depositsTotal: 0n,
      withdrawalsTotal: 0n,
      experiencePoints: new BigDecimal(0),
      totalWinsCount: 0,
      totalLossesCount: 0,
      winLoseRatio: 0,
      isInBattle: false,
      activeOpponent: undefined,
      contractOwner: "",
      paused: false,
      ...overrides, 
    }  
    context.Monster.set(monster);
  }

export const updateMonster = async (
    context: handlerContext,
    monster: Monster,
    overrides?: Partial<Monster>
  ) => {         
    context.Monster.set({
        ...monster,
        ...overrides, 
      });
  } 

export const requireMonster = async (context: handlerContext, id: string, msg: string) => {
    let monster: Monster | undefined = await context.Monster.get(id);
    if (!monster) {
        context.log.error(msg)    
    }   
}

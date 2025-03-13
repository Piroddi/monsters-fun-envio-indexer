import { handlerContext, CurrentHoldings, Monster, BigDecimal } from "generated";

export const createOrUpdateHoldings = async (context: handlerContext, monster: Monster, trader: string, balance: bigint, price: BigDecimal, hash: string, logIndex: number, srcAddress: string, blockTimestamp: number) => {
  let holding: CurrentHoldings | undefined = await context.CurrentHoldings.get(monster.id + "-" + trader);
  if (!holding) {
    holding = {
      id: monster.id + "-" + trader,
      monster_id: monster.id,
      trader: trader,
      balance: balance,
      price: price,
      marketCap: new BigDecimal(balance.toString()).multipliedBy(price),
      averageHoldingsCost: new BigDecimal(balance.toString()).multipliedBy(price),
    } 
  } else {
    holding = {
      ...holding,
      balance: holding.balance + balance,
      marketCap: new BigDecimal(holding.balance.toString()).multipliedBy(price),
       // averageHoldingsCost : todo
    }
  }
  context.CurrentHoldings.set(holding);

  const holdingsSnapshot = {
    id: hash + "-" + logIndex,
    monster_id: srcAddress,
    price: monster.price,    
    trader: trader,
    balance: holding.balance,
    marketCap: new BigDecimal((holding.balance).toString()).multipliedBy(monster.price),
    timestamp: blockTimestamp,
  }
  context.HoldingsSnapshot.set(holdingsSnapshot);
  
}
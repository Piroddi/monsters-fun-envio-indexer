import { handlerContext, CurrentHoldings, Monster, BigDecimal } from "generated";
import { ZERO_ADDRESS } from "../constants";

export const createOrUpdateHoldingsTransfer = async (context: handlerContext, monster: Monster, trader: string, balance: bigint, price: BigDecimal, hash: string, logIndex: number, srcAddress: string, blockTimestamp: number) => {

  let holding: CurrentHoldings | undefined = await context.CurrentHoldings.get(monster.id + "-" + trader);
  
  if (!holding) {
    if (balance < 0n && trader != ZERO_ADDRESS) {
      context.log.error("A sell or transfer_out on a trader that doesn't have any holdings")
      return;
    }    
    holding = {
      id: monster.id + "-" + trader,
      monster_id: monster.id,
      trader: trader,
      balance: balance,
      lastTradePrice: price,
      lastTradeMarketCap: new BigDecimal(balance.toString()).multipliedBy(price),      
      totalHoldingsCost: new BigDecimal(balance.toString()).multipliedBy(price),
      totalHoldingsSales: new BigDecimal(0)
    } 
  } else {

    let isIncrease = balance > 0n;

    holding = {
      ...holding,
      balance: holding.balance + balance,
      lastTradeMarketCap: new BigDecimal(holding.balance.toString()).multipliedBy(price),
      totalHoldingsCost: isIncrease ? holding.totalHoldingsCost.plus(new BigDecimal(balance.toString()).multipliedBy(price)) : holding.totalHoldingsCost,
      totalHoldingsSales: !isIncrease ? holding.totalHoldingsSales.minus(new BigDecimal(balance.toString()).multipliedBy(price)) : holding.totalHoldingsSales, 
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

export const updateHoldingsTrade = async (context: handlerContext, monster: Monster, trader: string, balance: bigint, price: BigDecimal, hash: string, logIndex: number, srcAddress: string, blockTimestamp: number) => {
  let holding: CurrentHoldings | undefined = await context.CurrentHoldings.get(monster.id + "-" + trader);
  
  if (!holding) {
      context.log.error("A transfer event has to happen before a trade event therefore a holding entity should exist")
      return;
  } else {
    let isIncrease = balance > 0n;
    holding = {
      ...holding,      
      lastTradePrice: price,
      lastTradeMarketCap: new BigDecimal(holding.balance.toString()).multipliedBy(price),
      totalHoldingsCost: isIncrease ? holding.totalHoldingsCost.plus(new BigDecimal(balance.toString()).multipliedBy(price)) : holding.totalHoldingsCost,
      totalHoldingsSales: !isIncrease ? holding.totalHoldingsSales.minus(new BigDecimal(balance.toString()).multipliedBy(price)) : holding.totalHoldingsSales, 
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
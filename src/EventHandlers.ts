/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  CreatureBoringToken,
  Monster,
  Trade,
  Trader
} from "generated";

CreatureBoringToken.Trade.handler(async ({ event, context }) => { 
  
  const { trader, isBuy,  amount, ethAmount, protocolFee } = event.params 
  const { hash } = event.transaction
  const { srcAddress, logIndex } = event
  const { timestamp } = event.block
  const price = ethAmount / amount

  let monster: Monster | undefined = await context.Monster.get(srcAddress);

  if (!monster) {    
    monster = {
      id: srcAddress,
      supply: amount,
      price: price,
      marketCap: price * amount,
    }
  } else {
    const supply = isBuy ? monster.supply + amount : monster.supply - amount;
    monster = {
      ...monster,
      supply: supply,
      price: price,
      marketCap: price * supply,
    }
  }
  
  const trade: Trade = {
    id: hash + "-" + logIndex,
    txHash: hash,
    logIndex: logIndex,
    token: srcAddress,
    trader: trader,
    isBuy: isBuy,
    amount: amount,
    ethAmount: ethAmount,
    blockTimestamp: BigInt(timestamp),
  }

  let traderEntity: Trader | undefined = await context.Trader.get(trader);
  if (!traderEntity) {
    traderEntity = {
      id: trader,
      numberOfTrades: 1,
    }
  } else {
    traderEntity = {
      ...traderEntity,
      numberOfTrades: traderEntity.numberOfTrades + 1,
    }
  }

  context.Trader.set(traderEntity);
  context.Trade.set(trade);
  context.Monster.set(monster);
});
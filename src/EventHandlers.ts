import {
  BigDecimal,
  CreatureBoringToken,
  Monster,
  Trade,
  Trader,  
  MarketCapSnapshot,
  TotalVolumeTradedSnapshot,  
} from "generated";

import { createOrUpdateHoldings } from "./helpers/holdings";

import { WIN_POINTS_MULTIPLIER, TRADE_POINTS_MULTIPLIER } from "./constants";

const calculateExperiencePoints = (depositsTotal: bigint, withdrawalsTotal: bigint): BigDecimal => {
  const netFlow: number = parseFloat((depositsTotal - withdrawalsTotal).toString());   
  const exponent = 1/4; // hardcoded 1/4
  if (netFlow < 0) {
    console.log("warning: netFlow is negative?");
  }
  const experiencePoints = Math.pow(Math.abs(netFlow), exponent);  
  return new BigDecimal(experiencePoints);
};

CreatureBoringToken.Trade.handler(async ({ event, context }) => { 
  
  const { trader, isBuy,  amount, ethAmount, protocolFee } = event.params 
  const { hash } = event.transaction
  const { srcAddress, logIndex } = event
  const { timestamp, number } = event.block
  const price = new BigDecimal(ethAmount.toString()).dividedBy(amount.toString());

  let monster: Monster | undefined = await context.Monster.get(srcAddress);

  if (!monster) {    
    const depositsTotal = isBuy ? ethAmount : 0n; 
    const withdrawalsTotal = isBuy ? 0n : ethAmount;
    const experiencePoints = calculateExperiencePoints(depositsTotal, withdrawalsTotal);

    monster = {
      id: srcAddress,
      supply: amount,
      price: price,
      marketCap: price.multipliedBy(amount.toString()),
      totalVolumeTraded: ethAmount,
      depositsTotal: depositsTotal,
      withdrawalsTotal: withdrawalsTotal,      
      experiencePoints: experiencePoints,    
      totalWinsCount: 0,
      totalLossesCount: 0,
      winLoseRatio: 0,
    }
  } else {
    const supply = isBuy ? monster.supply + amount : monster.supply - amount;
    const depositsTotal = isBuy ? monster.depositsTotal + ethAmount : monster.depositsTotal; 
    const withdrawalsTotal = isBuy ? monster.withdrawalsTotal : monster.withdrawalsTotal + ethAmount;
    const experiencePoints = calculateExperiencePoints(depositsTotal, withdrawalsTotal);

    monster = {
      ...monster,
      supply: supply,
      price: price,
      marketCap: price.multipliedBy(supply.toString()),
      totalVolumeTraded: monster.totalVolumeTraded + ethAmount,
      depositsTotal: depositsTotal,
      withdrawalsTotal: withdrawalsTotal,
      experiencePoints: experiencePoints, 
    }
  }

  context.Monster.set(monster);
  
  const trade: Trade = {
    id: hash + "-" + logIndex,
    txHash: hash,
    logIndex: logIndex,
    monster: srcAddress,
    trader: trader,
    tradeType: isBuy ? "BUY" : "SELL",
    amount: amount,
    ethAmount: ethAmount,
    blockTimestamp: BigInt(timestamp),
    blockNumber: BigInt(number),
  }

  context.Trade.set(trade);

  let traderEntity: Trader | undefined = await context.Trader.get(trader);
  if (!traderEntity) {
    traderEntity = {
      id: trader,
      numberOfTrades: 1,      
      points: ethAmount * BigInt(TRADE_POINTS_MULTIPLIER), 
    }
  } else {
    traderEntity = {
      ...traderEntity,
      numberOfTrades: traderEntity.numberOfTrades + 1,
      points: traderEntity.points + (ethAmount * BigInt(TRADE_POINTS_MULTIPLIER)),
    }
  }

  context.Trader.set(traderEntity);

  const marketCapSnapshot: MarketCapSnapshot = {
    id: hash + "-" + logIndex,
    monster: srcAddress,
    timestamp: BigInt(timestamp),
    supply: monster.supply,
    price: monster.price,
    marketCap: monster.marketCap,
  }

  context.MarketCapSnapshot.set(marketCapSnapshot);

  const totalVolumeTradedSnapshot: TotalVolumeTradedSnapshot = {
    id: hash + "-" + logIndex,
    monster: srcAddress,
    timestamp: BigInt(timestamp),
    totalVolumeTraded: monster.totalVolumeTraded,
  }

  context.TotalVolumeTradedSnapshot.set(totalVolumeTradedSnapshot);    

  // update the current holding for the trader
  await createOrUpdateHoldings(context, monster, trader, isBuy ? amount : -amount, monster.price, hash, logIndex, srcAddress, timestamp);
  
});


CreatureBoringToken.Transfer.handler(async ({ event, context }) => {
  const { from, to, value } = event.params;  
  const { hash } = event.transaction
  const { logIndex, srcAddress } = event
  const { timestamp, number } = event.block

  let monster = await context.Monster.get(event.srcAddress);

  if (!monster) {
    context.log.error("Transfering a non existent token") // this will show with current monster creation logic - needs the factory deployment version
    return;
  } else {

    const transferVolume = new BigDecimal(value.toString()).multipliedBy(monster.price)    
    const transferVolumeBn = BigInt(transferVolume.integerValue().toString()) 

    monster = {
      ...monster,
      totalVolumeTraded: monster.totalVolumeTraded + transferVolumeBn,
    }
    context.Monster.set(monster);
  }

  const tradeOut: Trade = {
    id: hash + "-" + logIndex + "-" + from,
    txHash: hash,
    logIndex: logIndex,
    monster: srcAddress,
    trader: from,
    tradeType: "TRANSFER_OUT" ,
    amount: value,
    ethAmount: 0n,
    blockTimestamp: BigInt(timestamp),
    blockNumber: BigInt(number),
  }

  context.Trade.set(tradeOut);

  const tradeIn: Trade = {
    id: hash + "-" + logIndex + "-" + to,
    txHash: hash,
    logIndex: logIndex,
    monster: srcAddress,
    trader: to,
    tradeType: "TRANSFER_IN" ,
    amount: value,
    ethAmount: 0n,
    blockTimestamp: BigInt(timestamp),
    blockNumber: BigInt(number),
  }

  context.Trade.set(tradeIn);

  // update the current holding for the from address 
  await createOrUpdateHoldings(context, monster, from, 0n - value, monster.price, hash, logIndex, srcAddress, timestamp);

  // update the current holding for the to address
  await createOrUpdateHoldings(context, monster, to, value, monster.price, hash, logIndex, srcAddress, timestamp);

})

CreatureBoringToken.BattleEnded.handler(async ({ event, context }) => {
  const { winner, loser, transferredValue } = event.params;

  let trader = await context.Trader.get(winner);

  if (!trader) {
    context.log.error("Battle ended on a non existent trader") 
    return
  }

  const currentHoldngs = await context.CurrentHoldings.get(event.srcAddress + "-" + winner);

  if (!currentHoldngs) {
    context.log.error("Winner found for a trader with no tokens") 
    return
  }

  const additionalPoints = new BigDecimal(WIN_POINTS_MULTIPLIER).multipliedBy(new BigDecimal(currentHoldngs.balance.toString()));

  trader = {
    ...trader,
    points: trader.points + BigInt(additionalPoints.integerValue().toString()),
  }

  context.Trader.set(trader);

  let monster = await context.Monster.get(event.srcAddress);
  if (!monster) {
    context.log.error("Battle ended on a non existent token") 
  } else {
    const isWin = winner == event.srcAddress;
    const newTotalWinsCount = monster.totalWinsCount + (isWin ? 1 : 0);
    const newTotalLossesCount = monster.totalLossesCount + (!isWin ? 1 : 0);
    const newWinLoseRatio = newTotalWinsCount / (newTotalWinsCount + newTotalLossesCount);

    monster = {
      ...monster,
      totalWinsCount: newTotalWinsCount,
      totalLossesCount: newTotalLossesCount,
      winLoseRatio: newWinLoseRatio,
    }    
    context.Monster.set(monster);
  }

})
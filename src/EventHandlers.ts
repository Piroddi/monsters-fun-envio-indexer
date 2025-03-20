import {
  CreatureBoringFactory,
  CreatureBoringToken,
  Monster,
  Trade,
  Trader,  
  MarketCapSnapshot,
  TotalVolumeTradedSnapshot,  
  BigDecimal,
} from "generated";

import { createOrUpdateHoldings } from "./helpers/Holdings";

import { WIN_POINTS_MULTIPLIER, TRADE_POINTS_MULTIPLIER } from "./constants";

CreatureBoringFactory.ERC20Initialized.contractRegister(({event, context}) => {
  context.addCreatureBoringToken(event.params.tokenAddress)
},
{
  preRegisterDynamicContracts: true
});

CreatureBoringFactory.ERC20Initialized.handler(async ({event, context}) =>{
  const { tokenAddress, name, symbol, initialSupply } = event.params;

  const monster = {
    id: tokenAddress,
    name: name,
    symbol: symbol,
    supply: initialSupply,
    price: new BigDecimal(0),
    marketCap: new BigDecimal(0),
    totalVolumeTraded: 0n,
    depositsTotal: 0n,
    withdrawalsTotal: 0n,      
    experiencePoints: new BigDecimal(0),    
    totalWinsCount: 0,
    totalLossesCount: 0,
    winLoseRatio: 0,
  }

  context.Monster.set(monster);
})

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
    context.log.error("Trade event emitted for a non existent monster")
    return;
  } else {
    const supply = isBuy ? monster.supply + amount : monster.supply - amount; // todo: validate this isn't double counting
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

  let monster: Monster | undefined = await context.Monster.get(srcAddress);

  if (!monster) {
    context.log.error("Transfer event emitted for a non existent monster")
    return;
  } else {

    const transferVolume = new BigDecimal(value.toString()).multipliedBy(monster.price)    
    const transferVolumeBn = BigInt(transferVolume.integerValue().toString()) 

    monster = {
      ...monster,
      totalVolumeTraded: monster.totalVolumeTraded + transferVolumeBn,
    }
    
  }

  context.Monster.set(monster);

  let traderEntity: Trader | undefined = await context.Trader.get(to);

  if (!traderEntity) {
    traderEntity = {
      id: to,
      numberOfTrades: 0,      
      points: 0n
    }
    context.Trader.set(traderEntity);
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

  // todo
  // let trader = await context.Trader.get(trader);

  // const additionalPoints = new BigDecimal(WIN_POINTS_MULTIPLIER).multipliedBy(new BigDecimal(currentHoldngs.balance.toString()));

  // trader = {
  //   ...trader,
  //   points: trader.points + BigInt(additionalPoints.integerValue().toString()),
  // }

  // context.Trader.set(trader);

  let monster = await context.Monster.get(winner);
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
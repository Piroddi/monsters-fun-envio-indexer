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

import { createOrUpdateHoldingsTransfer, updateHoldingsTrade } from "./helpers/Holdings";

import { WIN_POINTS_MULTIPLIER, TRADE_POINTS_MULTIPLIER, MONSTER_XP_MULTIPLIER } from "./constants";

CreatureBoringFactory.ERC20Initialized.contractRegister(({event, context}) => {
  context.addCreatureBoringToken(event.params.tokenAddress)
}, {preRegisterDynamicContracts: true});

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


CreatureBoringToken.Transfer.handler(async ({ event, context }) => {
  const { from, to, value } = event.params;  
  const { hash } = event.transaction
  const { logIndex, srcAddress } = event
  const { timestamp, number } = event.block

  let monster: Monster | undefined = await context.Monster.get(srcAddress);

  if (!monster) {
    context.log.error("Transfer event emitted for a non existent monster")
    return;
  }   

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
    logIndexTransfer: logIndex,
    logIndexTrade: -1,
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
    logIndexTransfer: logIndex,
    logIndexTrade: -1,
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
  await createOrUpdateHoldingsTransfer(context, monster, from, 0n - value, monster.price, hash, logIndex, srcAddress, timestamp);

  // update the current holding for the to address
  await createOrUpdateHoldingsTransfer(context, monster, to, value, monster.price, hash, logIndex, srcAddress, timestamp);

})


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
    const supply = isBuy ? monster.supply + amount : monster.supply - amount;
    const depositsTotal = isBuy ? monster.depositsTotal + ethAmount : monster.depositsTotal; 
    const withdrawalsTotal = isBuy ? monster.withdrawalsTotal : monster.withdrawalsTotal + ethAmount;
    const experiencePointsChange =  new BigDecimal((ethAmount * BigInt(MONSTER_XP_MULTIPLIER)).toString())
    const experiencePoints = isBuy ? monster.experiencePoints.plus(experiencePointsChange) : monster.experiencePoints.minus(experiencePointsChange)

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
    
  const tradeId = hash + "-" + (logIndex - 1) + "-" + trader; // we subtract 1 from the logIndex as that is the logIndex of the transfer event due to the trade
  let trade: Trade | undefined = await context.Trade.get(tradeId);

  if (!trade) {
    context.log.warn("Since a transfer event is always emitted before a trade event, this case should be impossible")    
  } else {
    trade = {
      ...trade,
      tradeType: isBuy ? "BUY" : "SELL",
      logIndexTrade: logIndex,
      ethAmount: ethAmount,      
    }
  
    context.Trade.set(trade);    
  }


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
  await updateHoldingsTrade(context, monster, trader, isBuy ? amount : -amount, monster.price, hash, logIndex, srcAddress, timestamp);
  
});


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
    context.log.error("Battle ended on a non existent monster") 
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
import {
  BigDecimal,
  CreatureBoringToken,
  Monster,
  Trade,
  Trader,
  Holdings,
  MarketCapSnapshot,
  TotalVolumeTradedSnapshot
} from "generated";

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
      experiencePoints: experiencePoints
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
    token: srcAddress,
    trader: trader,
    isBuy: isBuy,
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
    }
  } else {
    traderEntity = {
      ...traderEntity,
      numberOfTrades: traderEntity.numberOfTrades + 1,
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
});

CreatureBoringToken.Transfer.handler(async ({ event, context }) => {
  const { from, to, value } = event.params;  

  let holdingFrom: Holdings | undefined = await context.Holdings.get(event.srcAddress + "-" +  from);
  
  if (!holdingFrom) {
    // this can only be the zero address
    holdingFrom = {
      id: event.srcAddress + "-" + from,
      monster: event.srcAddress,
      trader: from,
      balance: 0n - value, 
    }
  } else {
    holdingFrom = {
      ...holdingFrom,
      balance: holdingFrom.balance - value,
    }
  }

  context.Holdings.set(holdingFrom);

  let holdingTo: Holdings | undefined = await context.Holdings.get(event.srcAddress + "-" + to);

  if (!holdingTo) {
    holdingTo = {
      id: event.srcAddress + "-" + to,
      monster: event.srcAddress,
      trader: to,
      balance: value,
    }
  }
  else {
    holdingTo = {
      ...holdingTo,
      balance: holdingTo.balance + value,
    }
  }

  context.Holdings.set(holdingTo);  

  let monster = await context.Monster.get(event.srcAddress);
  if (!monster) {
    context.log.error("Transfering a non existent token") // this will show with current monster creation logic
  } else {

    const transferVolume = new BigDecimal(value.toString()).multipliedBy(monster.price)    
    const transferVolumeBn = BigInt(transferVolume.integerValue().toString()) 

    monster = {
      ...monster,
      totalVolumeTraded: monster.totalVolumeTraded + transferVolumeBn,
    }
  }

})
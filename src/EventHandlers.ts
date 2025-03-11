import {
  BigDecimal,
  CreatureBoringToken,
  Monster,
  Trade,
  Trader,
  Holdings
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
      depositsTotal: depositsTotal,
      withdrawalsTotal: withdrawalsTotal,
      experiencePoints: experiencePoints, 
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
    blockNumber: BigInt(number),
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

})
/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  CreatureBoringToken,
  CreatureBoringToken_Approval,
  CreatureBoringToken_BattleEnded,
  CreatureBoringToken_BattleStarted,
  CreatureBoringToken_OwnershipTransferred,
  CreatureBoringToken_Paused,
  CreatureBoringToken_TokensMigrated,
  CreatureBoringToken_Trade,
  CreatureBoringToken_Transfer,
  CreatureBoringToken_Unpaused,
  CreatureBoringToken_WhitelistPurchase,
} from "generated";

CreatureBoringToken.Approval.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_Approval = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    spender: event.params.spender,
    value: event.params.value,
  };

  context.CreatureBoringToken_Approval.set(entity);
});

CreatureBoringToken.BattleEnded.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_BattleEnded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    winner: event.params.winner,
    loser: event.params.loser,
    transferredValue: event.params.transferredValue,
  };

  context.CreatureBoringToken_BattleEnded.set(entity);
});

CreatureBoringToken.BattleStarted.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_BattleStarted = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    opponent: event.params.opponent,
  };

  context.CreatureBoringToken_BattleStarted.set(entity);
});

CreatureBoringToken.OwnershipTransferred.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_OwnershipTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };

  context.CreatureBoringToken_OwnershipTransferred.set(entity);
});

CreatureBoringToken.Paused.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_Paused = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    account: event.params.account,
  };

  context.CreatureBoringToken_Paused.set(entity);
});

CreatureBoringToken.TokensMigrated.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_TokensMigrated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    account: event.params.account,
    amount: event.params.amount,
  };

  context.CreatureBoringToken_TokensMigrated.set(entity);
});

CreatureBoringToken.Trade.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_Trade = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    trader: event.params.trader,
    isBuy: event.params.isBuy,
    amount: event.params.amount,
    ethAmount: event.params.ethAmount,
    protocolFee: event.params.protocolFee,
  };

  context.CreatureBoringToken_Trade.set(entity);
});

CreatureBoringToken.Transfer.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
  };

  context.CreatureBoringToken_Transfer.set(entity);
});

CreatureBoringToken.Unpaused.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_Unpaused = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    account: event.params.account,
  };

  context.CreatureBoringToken_Unpaused.set(entity);
});

CreatureBoringToken.WhitelistPurchase.handler(async ({ event, context }) => {
  const entity: CreatureBoringToken_WhitelistPurchase = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    buyer: event.params.buyer,
    amount: event.params.amount,
  };

  context.CreatureBoringToken_WhitelistPurchase.set(entity);
});

//transfer
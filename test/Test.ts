import { TestHelpers } from '../generated';
import { assert } from 'chai';
import { mockAddresses, defaultAddress } from '../generated/src/TestHelpers_MockAddresses.gen';
import { TRADE_POINTS_MULTIPLIER, WIN_POINTS_MULTIPLIER } from '../src/constants';

const {  CreatureBoringFactory, CreatureBoringToken, MockDb } = TestHelpers;

describe('CreatureBoringFactory', () => {
  describe('TokenCreated', async () => {
    it('should update a monsters name symbol and supply', async () => {

    const mockDb = MockDb.createMockDb();

    const params = {
      tokenAddress: mockAddresses[0],
      name: "mock monster",
      symbol: "mm",      
    }

    const event = CreatureBoringFactory.TokenCreated.createMockEvent(params);

    const updatedMockDB = await CreatureBoringFactory.TokenCreated.processEvent({ event, mockDb });

    const monster = updatedMockDB.entities.Monster.get(mockAddresses[0]);

    assert.isNotNull(monster);
    assert.equal(monster?.id, mockAddresses[0]);
    assert.equal(monster?.name, params.name);
    assert.equal(monster?.symbol, params.symbol);
    assert.equal(monster?.totalVolumeTraded, 0n);
    assert.equal(monster?.depositsTotal, 0n);
    assert.equal(monster?.withdrawalsTotal, 0n);

  })
  })
})

describe('CreatureBoringToken', () => {  

  // Create mutable ref to mockDb
  const dbContainer: { mockDb: ReturnType<typeof MockDb.createMockDb> } = { 
    mockDb: MockDb.createMockDb() 
  };

  beforeEach(async () => {
    dbContainer.mockDb = MockDb.createMockDb();
    
    const ownershipTransferredParams = {
      previousOwner: defaultAddress,
      newOwner: mockAddresses[1],      
    };

    const ownershipTransferredEvent = CreatureBoringToken.OwnershipTransferred.createMockEvent(ownershipTransferredParams);

    dbContainer.mockDb = await CreatureBoringToken.OwnershipTransferred.processEvent({
      event: ownershipTransferredEvent,
      mockDb: dbContainer.mockDb,
    });

    const unpausedParams = {
      account: defaultAddress,      
    };

    const unpausedParamsEvent = CreatureBoringToken.Unpaused.createMockEvent(unpausedParams);

    dbContainer.mockDb = await CreatureBoringToken.Unpaused.processEvent({
      event: unpausedParamsEvent,
      mockDb: dbContainer.mockDb,
    });

    const erc20InitializedParams = {
      tokenAddress: defaultAddress,
      name: "mock monster",
      symbol: "mm",      
    };

    const erc20InitializedEvent = CreatureBoringFactory.TokenCreated.createMockEvent(erc20InitializedParams);
    dbContainer.mockDb = await CreatureBoringFactory.TokenCreated.processEvent({
      event: erc20InitializedEvent,
      mockDb: dbContainer.mockDb,
    });

  });

  describe('Trade', () => {         
    it('on buy should increase monster supply and update depositsTotal', async () => {            

      const mockDb = dbContainer.mockDb

      const transferLogIndex = 1;
      const transferEvent = CreatureBoringToken.Transfer.createMockEvent({
        from: mockAddresses[0],
        to: mockAddresses[1],
        value: BigInt(1),        
        mockEventData: {
          logIndex: transferLogIndex,                    
        }
      });

      const mockDb2 = await CreatureBoringToken.Transfer.processEvent({ event: transferEvent, mockDb });      

      const tradeEvent = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH        
        mockEventData: {
          logIndex: transferLogIndex + 1,                    
        }
      });

      const mockDb3 = await CreatureBoringToken.Trade.processEvent({ event: tradeEvent, mockDb: mockDb2 });      
      
      const transferEvent2 = CreatureBoringToken.Transfer.createMockEvent({
        from: mockAddresses[0],
        to: mockAddresses[1],
        value: BigInt(1),        
        mockEventData: {
          logIndex: transferLogIndex,                    
        }
      });

      const mockDb4 = await CreatureBoringToken.Transfer.processEvent({ event: transferEvent2, mockDb: mockDb3 });   

      const tradeEvent2 = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[1],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(2000000000000000000), // 2 ETH
        protocolFee: BigInt(100000000000000000), // 0.1 ETH
        mockEventData: {
          logIndex: transferLogIndex + 1,                    
        }
      });

      const mockDb5 = await CreatureBoringToken.Trade.processEvent({ event: tradeEvent2, mockDb: mockDb4 });

      const monster = await mockDb5.entities.Monster.get(defaultAddress);      
      
      assert.equal(monster?.supply, BigInt(2)); // 1 + 1
      assert.equal(monster?.totalVolumeTraded, BigInt(3000000000000000000)); // 1 + 2 ETH
      assert.equal(monster?.depositsTotal, BigInt(3000000000000000000)); // 1 + 2 ETH
      assert.equal(monster?.withdrawalsTotal, 0n);
    });

    it('should create/update trader entities with correct points', async () => {
      const mockDb = dbContainer.mockDb
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH      
      });

      const updateMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      const trader = await updateMockDB.entities.Trader.get(mockAddresses[0]);

      assert.isNotNull(trader);
      assert.equal(trader?.id, mockAddresses[0]);
      assert.equal(trader?.numberOfTrades, 1);
      // Points should be ethAmount * TRADE_POINTS_MULTIPLIER (50)
      assert.equal(trader?.points, BigInt(1000000000000000000) * BigInt(TRADE_POINTS_MULTIPLIER));
    });

    it('should calculate monster experience points correctly', async () => {
      const mockDb = dbContainer.mockDb      

      // 3 eth buy
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(3_000_000_000_000_000_000), // 3 ETH 
        protocolFee: BigInt(0),        
      });

      const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      // 1 eth sell
      const event2 = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[1],
        isBuy: false,
        amount: BigInt(1),
        ethAmount: BigInt(1_000_000_000_000_000_000), // 1 ETH
        protocolFee: BigInt(0),        
      });

      const updatedMockDB2 = await CreatureBoringToken.Trade.processEvent({ event: event2, mockDb: updatedMockDB });

      const monster = await updatedMockDB2.entities.Monster.get(defaultAddress);
      assert.isNotNull(monster);
      // Experience points should be (depositsTotal - withdrawalsTotal) * MONSTER_XP_MULTIPLIER
      // (3-1)*2
      assert.equal(monster?.experiencePoints.toString(), '4000000000000000000');
    });

    it('should update monster total volume traded on trade', async () => {
      const mockDb = dbContainer.mockDb      

      // 3 eth buy
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(3_000_000_000_000_000_000), // 3 ETH 
        protocolFee: BigInt(0),        
      });

      const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      const monster = await updatedMockDB.entities.Monster.get(defaultAddress);
      assert.equal(monster?.totalVolumeTraded, BigInt(3_000_000_000_000_000_000));
    });
  });

  describe('Transfer', () => {
    it('should create TRANSFER_OUT and TRANSFER_IN trades', async () => {
      const mockDb = dbContainer.mockDb
      
      const transferEvent = CreatureBoringToken.Transfer.createMockEvent({
        from: mockAddresses[0],
        to: mockAddresses[1],
        value: BigInt(1),        
        mockEventData: {
          logIndex: 1,                    
          transaction: { hash: "hash"},
        }
      });

      const mockDb2 = await CreatureBoringToken.Transfer.processEvent({ event: transferEvent, mockDb });

      const fromTrade = await mockDb2.entities.Trade.get("hash-1-" + mockAddresses[0]);
      const toTrade = await mockDb2.entities.Trade.get("hash-1-"+ mockAddresses[1]);
    
      assert.equal(fromTrade?.tradeType, "TRANSFER_OUT");
      assert.equal(toTrade?.tradeType, "TRANSFER_IN");

    });    
  });
  
  describe('BattleEnded', () => {
    it('should increment win count on win', async () => {
      const mockDb = dbContainer.mockDb      

      const event = CreatureBoringToken.BattleEnded.createMockEvent({
        winner: mockAddresses[0],
        loser: mockAddresses[1],
        transferredValue: BigInt(1),
      });

      const updatedMockDB = await CreatureBoringToken.BattleEnded.processEvent({ event, mockDb });

      const monster = await updatedMockDB.entities.Monster.get(defaultAddress);
    
      assert.equal(monster?.id, defaultAddress);
      assert.equal(monster?.totalWinsCount, 1);
      assert.equal(monster?.totalLossesCount, 0);
      assert.equal(monster?.winLoseRatio, 1);    
    });    
  }); 
});

import { TestHelpers } from '../generated';
import { assert } from 'chai';
import { mockAddresses, defaultAddress } from '../generated/src/TestHelpers_MockAddresses.gen';
import { TRADE_POINTS_MULTIPLIER, WIN_POINTS_MULTIPLIER } from '../src/constants';

const {  CreatureBoringFactory, CreatureBoringToken, MockDb } = TestHelpers;

describe('CreatureBoringFactory', () => {
  describe('ERC20Initialized', async () => {
    it('should create a new monster on erc20 initialized', async () => {

    const mockDb = MockDb.createMockDb();

    const params = {
      tokenAddress: mockAddresses[0],
      name: "mock monster",
      symbol: "mm",
      initialSupply: 0n,
    }

    const event = CreatureBoringFactory.ERC20Initialized.createMockEvent(params);

    const updatedMockDB = await CreatureBoringFactory.ERC20Initialized.processEvent({ event, mockDb });

    const monster = updatedMockDB.entities.Monster.get(mockAddresses[0]);

    assert.isNotNull(monster);
    assert.equal(monster?.id, mockAddresses[0]);
    assert.equal(monster?.supply, 0n);
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
    
    const params = {
      tokenAddress: defaultAddress,
      name: "mock monster",
      symbol: "mm",
      initialSupply: BigInt(1),
    };

    const event = CreatureBoringFactory.ERC20Initialized.createMockEvent(params);
    dbContainer.mockDb = await CreatureBoringFactory.ERC20Initialized.processEvent({
      event,
      mockDb: dbContainer.mockDb,
    });
  });

  describe('Trade', () => {         
    it('on buy should increase monster supply and update depositsTotal', async () => {

      const mockDb = dbContainer.mockDb      

      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH
      });

      const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      const event2 = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[1],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(2000000000000000000), // 2 ETH
        protocolFee: BigInt(100000000000000000), // 0.1 ETH
      });

      const updatedMockDB2 = await CreatureBoringToken.Trade.processEvent({ event: event2, mockDb: updatedMockDB });

      const monster = await updatedMockDB2.entities.Monster.get(defaultAddress);      
      
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
  });

  describe('Transfer', () => {
    it('should create TRANSFER_OUT and TRANSFER_IN trades', async () => {});
    it('should update monster total volume traded on transfer', async () => {});
  });
  
  describe('BattleEnded', () => {
    it.only('should increment win count on win', async () => {
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


describe('Entities', () => {  
  describe('CurrentHoldings', () => {
    it('should update holdings on buy trade', async () => {
      const mockDb = MockDb.createMockDb();
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH       
      });

      const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      const holdings = await updatedMockDB.entities.CurrentHoldings.get(`${defaultAddress}-${mockAddresses[0]}`);
      assert.isNotNull(holdings);
      assert.equal(holdings?.trader, mockAddresses[0]);
      assert.equal(holdings?.monster_id, defaultAddress);
      assert.equal(holdings?.balance, BigInt(1));
      assert.equal(holdings?.price.toString(), '1000000000000000000'); // 1 ETH
      assert.equal(holdings?.marketCap.toString(), '1000000000000000000'); // 1 ETH
      assert.equal(holdings?.averageHoldingsCost.toString(), '1000000000000000000'); // 1 ETH
    });    
  });
});
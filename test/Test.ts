import { TestHelpers } from '../generated';
import { assert } from 'chai';
import { mockAddresses, defaultAddress } from '../generated/src/TestHelpers_MockAddresses.gen';
import { TRADE_POINTS_MULTIPLIER, WIN_POINTS_MULTIPLIER } from '../src/constants';

const { CreatureBoringToken, MockDb } = TestHelpers;

describe('CreatureBoringToken', () => {
  describe('Trade', () => {
    it('should create a new monster on first trade', async () => {
      const mockDb = MockDb.createMockDb();
      const event = CreatureBoringToken.Trade.createMockEvent({        
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH
        mockEventData: {
          srcAddress: defaultAddress,
          block: {
            number: 1,
            timestamp: 1000,
            hash: '0x123'
          },
          transaction: {
            hash: '0x456'
          }
        }
      });

      const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      const monster = updatedMockDB.entities.Monster.get(defaultAddress);

      assert.isNotNull(monster);
      assert.equal(monster?.id, defaultAddress);
      assert.equal(monster?.supply, BigInt(1));
      assert.equal(monster?.totalVolumeTraded, BigInt(1000000000000000000));
      assert.equal(monster?.depositsTotal, BigInt(1000000000000000000));
      assert.equal(monster?.withdrawalsTotal, BigInt(0));
    });

    it('should update existing monster on subsequent trades', async () => {
      const mockDb = MockDb.createMockDb();
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH
        mockEventData: {
          srcAddress: defaultAddress,
          block: {
            number: 1,
            timestamp: 1000,
            hash: '0x123'
          },
          transaction: {
            hash: '0x456'
          }
        }
      });

      const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      const event2 = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[1],
        isBuy: false,
        amount: BigInt(1),
        ethAmount: BigInt(2000000000000000000), // 2 ETH
        protocolFee: BigInt(100000000000000000), // 0.1 ETH
        mockEventData: {
          srcAddress: defaultAddress,
          block: {
            number: 2,
            timestamp: 2000,
            hash: '0x789'
          },
          transaction: {
            hash: '0xabc'
          }
        }
      });

      const updatedMockDB2 = await CreatureBoringToken.Trade.processEvent({ event: event2, mockDb: updatedMockDB });

      const monster = await updatedMockDB2.entities.Monster.get(defaultAddress);
      assert.isNotNull(monster);
      assert.equal(monster?.id, defaultAddress);
      assert.equal(monster?.supply, BigInt(0)); // 1 - 1
      assert.equal(monster?.totalVolumeTraded, BigInt(3000000000000000000)); // 1 + 2 ETH
      assert.equal(monster?.depositsTotal, BigInt(1000000000000000000)); // Only from first trade
      assert.equal(monster?.withdrawalsTotal, BigInt(2000000000000000000)); // From second trade
    });

    it('should create/update trader entities with correct points', async () => {
      const mockDb = MockDb.createMockDb();
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH
        mockEventData: {
          srcAddress: defaultAddress,
          block: {
            number: 1,
            timestamp: 1000,
            hash: '0x123'
          },
          transaction: {
            hash: '0x456'
          }
        }
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
      const mockDb = MockDb.createMockDb();
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(3_000_000_000_000_000_000), // 3 ETH 
        protocolFee: BigInt(0), 
        mockEventData: {
          srcAddress: defaultAddress,
          block: {
            number: 1,
            timestamp: 1000,
            hash: '0x123'
          },
          transaction: {
            hash: '0x456'
          }
        }
      });

      const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event, mockDb });

      const event2 = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[1],
        isBuy: false,
        amount: BigInt(1),
        ethAmount: BigInt(1_000_000_000_000_000_000), // 1 ETH
        protocolFee: BigInt(0), 
        mockEventData: {
          srcAddress: defaultAddress,
          block: {
            number: 2,
            timestamp: 2000,
            hash: '0x789'
          },
          transaction: {
            hash: '0xabc'
          }
        }
      });

      const updatedMockDB2 = await CreatureBoringToken.Trade.processEvent({ event: event2, mockDb: updatedMockDB });

      const monster = await updatedMockDB2.entities.Monster.get(defaultAddress);
      assert.isNotNull(monster);
      // Experience points should be (depositsTotal - withdrawalsTotal)^(1/4)
      // (3-1)^(1/4)      
      // 3^(1/4)
      assert.equal(monster?.experiencePoints.toString(), '37606.03093086393');
    });
  });

  describe('Transfer', () => {
    it('should create TRANSFER_OUT and TRANSFER_IN trades', async () => {});
    it('should update monster total volume traded on transfer', async () => {});
  });

  describe('CurrentHoldings', () => {
    it('should update holdings on buy trade', async () => {
      const mockDb = MockDb.createMockDb();
      const event = CreatureBoringToken.Trade.createMockEvent({
        trader: mockAddresses[0],
        isBuy: true,
        amount: BigInt(1),
        ethAmount: BigInt(1000000000000000000), // 1 ETH
        protocolFee: BigInt(50000000000000000), // 0.05 ETH
        mockEventData: {
          srcAddress: defaultAddress,
          block: {
            number: 1,
            timestamp: 1000,
            hash: '0x123'
          },
          transaction: {
            hash: '0x456'
          }
        }
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

    it('should update holdings on sell trade', async () => {});
    //   const mockDb = MockDb.createMockDb();
    //   // First buy
    //   const buyEvent = CreatureBoringToken.Trade.createMockEvent({
    //     trader: mockAddresses[0],
    //     isBuy: true,
    //     amount: BigInt(2),
    //     ethAmount: BigInt(2000000000000000000), // 2 ETH
    //     protocolFee: BigInt(100000000000000000), // 0.1 ETH
    //     mockEventData: {
    //       srcAddress: defaultAddress,
    //       block: {
    //         number: 1,
    //         timestamp: 1000,
    //         hash: '0x123'
    //       },
    //       transaction: {
    //         hash: '0x456'
    //       }
    //     }
    //   });

    //   const updatedMockDB = await CreatureBoringToken.Trade.processEvent({ event: buyEvent, mockDb });

    //   // Then transfer
    //   const transferEvent = CreatureBoringToken.Transfer.createMockEvent({
    //     from: mockAddresses[0],
    //     to: mockAddresses[1],
    //     value: BigInt(1),
    //     mockEventData: {
    //       srcAddress: defaultAddress,
    //       block: {
    //         number: 2,
    //         timestamp: 2000,
    //         hash: '0x789'
    //       },
    //       transaction: {
    //         hash: '0xabc'
    //       }
    //     }
    //   });

    //   const updatedMockDB2 = await CreatureBoringToken.Transfer.processEvent({ event: transferEvent, mockDb: updatedMockDB });

    //   // Check sender's holdings
    //   const senderHoldings = await updatedMockDB2.entities.CurrentHoldings.get(`${defaultAddress}-${mockAddresses[0]}`);
    //   assert.isNotNull(senderHoldings);
    //   assert.equal(senderHoldings?.balance, BigInt(1)); // 2 - 1
    //   assert.equal(senderHoldings?.averageHoldingsCost.toString(), '1000000000000000000'); // Still 1 ETH (average of buy)

    //   // Check receiver's holdings
    //   const receiverHoldings = await updatedMockDB2.entities.CurrentHoldings.get(`${defaultAddress}-${mockAddresses[1]}`);
    //   assert.isNotNull(receiverHoldings);
    //   assert.equal(receiverHoldings?.balance, BigInt(1));
    //   assert.equal(receiverHoldings?.averageHoldingsCost.toString(), '1000000000000000000'); // Same as sender's average
    // });
  });
});

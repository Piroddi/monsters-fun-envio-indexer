import assert from "assert";
import { 
  TestHelpers,
  CreatureBoringToken_Approval
} from "generated";
const { MockDb, CreatureBoringToken } = TestHelpers;

describe("CreatureBoringToken contract Approval event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for CreatureBoringToken contract Approval event
  const event = CreatureBoringToken.Approval.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("CreatureBoringToken_Approval is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await CreatureBoringToken.Approval.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualCreatureBoringTokenApproval = mockDbUpdated.entities.CreatureBoringToken_Approval.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedCreatureBoringTokenApproval: CreatureBoringToken_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualCreatureBoringTokenApproval, expectedCreatureBoringTokenApproval, "Actual CreatureBoringTokenApproval should be the same as the expectedCreatureBoringTokenApproval");
  });
});

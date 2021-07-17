import { createConnection } from "typeorm";
import { ActionsManager } from "../../actions/actions-manager";
import { ActionsStorageDatabase } from "../../actions/actions-storage-database";
import { ActionCreateToken, ActionSetHash } from "../../actions/actions-types";
import { DatabaseActionChangeOwner } from "../../database/models/action-change-owner";
import { DatabaseActionCreateToken } from "../../database/models/action-create-token";
import { DatabaseActionMintToken } from "../../database/models/action-mint-token";
import { DatabaseActionSetHash } from "../../database/models/action-set-hash";

let actionsManager: ActionsManager;

beforeEach(async () => {
	const connection = await createConnection({
		type: "sqlite", // SQLite is used for testing purposes because supports DB in RAM
		database: ":memory:",
		dropSchema: true,
		entities: [
			DatabaseActionCreateToken,
			DatabaseActionChangeOwner,
			DatabaseActionSetHash
		],
		synchronize: true,
		logging: false
	});

	const storage = new ActionsStorageDatabase({
		"create": connection.getRepository(DatabaseActionCreateToken),
		"changeOwner": connection.getRepository(DatabaseActionChangeOwner),
		"setHash": connection.getRepository(DatabaseActionSetHash),
		"mint": connection.getRepository(DatabaseActionMintToken)
	});

	actionsManager = new ActionsManager(storage);
});

test("Get and add actions", async () => {
	expect(await actionsManager.getAllActions()).toHaveLength(0);
	expect(await actionsManager.getActionsByTokenId("InvalidTokenId")).toHaveLength(0);
	expect(await actionsManager.getActionsByUserPublicKey("InvalidUserPublicKey")).toHaveLength(0);

	const testAction1: ActionCreateToken = {
		action: "create",
		tokenId: "TestActionToken1",
		address: "TestActionAddress1",
		userPublicKey: "TestActionUserPublicKey1",
		owner: "TestActionOwner1",
		hash: "TestActionHash1",
		time: 0,
		creator: ""
	};

	await actionsManager.addAction(testAction1);

	const allActionsAfterFirstAddition = await actionsManager.getAllActions();
	expect(allActionsAfterFirstAddition).toHaveLength(1);
	expect(allActionsAfterFirstAddition[0]).toMatchObject(testAction1);

	expect(await actionsManager.getActionsByTokenId("InvalidTokenId")).toHaveLength(0);
	expect(await actionsManager.getActionsByUserPublicKey("InvalidUserPublicKey")).toHaveLength(0);

	const actionsByToken1AfterFirstAddition = await actionsManager.getActionsByTokenId("TestActionToken1");
	expect(actionsByToken1AfterFirstAddition).toHaveLength(1);
	expect(actionsByToken1AfterFirstAddition[0]).toMatchObject(testAction1);

	const actionsByPubKey1AfterFirstAddition = await actionsManager.getActionsByUserPublicKey(
		"TestActionUserPublicKey1"
	);
	expect(actionsByPubKey1AfterFirstAddition).toHaveLength(1);
	expect(actionsByPubKey1AfterFirstAddition[0]).toMatchObject(testAction1);

	const actinosByOwner1AfterFirstAddition = await actionsManager.getActionsByOwner("TestActionOwner1");
	expect(actinosByOwner1AfterFirstAddition).toHaveLength(1);
	expect(actinosByOwner1AfterFirstAddition[0]).toMatchObject(testAction1);

	const testAction2: ActionSetHash = {
		action: "setHash",
		tokenId: "TestActionToken2",
		address: "TestActionAddress2",
		userPublicKey: "TestActionUserPublicKey2",
		owner: "TestActionOwner2",
		previousHash: "TestActionPreviousHash2",
		hash: "TestActionHash2",
		time: 1
	};

	await actionsManager.addAction(testAction2);

	const allActionsAfterSecondAddition = await actionsManager.getAllActions();
	expect(allActionsAfterSecondAddition).toHaveLength(2);
	expect(allActionsAfterSecondAddition[0]).toMatchObject(testAction2);
	expect(allActionsAfterSecondAddition[1]).toMatchObject(testAction1);

	const actionsByToken2AfterSecondAddition = await actionsManager.getActionsByTokenId("TestActionToken2");
	expect(actionsByToken2AfterSecondAddition).toHaveLength(1);
	expect(actionsByToken2AfterSecondAddition[0]).toMatchObject(testAction2);

	const actionsByToken1AfterSecondAddition = await actionsManager.getActionsByTokenId("TestActionToken1");
	expect(actionsByToken1AfterSecondAddition).toHaveLength(1);
	expect(actionsByToken1AfterSecondAddition[0]).toMatchObject(testAction1);

	const actionsByPubKey1AfterSecondAddition = await actionsManager.getActionsByUserPublicKey(
		"TestActionUserPublicKey1"
	);
	expect(actionsByPubKey1AfterSecondAddition).toHaveLength(1);
	expect(actionsByPubKey1AfterSecondAddition[0]).toMatchObject(testAction1);

	const actionsByPubKey2AfterSecondAddition = await actionsManager.getActionsByUserPublicKey(
		"TestActionUserPublicKey2"
	);
	expect(actionsByPubKey2AfterSecondAddition).toHaveLength(1);
	expect(actionsByPubKey2AfterSecondAddition[0]).toMatchObject(testAction2);

	const actinosByOwner1AfterSecondAddition = await actionsManager.getActionsByOwner("TestActionOwner1");
	expect(actinosByOwner1AfterSecondAddition).toHaveLength(1);
	expect(actinosByOwner1AfterSecondAddition[0]).toMatchObject(testAction1);

	const actinosByOwner2AfterSecondAddition = await actionsManager.getActionsByOwner("TestActionOwner2");
	expect(actinosByOwner2AfterSecondAddition).toHaveLength(1);
	expect(actinosByOwner2AfterSecondAddition[0]).toMatchObject(testAction2);

	const testAction3: ActionSetHash = {
		action: "setHash",
		tokenId: "TestActionToken2",
		address: "TestActionAddress3",
		userPublicKey: "TestActionUserPublicKey2",
		owner: "TestActionOwner3",
		previousHash: "TestActionPreviousHash3",
		hash: "TestActionHash3",
		time: 2
	};

	await actionsManager.addAction(testAction3);

	const allActionsAfterThirdAddition = await actionsManager.getAllActions();
	expect(allActionsAfterThirdAddition).toHaveLength(3);
	expect(allActionsAfterThirdAddition[0]).toMatchObject(testAction3);
	expect(allActionsAfterThirdAddition[1]).toMatchObject(testAction2);
	expect(allActionsAfterThirdAddition[2]).toMatchObject(testAction1);

	const actionsByToken1AfterThirdAddition = await actionsManager.getActionsByTokenId("TestActionToken1");
	expect(actionsByToken1AfterThirdAddition).toHaveLength(1);
	expect(actionsByToken1AfterThirdAddition[0]).toMatchObject(testAction1);

	const actionsByToken2AfterThirdAddition = await actionsManager.getActionsByTokenId("TestActionToken2");
	expect(actionsByToken2AfterThirdAddition).toHaveLength(2);
	expect(actionsByToken2AfterThirdAddition[0]).toMatchObject(testAction3);
	expect(actionsByToken2AfterThirdAddition[1]).toMatchObject(testAction2);

	const actionsByPubKey1AfterThirdAddition = await actionsManager.getActionsByUserPublicKey(
		"TestActionUserPublicKey1"
	);
	expect(actionsByPubKey1AfterThirdAddition).toHaveLength(1);
	expect(actionsByPubKey1AfterThirdAddition[0]).toMatchObject(testAction1);

	const actionsByPubKey2AfterThirdAddition = await actionsManager.getActionsByUserPublicKey(
		"TestActionUserPublicKey2"
	);
	expect(actionsByPubKey2AfterThirdAddition).toHaveLength(2);
	expect(actionsByPubKey2AfterThirdAddition[0]).toMatchObject(testAction3);
	expect(actionsByPubKey2AfterThirdAddition[1]).toMatchObject(testAction2);
});
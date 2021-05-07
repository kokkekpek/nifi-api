import { createConnection, getConnection } from "typeorm";
import { Token, TokensManager } from "../../tokens/tokens-manager";
import { TokensStorageDatabase } from "../../tokens/tokens-storage-database";
import { DatabaseToken } from "../../database/models/token";

let tokensManager: TokensManager;

beforeEach(async () => {
	const connection = await createConnection({
		type: "sqlite", // SQLite is used for testing purposes because supports DB in RAM
		database: ":memory:",
		dropSchema: true,
		entities: [DatabaseToken],
		synchronize: true,
		logging: false
	});

	const storage = new TokensStorageDatabase(connection.getRepository(DatabaseToken));
	tokensManager = new TokensManager(storage);
});

afterEach(() => {
	return getConnection().close();
});

test("Get and add tokens", async () => {
	expect(await tokensManager.getAllTokens()).toHaveLength(0);
	expect(await tokensManager.getTokensByUserPublicKey("InvalidUserPublicKey")).toHaveLength(0);

	const testToken1: Token = {
		id: "TestTokenId1",
		address: "TestTokenAddress1",
		userPublicKey: "TestTokenUserPublicKey1",
		owner: "TestTokenOwner1",
		hash: "TestTokenHash1"
	};

	expect(await tokensManager.addToken(testToken1)).toBe("success");
	expect(await tokensManager.getTokensByUserPublicKey("InvalidUserPublicKey")).toHaveLength(0);

	const tokensAfterFirstAddition = await tokensManager.getAllTokens();
	expect(tokensAfterFirstAddition).toHaveLength(1);
	expect(tokensAfterFirstAddition[0]).toMatchObject(testToken1);

	const tokensByUserPublicKeyAfterFirstAddition = await tokensManager.getTokensByUserPublicKey(
		"TestTokenUserPublicKey1"
	);
	expect(tokensByUserPublicKeyAfterFirstAddition).toHaveLength(1);
	expect(tokensByUserPublicKeyAfterFirstAddition[0]).toMatchObject(testToken1);

	const testToken2: Token = {
		id: "TestTokenId2",
		address: "TestTokenAddress2",
		userPublicKey: "TestTokenUserPublicKey2",
		owner: "TestTokenOwner2",
		hash: "TestTokenHash2"
	};

	expect(await tokensManager.addToken(testToken2)).toBe("success");

	const tokensAfterSecondAddition = await tokensManager.getAllTokens();
	expect(tokensAfterSecondAddition).toHaveLength(2);
	expect(tokensAfterSecondAddition[0]).toMatchObject(testToken1);
	expect(tokensAfterSecondAddition[1]).toMatchObject(testToken2);

	const tokensByUserPublicKey1AfterSecondAddition = await tokensManager.getTokensByUserPublicKey(
		"TestTokenUserPublicKey1"
	);
	expect(tokensByUserPublicKey1AfterSecondAddition).toHaveLength(1);
	expect(tokensByUserPublicKey1AfterSecondAddition[0]).toMatchObject(testToken1);

	const tokensByUserPublicKey2AfterSecondAddition = await tokensManager.getTokensByUserPublicKey(
		"TestTokenUserPublicKey2"
	);
	expect(tokensByUserPublicKey2AfterSecondAddition).toHaveLength(1);
	expect(tokensByUserPublicKey2AfterSecondAddition[0]).toMatchObject(testToken2);
});

test("Add two tokens with the same id", async () => {
	const testToken1: Token = {
		id: "TestTokenId1",
		address: "TestTokenAddress1",
		userPublicKey: "TestTokenUserPublicKey1",
		owner: "TestTokenOwner1",
		hash: "TestTokenHash1"
	};

	expect(await tokensManager.addToken(testToken1)).toBe("success");
	expect(await tokensManager.addToken(testToken1)).toBe("token_with_such_id_already_exists");
});

test("Add tokens race condition avoid", async () => {
	const testToken1: Token = {
		id: "TestTokenId1",
		address: "TestTokenAddress1",
		userPublicKey: "TestTokenUserPublicKey1",
		owner: "TestTokenOwner1",
		hash: "TestTokenHash1"
	};

	expect((await Promise.all([
		tokensManager.addToken(testToken1),
		tokensManager.addToken(testToken1),
	])).sort()).toMatchObject(["success", "token_with_such_id_already_exists"].sort(undefined));
});

test("Update token", async () => {
	const testToken1: Token = {
		id: "TestTokenId1",
		address: "TestTokenAddress1",
		userPublicKey: "TestTokenUserPublicKey1",
		owner: "TestTokenOwner1",
		hash: "TestTokenHash1"
	};

	await tokensManager.addToken(testToken1);

	await tokensManager.setOwnerByTokenId(testToken1.id, "UPDATEDTestTokenOwner1");

	expect((await tokensManager.getAllTokens())[0]?.owner).toBe("UPDATEDTestTokenOwner1");

	await tokensManager.setHashByTokenId(testToken1.id, "UPDATEDTestTokenHash1");

	const tokens = await tokensManager.getAllTokens();
	expect(tokens[0]?.owner).toBe("UPDATEDTestTokenOwner1");
	expect(tokens[0]?.hash).toBe("UPDATEDTestTokenHash1");

	await tokensManager.setOwnerByTokenId(testToken1.id, "UPDATED2TestTokenOwner1");

	const tokens2 = await tokensManager.getAllTokens();
	expect(tokens2[0]?.owner).toBe("UPDATED2TestTokenOwner1");
	expect(tokens2[0]?.hash).toBe("UPDATEDTestTokenHash1");

	await tokensManager.setHashByTokenId(testToken1.id, "UPDATED2TestTokenHash1");

	const tokens3 = await tokensManager.getAllTokens();
	expect(tokens3[0]?.owner).toBe("UPDATED2TestTokenOwner1");
	expect(tokens3[0]?.hash).toBe("UPDATED2TestTokenHash1");
});

test("Tokens update independently", async () => {
	const testToken1: Token = {
		id: "TestTokenId1",
		address: "TestTokenAddress1",
		userPublicKey: "TestTokenUserPublicKey1",
		owner: "TestTokenOwner1",
		hash: "TestTokenHash1"
	};

	const testToken2: Token = {
		id: "TestTokenId2",
		address: "TestTokenAddress2",
		userPublicKey: "TestTokenUserPublicKey2",
		owner: "TestTokenOwner2",
		hash: "TestTokenHash2"
	};

	await tokensManager.addToken(testToken1);
	await tokensManager.addToken(testToken2);

	await tokensManager.setOwnerByTokenId(testToken1.id, "UPDATEDTestTokenOwner1");

	const tokens = await tokensManager.getAllTokens();
	expect(tokens[0]?.owner).toBe("UPDATEDTestTokenOwner1");
	expect(tokens[1]?.owner).toBe("TestTokenOwner2");
});
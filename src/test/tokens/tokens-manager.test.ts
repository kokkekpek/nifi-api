import { createConnection, getConnection } from "typeorm";
import { Token, TokensManager } from "../../tokens/tokens-manager";
import { TokensStorageDatabase } from "../../tokens/tokens-storage-database";
import { DatabaseToken } from "../../database/models/token";

let tokensManager: TokensManager;

beforeEach(async () => {
	const connection = await createConnection({
		type: "sqlite", // SQLite используется в целях тестирования, т.к. поддерживает БД в ОЗУ
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
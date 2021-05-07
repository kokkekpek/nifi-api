import 'source-map-support/register';
import * as fs from "fs";
import * as rg from "rg";

import { Config } from './config';
import { createDatabase } from './database/database';
import { TokensManager } from './tokens/tokens-manager';
import { TokensStorageDatabase } from './tokens/tokens-storage-database';
import { DatabaseToken } from './database/models/token';

import { libNode } from "@tonclient/lib-node";
import { TonClient } from "@tonclient/core";
import { TonClientRootContract } from './ton/ton-client-root-contract';
import { TonClientTokenContractFactory } from './ton/ton-client-token-contract';
import { TonActionsEvents } from './ton/ton-actions-events';
import { ActionsStorageDatabase } from './actions/actions-storage-database';
import { DatabaseActionChangeOwner } from './database/models/action-change-owner';
import { DatabaseActionCreateToken } from './database/models/action-create-token';
import { DatabaseActionSetHash } from './database/models/action-set-hash';
import { ActionsManager } from './actions/actions-manager';
import { ActionsCollector } from './actions/actions-collector';
import { TokensCollector } from './tokens/tokens-collector';
import { RpcServer } from './rpc/rpc-server';
import { GetActionsByToken } from './rpc-methods/get-actions-by-token';
import { GetActionsByUserPublicKey } from './rpc-methods/get-actions-by-user';
import { GetAllActions } from './rpc-methods/get-all-actions';
import { GetTokensByUserPublicKey } from './rpc-methods/get-tokens-by-user';
import { GetAllTokens } from './rpc-methods/get-all-tokens';

TonClient.useBinaryLibrary(libNode);
async function main(): Promise<void> {
	const RAW_DEFAULT_CONFIG = fs.readFileSync('./config.default.json', 'utf-8');
	let RAW_CONFIG = "{}";

	try {
		RAW_CONFIG = fs.readFileSync("./config.json", "utf-8");
	} catch (err) {
		if (err.code !== "ENOENT") {
			console.error(err);
			process.exit(1);
		}
	}

	const config = rg.getMergedObjects<Config>(
		JSON.parse(RAW_DEFAULT_CONFIG),
		JSON.parse(RAW_CONFIG)
	);

	if (config.isProduction) {
		rg.setProduction();
	}

	console.log("Инициализация базы данных...");
	const db = await createDatabase(config.mysql);

	console.log("Инициализация менеджера токенов...");
	const tokensStorage = new TokensStorageDatabase(db.getRepository(DatabaseToken));
	const tokensManager = new TokensManager(tokensStorage);

	console.log("Инициализация менеджера действий...");
	const actionsStorage = new ActionsStorageDatabase({
		changeOwner: db.getRepository(DatabaseActionChangeOwner),
		create: db.getRepository(DatabaseActionCreateToken),
		setHash: db.getRepository(DatabaseActionSetHash)
	});
	const actionsManager = new ActionsManager(actionsStorage);

	console.log("Инициализация средств работы с TON...");
	const tonClient = new TonClient({ network: { server_address: config.ton.serverAddress } });
	const tonClientRootContract = new TonClientRootContract(tonClient, config.ton.rootContractAddress);
	const tonClientTokenContractFactory = new TonClientTokenContractFactory(tonClient);

	console.log("Инициализация поставщика событий TON...");
	const tonActionsEvents = new TonActionsEvents(
		tokensManager,
		tonClientRootContract,
		tonClientTokenContractFactory
	);

	console.log("Инициализация коллекционера действий...");
	new ActionsCollector(actionsManager, tonActionsEvents);

	console.log("Инициализация коллекционера токенов...");
	new TokensCollector(tokensManager, tonActionsEvents);

	console.log("Инициализация RPC-Сервера...");
	const rpcServer = new RpcServer(config.rpcServer);
	await rpcServer.start();

	console.log("Инициализация RPC-Методов...");
	const getActionsByToken = new GetActionsByToken(actionsManager);
	const getActionsByUser = new GetActionsByUserPublicKey(actionsManager);
	const getAllActions = new GetAllActions(actionsManager);
	const getTokensByUser = new GetTokensByUserPublicKey(tokensManager);
	const getAllTokens = new GetAllTokens(tokensManager);

	rpcServer.addMethod("get-actions-by-token", getActionsByToken);
	rpcServer.addMethod("get-actions-by-user", getActionsByUser);
	rpcServer.addMethod("get-all-actions", getAllActions);
	rpcServer.addMethod("get-tokens-by-user", getTokensByUser);
	rpcServer.addMethod("get-all-tokens", getAllTokens);

	console.log("Инициализация завершена!");
}

main();
import 'source-map-support/register';
import * as fs from "fs";

import "./logger/logger";

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
import { getMergedObjects, setProduction } from './utils/utils';
import { GetActionsByOwner } from './rpc-methods/get-actions-by-owner';
import { GetTokensByOwner } from './rpc-methods/get-tokens-by-owner';
import { GetTokenById } from './rpc-methods/get-token-by-id';
import { AuctionsManager } from './auctions/auctions-manager';
import { AuctionsStorageDatabase } from './auctions/auctions-storage-database';
import { DatabaseAuction } from './database/models/auction';
import { BidsStorageDatabase } from './auctions/bids-storage-database';
import { DatabaseBid } from './database/models/bid';
import { TonClientAuctionContractFactory } from './ton/ton-client-auction-contract';

TonClient.useBinaryLibrary(libNode);
async function main(): Promise<void> {
	const packageInfo = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
	console.log("Initialization " + packageInfo.name + " v" + packageInfo.version);

	const RAW_DEFAULT_CONFIG = fs.readFileSync('./config/config.json', 'utf-8');
	let RAW_CONFIG = "{}";

	try {
		RAW_CONFIG = fs.readFileSync("./config/config.json", "utf-8");
	} catch (err) {
		if (err.code !== "ENOENT") {
			console.error(err);
			process.exit(1);
		}
	}

	const config = getMergedObjects<Config>(
		JSON.parse(RAW_DEFAULT_CONFIG),
		JSON.parse(RAW_CONFIG)
	);

	if (config.isProduction) {
		setProduction();
	}

	console.log("Database initialization...");
	const db = await createDatabase(config.mysql);

	console.log("Auctions manager initialization...");
	const auctionsStorage = new AuctionsStorageDatabase(db.getRepository(DatabaseAuction));
	const bidsStorage = new BidsStorageDatabase(db.getRepository(DatabaseBid));
	const auctionsManager = new AuctionsManager(auctionsStorage, bidsStorage);

	console.log("Tokens manager initialization...");
	const tokensStorage = new TokensStorageDatabase(db.getRepository(DatabaseToken));
	const tokensManager = new TokensManager(tokensStorage, auctionsManager);

	console.log("Actions manager initialization...");
	const actionsStorage = new ActionsStorageDatabase({
		changeOwner: db.getRepository(DatabaseActionChangeOwner),
		create: db.getRepository(DatabaseActionCreateToken),
		setHash: db.getRepository(DatabaseActionSetHash)
	});
	const actionsManager = new ActionsManager(actionsStorage);

	console.log("TON Tools initialization...");
	const tonClient = new TonClient({ network: { server_address: config.ton.serverAddress } });
	const tonClientRootContract = new TonClientRootContract(tonClient, config.ton.rootContractAddress);
	const tonClientTokenContractFactory = new TonClientTokenContractFactory(tonClient);
	const tonClientAuctionContractFactory = new TonClientAuctionContractFactory(tonClient);

	console.log("TON Event Provider initialization...");
	const tonActionsEvents = new TonActionsEvents(
		tokensManager,
		tonClientRootContract,
		tonClientTokenContractFactory,
		tonClientAuctionContractFactory
	);

	console.log("Action collector initialization...");
	new ActionsCollector(actionsManager, tonActionsEvents);

	console.log("Token collector initialization...");
	new TokensCollector(tokensManager, tonActionsEvents);

	console.log("RPC Server initialization...");
	const rpcServer = new RpcServer(config.rpcServer);
	await rpcServer.start();

	console.log("RPC Methods initialization...");
	const getActionsByToken = new GetActionsByToken(actionsManager);
	const getActionsByUser = new GetActionsByUserPublicKey(actionsManager);
	const getActionsByOwner = new GetActionsByOwner(actionsManager);
	const getAllActions = new GetAllActions(actionsManager);
	const getTokensByUser = new GetTokensByUserPublicKey(tokensManager);
	const getTokensByOwner = new GetTokensByOwner(tokensManager);
	const getTokenById = new GetTokenById(tokensManager);
	const getAllTokens = new GetAllTokens(tokensManager);

	rpcServer.addMethod("get-actions-by-token", getActionsByToken);
	rpcServer.addMethod("get-actions-by-user", getActionsByUser);
	rpcServer.addMethod("get-actions-by-owner", getActionsByOwner);
	rpcServer.addMethod("get-all-actions", getAllActions);
	rpcServer.addMethod("get-tokens-by-user", getTokensByUser);
	rpcServer.addMethod("get-tokens-by-owner", getTokensByOwner);
	rpcServer.addMethod("get-token-by-id", getTokenById);
	rpcServer.addMethod("get-all-tokens", getAllTokens);

	console.log("Initialization done!");
}

main();
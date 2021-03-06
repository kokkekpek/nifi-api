// The code of this file turned out to be very bad, it is recommended to redo

import { Repository } from "typeorm";
import { DatabaseActionChangeOwner } from "../database/models/action-change-owner";
import { DatabaseActionCreateToken } from "../database/models/action-create-token";
import { DatabaseActionMintToken } from "../database/models/action-mint-token";
import { DatabaseActionSetHash } from "../database/models/action-set-hash";
import { IActionsStorage } from "./actions-storage";
import { Action } from "./actions-types";

export type ActionsDatabaseRequiredRepositories = {
	readonly "create": Repository<DatabaseActionCreateToken>;
	readonly "changeOwner": Repository<DatabaseActionChangeOwner>;
	readonly "setHash": Repository<DatabaseActionSetHash>;
	readonly "mint": Repository<DatabaseActionMintToken>;
};

type DatabaseAction = 
	DatabaseActionCreateToken | DatabaseActionChangeOwner | DatabaseActionSetHash | DatabaseActionMintToken;

export class ActionsStorageDatabase implements IActionsStorage {
	private readonly repositories: ActionsDatabaseRequiredRepositories;

	constructor(repositories: ActionsDatabaseRequiredRepositories) {
		this.repositories = repositories;
	}

	private getDatabaseActionByAction(action: Action): DatabaseAction {
		let databaseAction: DatabaseAction;

		// Fix Me: Open / Closed SOLID Violation (OCP)
		switch (action.action) {
			case "create":
				databaseAction = new DatabaseActionCreateToken(
					action.tokenId,
					action.address,
					action.userPublicKey,
					action.owner,
					action.hash,
					action.time + "",
					action.creator
				);

				break;
			case "changeOwner":
				databaseAction = new DatabaseActionChangeOwner(
					action.tokenId,
					action.address,
					action.previousOwner,
					action.userPublicKey,
					action.owner,
					action.hash,
					action.time + ""
				);

				break;
			case "setHash":
				databaseAction = new DatabaseActionSetHash(
					action.tokenId,
					action.address,
					action.userPublicKey,
					action.owner,
					action.previousHash,
					action.hash,
					action.time + ""
				);

				break;
			case "mint":
				databaseAction = new DatabaseActionMintToken(
					action.tokenId,
					action.address,
					action.userPublicKey,
					action.owner,
					action.hash,
					action.time + "",
					action.creator,
					action.maximum,
					action.collection
				);

				break;
		}

		return databaseAction;
	}

	private getActionByDatabaseAction(databaseAction: DatabaseAction): Action {
		let action: Action;

		// Fix Me: Open / Closed SOLID Violation (OCP)
		if (databaseAction instanceof DatabaseActionCreateToken) {
			action = {
				action: "create",
				tokenId: databaseAction.tokenId,
				address: databaseAction.address,
				userPublicKey: databaseAction.user_public_key,
				owner: databaseAction.owner,
				hash: databaseAction.hash,
				time: +databaseAction.time,
				creator: databaseAction.creator
			};
		} else if (databaseAction instanceof DatabaseActionChangeOwner) {
			action = {
				action: "changeOwner",
				tokenId: databaseAction.tokenId,
				address: databaseAction.address,
				userPublicKey: databaseAction.user_public_key,
				previousOwner: databaseAction.previous_owner,
				owner: databaseAction.owner,
				hash: databaseAction.hash,
				time: +databaseAction.time
			};
		} else if (databaseAction instanceof DatabaseActionSetHash) {
			action = {
				action: "setHash",
				tokenId: databaseAction.tokenId,
				address: databaseAction.address,
				userPublicKey: databaseAction.user_public_key,
				owner: databaseAction.owner,
				previousHash: databaseAction.previous_hash,
				hash: databaseAction.hash,
				time: +databaseAction.time
			};
		} else if (databaseAction instanceof DatabaseActionMintToken) {
			action = {
				action: "mint",
				tokenId: databaseAction.tokenId,
				address: databaseAction.address,
				userPublicKey: databaseAction.user_public_key,
				owner: databaseAction.owner,
				hash: databaseAction.hash,
				time: +databaseAction.time,
				maximum: databaseAction.max,
				creator: databaseAction.creator,
				collection: databaseAction.collection
			};
		} else {
			throw new Error(
				"Unsupported DatabaseAction:\n"
				+ JSON.stringify(databaseAction, null, "\t")
			);
		}

		return action;
	}

	private getActionsByDatabaseActions(databaseActions: DatabaseAction[]): Action[] {
		return databaseActions.map(this.getActionByDatabaseAction);
	}

	public async addAction(action: Action): Promise<void> {
		const repository = this.repositories[action.action];
		const databaseAction = this.getDatabaseActionByAction(action);

		await repository.insert(databaseAction);
	}

	public async getAllActions(): Promise<Action[]> {
		const databaseActionsCreateToken = await this.repositories.create.find();
		const databaseActionsChangeOwner = await this.repositories.changeOwner.find();
		const databaseActionsSetHash = await this.repositories.setHash.find();
		const databaseActionsMint = await this.repositories.mint.find();

		const actionsCreateToken = this.getActionsByDatabaseActions(databaseActionsCreateToken);
		const actionsChangeOwner = this.getActionsByDatabaseActions(databaseActionsChangeOwner);
		const actionsSetHash = this.getActionsByDatabaseActions(databaseActionsSetHash);
		const actionsMint = this.getActionsByDatabaseActions(databaseActionsMint);

		return actionsCreateToken.concat(actionsChangeOwner, actionsSetHash, actionsMint);
	}

	public async getActionsByUserPublicKey(userPublicKey: string): Promise<Action[]> {
		const criteria = {
			user_public_key: userPublicKey
		};

		const databaseActionsCreateToken = await this.repositories.create.find(criteria);
		const databaseActionsChangeOwner = await this.repositories.changeOwner.find(criteria);
		const databaseActionsSetHash = await this.repositories.setHash.find(criteria);

		const actionsCreateToken = this.getActionsByDatabaseActions(databaseActionsCreateToken);
		const actionsChangeOwner = this.getActionsByDatabaseActions(databaseActionsChangeOwner);
		const actionsSetHash = this.getActionsByDatabaseActions(databaseActionsSetHash);

		return actionsCreateToken.concat(actionsChangeOwner, actionsSetHash);
	}

	public async getActionsByTokenId(tokenId: string): Promise<Action[]> {
		const criteria = {
			tokenId: tokenId
		};

		const databaseActionsCreateToken = await this.repositories.create.find(criteria);
		const databaseActionsChangeOwner = await this.repositories.changeOwner.find(criteria);
		const databaseActionsSetHash = await this.repositories.setHash.find(criteria);

		const actionsCreateToken = this.getActionsByDatabaseActions(databaseActionsCreateToken);
		const actionsChangeOwner = this.getActionsByDatabaseActions(databaseActionsChangeOwner);
		const actionsSetHash = this.getActionsByDatabaseActions(databaseActionsSetHash);

		return actionsCreateToken.concat(actionsChangeOwner, actionsSetHash);
	}

	public async getActionsByOwner(owner: string): Promise<Action[]> {
		const criteria = { owner };

		const databaseActionsCreateToken = await this.repositories.create.find(criteria);
		const databaseActionsChangeOwner = await this.repositories.changeOwner.find(criteria);
		const databaseActionsSetHash = await this.repositories.setHash.find(criteria);

		const actionsCreateToken = this.getActionsByDatabaseActions(databaseActionsCreateToken);
		const actionsChangeOwner = this.getActionsByDatabaseActions(databaseActionsChangeOwner);
		const actionsSetHash = this.getActionsByDatabaseActions(databaseActionsSetHash);

		return actionsCreateToken.concat(actionsChangeOwner, actionsSetHash);
	}
}
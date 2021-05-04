import { IActionsStorage } from "./actions-storage";
import { Action } from "./actions-types";

export class ActionsManager {
	private readonly storage: IActionsStorage;

	constructor(storage: IActionsStorage) {
		this.storage = storage;
	}

	public async addAction(action: Action): Promise<void> {
		await this.storage.addAction(action);
	}

	public async getAllActions(): Promise<Action[]> {
		return await this.storage.getAllActions();
	}

	public async getActionsByTokenId(tokenId: string): Promise<Action[]> {
		return await this.storage.getActionsByTokenId(tokenId);
	}

	public async getActionsByUserPublicKey(userPublicKey: string): Promise<Action[]> {
		return await this.storage.getActionsByUserPublicKey(userPublicKey);
	}
}
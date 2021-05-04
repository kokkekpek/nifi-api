import { mutexLockOrAwait, mutexUnlock } from "rg";
import { IActionsStorage } from "./actions-storage";
import { Action } from "./actions-types";

export type AddActionResult = "success" | "action_with_such_id_already_exists";

export class ActionsManager {
	private readonly storage: IActionsStorage;

	constructor(storage: IActionsStorage) {
		this.storage = storage;
	}

	public async addAction(action: Action): Promise<AddActionResult> {
		const mutexName = "saving_action_" + action.id;
		await mutexLockOrAwait(mutexName);

		try {
			const hasAction = await this.storage.hasActionWithId(action.id);

			if (hasAction) {
				return "action_with_such_id_already_exists";
			}
	
			this.storage.addAction(action);
			return "success";
		} finally {
			mutexUnlock(mutexName);
		}
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
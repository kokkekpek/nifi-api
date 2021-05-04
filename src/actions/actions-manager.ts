import { IActionsStorage } from "./actions-storage";
import { Action } from "./actions-types";

export class ActionsManager {
	private readonly storage: IActionsStorage;

	constructor(storage: IActionsStorage) {
		this.storage = storage;
	}

	private sortActionsByTime(action: Action[]): void {
		action.sort((a, b) => {
			return b.time - a.time;
		});
	}

	public async addAction(action: Action): Promise<void> {
		await this.storage.addAction(action);
	}

	public async getAllActions(): Promise<Action[]> {
		const actions = await this.storage.getAllActions();
		this.sortActionsByTime(actions);

		return actions;
	}

	public async getActionsByTokenId(tokenId: string): Promise<Action[]> {
		const actions = await this.storage.getActionsByTokenId(tokenId);
		this.sortActionsByTime(actions);

		return actions;
	}

	public async getActionsByUserPublicKey(userPublicKey: string): Promise<Action[]> {
		const actions = await this.storage.getActionsByUserPublicKey(userPublicKey);
		this.sortActionsByTime(actions);

		return actions;
	}
}
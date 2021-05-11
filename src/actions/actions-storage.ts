import { Action } from "./actions-types";

export interface IActionsStorage {
	addAction(action: Action): Promise<void>;
	getAllActions(): Promise<Action[]>;
	getActionsByUserPublicKey(userPublicKey: string): Promise<Action[]>;
	getActionsByTokenId(tokenId: string): Promise<Action[]>;
	getActionsByOwner(owner: string): Promise<Action[]>;
}
import { Action } from "./actions-types";

export interface IActionsStorage {
	hasActionWithId(actionId: string): Promise<boolean>;
	addAction(action: Action): Promise<void>;
	getAllActions(): Promise<Action[]>;
	getActionsByUserPublicKey(userPublicKey: string): Promise<Action[]>;
	getActionsByTokenId(tokenId: string): Promise<Action[]>;
}
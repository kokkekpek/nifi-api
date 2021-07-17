import { IActionsEvents } from "../actions/actions-events";
import { Action } from "../actions/actions-types";
import { TokensManager } from "./tokens-manager";

export class TokensCollector {
	private tokensManager: TokensManager;
	private actionsEvents: IActionsEvents;

	constructor(tokensManager: TokensManager, actionsEvents: IActionsEvents) {
		this.tokensManager = tokensManager;
		this.actionsEvents = actionsEvents;

		this.actionsEvents.event.on(this.onActionEvent.bind(this));
	}

	private onActionEvent(event: Action): void {
		if (event.action === "create") {
			this.tokensManager.addToken({
				type: "art1",
				id: event.tokenId,
				address: event.address,
				userPublicKey: event.userPublicKey,
				owner: event.owner,
				hash: event.hash,
				auction: null,
				offers: [],
				creator: event.creator,
				maximum: null
			});
		}

		if (event.action === "mint") {
			this.tokensManager.addToken({
				type: "art2",
				id: event.tokenId,
				address: event.address,
				userPublicKey: event.userPublicKey,
				owner: event.owner,
				hash: event.hash,
				auction: null,
				offers: [],
				creator: event.creator,
				maximum: event.maximum
			});
		}
	}
}
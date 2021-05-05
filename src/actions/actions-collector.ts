import { IActionsEvents } from "./actions-events";
import { ActionsManager } from "./actions-manager";
import { Action } from "./actions-types";

export class ActionsCollector {
	private actionsManager: ActionsManager;
	private actionsEvents: IActionsEvents;

	constructor(actionsManager: ActionsManager, actionsEvents: IActionsEvents) {
		this.actionsManager = actionsManager;
		this.actionsEvents = actionsEvents;

		this.actionsEvents.event.on(this.onActionEvent.bind(this));
	}

	private onActionEvent(event: Action): void {
		this.actionsManager.addAction(event);
	}
}
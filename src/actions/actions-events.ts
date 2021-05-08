import { Event } from "../utils/events";
import { Action } from "./actions-types";

export interface IActionsEvents {
	event: Event<Action>;
}
import { Event } from "rg";
import { Action } from "./actions-types";

export interface IActionsEvents {
	event: Event<Action>;
}
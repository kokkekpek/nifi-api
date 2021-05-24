import { Event } from "../../utils/events";

export type TonContractTokenCreatedEvent = {
	readonly addr: string;
};

export interface ITonRootContract {
	created: Event<TonContractTokenCreatedEvent>;
	updateLastTokenId(): void;
}
import { Event } from "rg";

export type TonContractTokenCreatedEvent = {
	readonly addr: string;
};

export interface ITonRootContract {
	created: Event<TonContractTokenCreatedEvent>;
}
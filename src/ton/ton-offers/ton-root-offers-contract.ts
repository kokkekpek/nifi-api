import { Event } from "../../utils/events";

export type TonOfferCreatedEvent = {
	readonly addr: string;
};

export interface ITonRootOffersContract {
	created: Event<TonOfferCreatedEvent>;
	updateLastOfferId(): void;
}
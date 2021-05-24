import { OfferStatus } from "./offers-manager";

export type OfferStorageEntry = {
	readonly offerId: string;
	readonly creator: string;
	readonly token: string;
	readonly price: string;
	readonly fee: string;
	readonly endTime: string;
	readonly status: OfferStatus;
};

export interface IOffersStorage {
	addOffer(offer: OfferStorageEntry): Promise<void>;
	hasOfferWithOfferId(offerId: string): Promise<boolean>;
	getOffersByTokenId(tokenId: string, status: OfferStatus | null): Promise<OfferStorageEntry[]>;
	setOfferStatus(offerId: string, status: OfferStatus): Promise<void>;
}
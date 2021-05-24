import { mutexLockOrAwait, mutexUnlock } from "../utils/mutex";
import { IOffersStorage, OfferStorageEntry } from "./offers-storage";

export type OfferStatus = "pending" | "accepted" | "expired";

export type AddOfferResult = "success" | "offer_with_such_id_already_exists";

export class OffersManager {
	private readonly storage: IOffersStorage;

	constructor(storage: IOffersStorage) {
		this.storage = storage;
	}

	public async addOffer(offer: OfferStorageEntry): Promise<AddOfferResult> {
		const mutexName = "saving_offer_" + offer.offerId;
		await mutexLockOrAwait(mutexName);

		try {
			const hasOffer = await this.storage.hasOfferWithOfferId(offer.offerId);

			if (hasOffer) {
				return "offer_with_such_id_already_exists";
			}
	
			await this.storage.addOffer(offer);
			return "success";
		} finally {
			mutexUnlock(mutexName);
		}
	}

	public async getOffersByTokenId(tokenId: string, status: OfferStatus | null): Promise<OfferStorageEntry[]> {
		return await this.storage.getOffersByTokenId(tokenId, status);
	}

	public async setOfferStatus(offerId: string, status: OfferStatus): Promise<void> {
		await this.storage.setOfferStatus(offerId, status);
	}
}
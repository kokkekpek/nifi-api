import { Repository } from "typeorm";
import { DatabaseOffer } from "../database/models/offer";
import { ITonMessagesCheckerStorage } from "../ton/ton-messages-checker-storage";
import { OfferStatus } from "./offers-manager";
import { IOffersStorage, OfferStorageEntry } from "./offers-storage";

export class OffersStorageDatabase implements IOffersStorage, ITonMessagesCheckerStorage {
	private readonly repository: Repository<DatabaseOffer>;

	constructor(repository: Repository<DatabaseOffer>) {
		this.repository = repository;
	}

	public async setLastMessageTimeByAddress(address: string, lastMessageTime: number): Promise<void> {
		await this.repository.update({ address }, {
			last_message_time: lastMessageTime
		});
	}

	public async getLastMessageTimeByAddress(address: string): Promise<number | undefined> {
		const result = await this.repository.findOne({ address });

		if (!result) return;

		return result.last_message_time;
	}

	public async addOffer(offer: OfferStorageEntry): Promise<void> {
		const databaseOffer = new DatabaseOffer(
			offer.offerId,
			offer.tokenId,
			offer.address,
			offer.creator,
			offer.token,
			offer.price,
			offer.fee,
			offer.endTime,
			offer.status,
			0
		);

		await this.repository.insert(databaseOffer);
	}

	private getOfferStorageEntryByDatabaseOffer(databaseOffer: DatabaseOffer): OfferStorageEntry {
		return {
			offerId: databaseOffer.offer_id,
			tokenId: databaseOffer.token_id,
			address: databaseOffer.address,
			creator: databaseOffer.creator,
			token: databaseOffer.token,
			price: databaseOffer.price,
			fee: databaseOffer.fee,
			endTime: databaseOffer.end_time,
			status: databaseOffer.status
		};
	}

	public async hasOfferWithOfferId(offerId: string): Promise<boolean> {
		const result = await this.repository.findOne({ offer_id: offerId });

		if (result !== undefined) {
			return true;
		} else {
			return false;
		}
	}

	public async getOffersByTokenId(tokenId: string, status: OfferStatus | null): Promise<OfferStorageEntry[]> {
		let result: DatabaseOffer[] = [];

		if (status === null) {
			result = await this.repository.find({ token_id: tokenId });
		} else {
			result = await this.repository.find({ token_id: tokenId, status });
		}

		return result.map(this.getOfferStorageEntryByDatabaseOffer.bind(this));
	}

	public async setOfferStatus(offerId: string, status: OfferStatus): Promise<void> {
		await this.repository.update({ offer_id: offerId }, {
			status
		});
	}
}
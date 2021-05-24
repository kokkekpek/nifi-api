import { Repository } from "typeorm";
import { DatabaseAuction } from "../database/models/auction";
import { ITonMessagesCheckerStorage } from "../ton/ton-messages-checker-storage";
import { AuctionStorageEntry, IAuctionsStorage } from "./auctions-storage";

export class AuctionsStorageDatabase implements IAuctionsStorage, ITonMessagesCheckerStorage {
	private repository: Repository<DatabaseAuction>;

	constructor(repository: Repository<DatabaseAuction>) {
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

	private getActionStorageEntryByDatabaseEntry(databaseEntry: DatabaseAuction): AuctionStorageEntry {
		return {
			auctionId: databaseEntry.auction_id,
			address: databaseEntry.address,
			creator: databaseEntry.creator,
			token: databaseEntry.token,
			startBid: databaseEntry.start_bid,
			stepBid: databaseEntry.step_bid,
			feeBid: databaseEntry.fee_bid,
			startTime: databaseEntry.start_time,
			endTime: databaseEntry.end_time,
			finishBid: databaseEntry.finish_bid || undefined
		};
	}

	public async getAuctionByAuctionId(auctionId: string): Promise<AuctionStorageEntry | undefined> {
		const databaseAuction = await this.repository.findOne({ auction_id: auctionId });

		if (!databaseAuction) return;

		return this.getActionStorageEntryByDatabaseEntry(databaseAuction);
	}

	public async hasAuctionWithAuctionId(auctionId: string): Promise<boolean> {
		const result = await this.repository.findOne({ auction_id: auctionId });

		if (result !== undefined) {
			return true;
		} else {
			return false;
		}
	}

	public async addAuction(auction: AuctionStorageEntry): Promise<void> {
		const databaseAuction = new DatabaseAuction(
			auction.auctionId,
			auction.address,
			auction.creator,
			auction.token,
			auction.startBid,
			auction.stepBid,
			auction.feeBid,
			auction.startTime,
			auction.endTime,
			0,
			auction.finishBid || null
		);

		await this.repository.insert(databaseAuction);
	}

	public async setAuctionFinishBid(auctionId: string, finishBid: string): Promise<void> {
		await this.repository.update({ auction_id: auctionId }, {
			finish_bid: finishBid
		});
	}
}
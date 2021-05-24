import { Repository } from "typeorm";
import { DatabaseBid } from "../database/models/bid";
import { BidStorageEntry, IBidsStorage } from "./bids-storage";

export class BidsStorageDatabase implements IBidsStorage {
	private repository: Repository<DatabaseBid>;

	constructor(repository: Repository<DatabaseBid>) {
		this.repository = repository;
	}

	public async hasBidWithAuctionId(bidId: string): Promise<boolean> {
		const result = await this.repository.findOne({ bid_id: bidId });

		if (result !== undefined) {
			return true;
		} else {
			return false;
		}
	}

	private getStorageidByDatabaseBid(databaseBid: DatabaseBid): BidStorageEntry {
		return {
			bidId: databaseBid.bid_id,
			auctionId: databaseBid.auction_id,
			creator: databaseBid.creator,
			token: databaseBid.token,
			bider: databaseBid.bider,
			value: databaseBid.value
		};
	}

	private getStorageBidsByDatabaseBids(databaseBids: DatabaseBid[]): BidStorageEntry[] {
		return databaseBids.map(this.getStorageidByDatabaseBid.bind(this));
	}

	public async addBid(bid: BidStorageEntry): Promise<void> {
		const databaseBid = new DatabaseBid(
			bid.bidId,
			bid.auctionId,
			bid.creator,
			bid.token,
			bid.bider,
			bid.value
		);

		await this.repository.insert(databaseBid);
	}

	public async getBidsByAuctionId(auctionId: string): Promise<BidStorageEntry[]> {
		const result = await this.repository.find({ auction_id: auctionId });
		return this.getStorageBidsByDatabaseBids(result);
	}

	public async getBidByBidId(bidId: string): Promise<BidStorageEntry | undefined> {
		const result = await this.repository.findOne({ bid_id: bidId });

		if (!result) return;

		return this.getStorageidByDatabaseBid(result);
	}
}
import { mutexLockOrAwait, mutexUnlock } from "../utils/mutex";
import { AuctionStorageEntry, IAuctionsStorage } from "./auctions-storage";
import { BidStorageEntry, IBidsStorage } from "./bids-storage";

export type AuctionBid = {
	readonly bidId: string;
	readonly creator: string;
	readonly token: string;
	readonly bider: string;
	readonly value: string;
};

export type Auction = {
	readonly auctionId: string;
	readonly address: string;
	readonly creator: string;
	readonly token: string;
	readonly startBid: string;
	readonly stepBid: string;
	readonly feeBid: string;
	readonly startTime: number;
	readonly endTime: number;
	bids: AuctionBid[];
	finishBid: AuctionBid | null;
};

export type AddAuctionResult = "success" | "auction_with_such_id_already_exists";
export type AddBidResult = "success" | "bid_with_such_id_already_exists";

export class AuctionsManager {
	private readonly storage: IAuctionsStorage;
	private readonly bidsStorage: IBidsStorage;

	constructor(storage: IAuctionsStorage, bidsStorage: IBidsStorage) {
		this.storage = storage;
		this.bidsStorage = bidsStorage;
	}

	public async setAuctionFinishBid(finishBid: BidStorageEntry): Promise<void> {
		await this.addBid(finishBid);
		await this.storage.setAuctionFinishBid(finishBid.auctionId, finishBid.bidId);
	}

	public async addBid(bid: BidStorageEntry): Promise<AddBidResult> {
		const mutexName = "saving_bid_" + bid.bidId;
		await mutexLockOrAwait(mutexName);

		try {
			const hasBid = await this.bidsStorage.hasBidWithAuctionId(bid.bidId);

			if (hasBid) {
				return "bid_with_such_id_already_exists";
			}
	
			await this.bidsStorage.addBid(bid);
			return "success";
		} finally {
			mutexUnlock(mutexName);
		}
	}

	public async addAuction(auction: AuctionStorageEntry): Promise<AddAuctionResult> {
		const mutexName = "saving_auction_" + auction.auctionId;
		await mutexLockOrAwait(mutexName);

		try {
			const hasAuction = await this.storage.hasAuctionWithAuctionId(auction.auctionId);

			if (hasAuction) {
				return "auction_with_such_id_already_exists";
			}
	
			await this.storage.addAuction(auction);
			return "success";
		} finally {
			mutexUnlock(mutexName);
		}
	}

	private getAuctionByAuctionStorageEntry(storageEntry: AuctionStorageEntry): Auction {
		const auction: Auction = {
			auctionId: storageEntry.auctionId,
			address: storageEntry.address,
			creator: storageEntry.creator,
			token: storageEntry.token,
			startBid: storageEntry.startBid,
			stepBid: storageEntry.stepBid,
			feeBid: storageEntry.feeBid,
			startTime: storageEntry.startTime,
			endTime: storageEntry.endTime,
			finishBid: null,
			bids: []
		};

		return auction;
	}

	public async getAuctionByAuctionId(auctionId: string): Promise<Auction | undefined> {
		const storageEntry = await this.storage.getAuctionByAuctionId(auctionId);

		if (!storageEntry) return;

		const bids = await this.bidsStorage.getBidsByAuctionId(auctionId);
		const auction = await this.getAuctionByAuctionStorageEntry(storageEntry);

		if (storageEntry.finishBid !== undefined) {
			let finishBid = bids.find(entry => {
				return entry.bidId === storageEntry.finishBid;
			});

			if (finishBid === undefined) {
				finishBid = await this.bidsStorage.getBidByBidId(storageEntry.finishBid);
			}

			auction.finishBid = finishBid || null;
		}

		auction.bids = bids;

		return auction;
	}

	public async getAuctionsByTokenId(tokenId: string): Promise<Auction[]> {
		const auctions = await this.storage.getAuctionsByTokenId(tokenId);
		const result: Auction[] = [];

		for (const storageEntry of auctions) {
			const auction = this.getAuctionByAuctionStorageEntry(storageEntry);
			const bids = await this.bidsStorage.getBidsByAuctionId(auction.auctionId);

			auction.bids = bids;
			result.push(auction);
		}

		return result;
	}
}
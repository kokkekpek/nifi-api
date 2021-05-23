export type BidStorageEntry = {
	readonly bidId: string;
	readonly auctionId: string;
	readonly creator: string;
	readonly token: string;
	readonly bider: string;
	readonly value: string;
};

export interface IBidsStorage {
	addBid(bid: BidStorageEntry): Promise<void>;
	getBidsByAuctionId(auctionId: string): Promise<BidStorageEntry[]>;
	getBidByBidId(bidId: string): Promise<BidStorageEntry | undefined>;
}
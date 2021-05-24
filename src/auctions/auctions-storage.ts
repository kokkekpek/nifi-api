export type AuctionStorageEntry = {
	readonly auctionId: string;
	readonly address: string;
	readonly creator: string;
	readonly token: string;
	readonly startBid: string;
	readonly stepBid: string;
	readonly feeBid: string;
	readonly startTime: number;
	readonly endTime: number;
	readonly finishBid?: string;
};

export interface IAuctionsStorage {
	getAuctionByAuctionId(auctionId: string): Promise<AuctionStorageEntry | undefined>;
	hasAuctionWithAuctionId(auctionId: string): Promise<boolean>;
	addAuction(auction: AuctionStorageEntry): Promise<void>;
	setAuctionFinishBid(auctionId: string, finishBid: string): Promise<void>;
}
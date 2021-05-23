import { Auction, AuctionBid } from "./auctions-manager";

export interface IBidsStorage {
	addBid(bid: AuctionBid): Promise<void>;
	getBidsByAuctionId(auctionId: string): Promise<AuctionBid[]>;
	getBidByBidId(bidId: string): Promise<AuctionBid | undefined>;
}
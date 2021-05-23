import { AuctionBid } from "../auctions/auctions-manager";
import { Event } from "../utils/events";
import { RgResult } from "../utils/result";

export type TonAuctionContractGetInfoResult = {
	readonly id: string;
	readonly creator: string;
	readonly token: string;
	readonly startBid: string;
	readonly stepBid: string;
	readonly feeBid: string;
	readonly startTime: number;
	readonly endTime: number;
};

export interface ITonAuctionContract {
	getInfo(): Promise<RgResult<TonAuctionContractGetInfoResult>>;
	checkMessages(): Promise<void>;

	bidEvent: Event<AuctionBid>;
	finishEvent: Event<AuctionBid>;
}

export interface ITonAuctionContractFactory {
	getAuctionContract(addr: string): ITonAuctionContract;
}
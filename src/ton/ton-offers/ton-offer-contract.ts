import { Event } from "../../utils/events";
import { RgResult } from "../../utils/result";

export type TonOfferContractGetInfoResult = {
	readonly id: string;
	readonly creator: string;
	readonly token: string;
	readonly price: string;
	readonly fee: string;
	readonly endTime: string;
};

export interface ITonOfferContract {
	getInfo(): Promise<RgResult<TonOfferContractGetInfoResult>>;
	checkMessages(): Promise<void>;

	offerAcceptedEvent: Event<void>;
	offerFinishedEvent: Event<void>;
}

export interface ITonOfferContractFactory {
	getOfferContract(addr: string): ITonOfferContract;
}
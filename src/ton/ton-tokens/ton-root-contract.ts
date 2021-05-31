import { Event } from "../../utils/events";
import { RgResult } from "../../utils/result";
import { TotalInfo } from "./ton-client-root-contract";

export type TonContractTokenCreatedEvent = {
	readonly addr: string;
};

export interface ITonRootContract {
	created: Event<TonContractTokenCreatedEvent>;
	updateLastTokenId(): void;
	getInfoAboutMultipleAccounts(addresses: string[]): Promise<RgResult<[string, TotalInfo][]>>;
}
import { Connection } from "typeorm";
import { Event } from "../../utils/events";
import { RgResult } from "../../utils/result";
import { SeriesInfo } from "./ton-client-root-art2-contract";
import { TotalInfo } from "./ton-client-root-contract";

export type TonContractArt2Series = {
	readonly addr: string;
	readonly time: number;
};

export type TonContractArt2Mint = {
	readonly addr: string;
	readonly series: string;
};

export interface ITonRootArt2Contract {
	series: Event<TonContractArt2Series>;
	mint: Event<TonContractArt2Mint>;

	getDatabase(): Connection;
	getSeriesInfo(addr: string): Promise<RgResult<SeriesInfo>>;
	setSeries(addr: string, lt: number): Promise<void>;
	getInfoAboutMultipleAccounts(addresses: string[]): Promise<RgResult<[string, TotalInfo][]>>;
}
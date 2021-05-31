import { RgResult } from "../../utils/result";

export type TonTokenContractGetArtInfoResult = {
	readonly hash: string;
	readonly creator: string;
};

export type TonTokenContractGetInfoResult = {
	readonly id: string;
	readonly publicKey: string;
	readonly owner: string;
	readonly manager: string;
};

export interface ITonTokenContract {
	getAddress(): string;
	getArtInfo(): Promise<RgResult<TonTokenContractGetArtInfoResult>>;
	getInfo(): Promise<RgResult<TonTokenContractGetInfoResult>>;
}

export interface ITonTokenContractFactory {
	getTokenContract(addr: string): ITonTokenContract;
}
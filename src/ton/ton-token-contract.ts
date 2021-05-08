import { RgResult } from "../utils/result";

export type TonTokenContractGetArtInfoResult = {
	readonly hash: string;
};

export type TonTokenContractGetInfoResult = {
	readonly id: string;
	readonly publicKey: string;
	readonly owner: string;
};

export interface ITonTokenContract {
	getAddress(): string;
	getArtInfo(): Promise<RgResult<TonTokenContractGetArtInfoResult>>;
	getInfo(): Promise<RgResult<TonTokenContractGetInfoResult>>;
}

export interface ITonTokenContractFactory {
	getTokenContract(addr: string): ITonTokenContract;
}
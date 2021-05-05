import {
	ITonTokenContract,
	ITonTokenContractFactory,
	TonTokenContractGetArtInfoResult,
	TonTokenContractGetInfoResult
} from "./ton-token-contract";

import * as fs from "fs";
import { TonClient } from "@ton-client-ts/node";
import { RgResult } from "rg";
import { Abi } from "@ton-client-ts/core/types/modules/abi/types";
import { ResultOfProcessMessage } from "@ton-client-ts/core/types/modules/processing/types";

const ART_TOKEN_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/ArtToken.abi.json", "utf-8"))
};

export type TonKeys = {
	readonly private: string;
	readonly public: string;
};

type ArtInfoResult = {
	readonly hash: string;
};

type InfoResult = {
	readonly id: string;
	readonly publicKey: string;
	readonly owner: string;
};

export class TonClientTokenContractFactory implements ITonTokenContractFactory {
	private readonly keys: TonKeys;
	private readonly tonClient: TonClient;

	constructor(keys: TonKeys, tonClient: TonClient) {
		this.keys = keys;
		this.tonClient = tonClient;
	}

	public getTokenContract(addr: string): ITonTokenContract {
		return new TonClientTokenContract(this.tonClient, addr, this.keys);
	}
}

export class TonClientTokenContract implements ITonTokenContract {
	private readonly tonClient: TonClient;
	private readonly address: string;
	private readonly keys: TonKeys;

	constructor(tonClient: TonClient, address: string, keys: TonKeys) {
		this.tonClient = tonClient;
		this.address = address;
		this.keys = keys;
	}

	public getAddress(): string {
		return this.address;
	}

	public async getArtInfo(): Promise<RgResult<TonTokenContractGetArtInfoResult, number>> {
		const result = await this.invoke("getArtInfo");

		if (!result.is_success) {
			return result;
		}

		const info = getValidatedArtInfoResult(result.data);

		if (info === null) {
			console.log("Ошибка валидации ответа на getArtInfo для адреса", this.address);
			console.log(result.data);

			return {
				is_success: false,
				error: {
					code: -1,
					message: "Ошибка валидации"
				}
			};
		}

		return {
			is_success: true,
			data: info
		};
	}

	public async getInfo(): Promise<RgResult<TonTokenContractGetInfoResult, number>> {
		const result = await this.invoke("getInfo");

		if (!result.is_success) {
			return result;
		}

		const info = getValidatedInfoResult(result.data);

		if (info === null) {
			console.log("Ошибка валидации ответа на getInfo для адреса", this.address);
			console.log(result.data);

			return {
				is_success: false,
				error: {
					code: -1,
					message: "Ошибка валидации"
				}
			};
		}

		return {
			is_success: true,
			data: info
		};
	}

	private async invoke(functionName: string): Promise<RgResult<unknown, number>> {
		let result: ResultOfProcessMessage;

		try {
			result = await this.tonClient.processing.process_message({
				message_encode_params: {
					abi: ART_TOKEN_ABI,
					address: this.address,
					call_set: {
						function_name: functionName
					},
					signer: {
						type: "Keys",
						keys: {
							secret: this.keys.private,
							public: this.keys.public
						}
					}
				},
				send_events: false
			});
		} catch (err) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: err.message
				}
			};
		}

		if (!result.decoded || !result.decoded.output) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: "Ответ не содержит полезных данных"
				}
			};
		}

		return result.decoded.output;
	}
}

function isStruct(data: unknown): data is Record<string, unknown> {
	if (typeof data !== "object" || data == null) {
		return false;
	}
  
	return true;
}

function getValidatedArtInfoResult(input: unknown): ArtInfoResult | null {
	if (!isStruct(input)) {
		return null;
	}


	if (typeof input.hash !== "string") {
		return null;
	}

	return {
		hash: input.hash
	};
}

function getValidatedInfoResult(input: unknown): InfoResult | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.id !== "string") {
		return null;
	}

	if (typeof input.owner !== "string") {
		return null;
	}

	if (typeof input.publicKey !== "string") {
		return null;
	}

	return {
		id: input.id,
		owner: input.owner,
		publicKey: input.publicKey
	};
}
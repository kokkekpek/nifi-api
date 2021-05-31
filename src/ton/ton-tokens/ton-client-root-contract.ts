import {
	Abi,
	ResultOfRunTvm,
	TonClient
} from "@tonclient/core";

import * as fs from "fs";
import { getMultipleBocs } from "../../utils";
import { Event } from "../../utils/events";
import { RgResult } from "../../utils/result";
import { timeout } from "../../utils/timeout";
import { ITonRootContract, TonContractTokenCreatedEvent } from "./ton-root-contract";

const ART_ROOT_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/ArtRoot.abi.json", "utf-8"))
};


const ART_TOKEN_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/ArtToken.abi.json", "utf-8"))
};

export type ArtInfoResult = {
	readonly hash: string;
	readonly creator: string;
};

export type InfoResult = {
	readonly id: string;
	readonly publicKey: string;
	readonly owner: string;
	readonly manager: string;
};

export type TotalInfo = {
	readonly baseInfo: InfoResult;
	readonly artInfo: ArtInfoResult;
};

type BocResult = {
	readonly boc: string;
};

type GetTokenAddressResult = {
	readonly addr: string;
};

function getValidatedArtInfoResult(input: unknown): ArtInfoResult | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.hash !== "string") {
		return null;
	}

	if (typeof input.creator !== "string") {
		return null;
	}

	return {
		hash: input.hash,
		creator: input.creator
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

	if (typeof input.manager !== "string") {
		return null;
	}

	return {
		id: input.id,
		owner: input.owner,
		publicKey: input.publicKey,
		manager: input.manager
	};
}

export class TonClientRootContract implements ITonRootContract {
	public readonly created = new Event<TonContractTokenCreatedEvent>();

	private readonly tonClient: TonClient;
	private readonly address: string;

	private lastMessageTime: number;
	private lastTokenId: number;

	constructor(tonClient: TonClient, address: string) {
		this.tonClient = tonClient;
		this.address = address;

		try {
			this.lastMessageTime = +fs.readFileSync("./last_message_time", "utf-8");
		} catch (err) {
			this.lastMessageTime = 0;
		}

		try {
			this.lastTokenId = +fs.readFileSync("./last_token_id", "utf-8");
		} catch (err) {
			this.lastTokenId = 0;
		}

		this.checkMessagesLoop();
	}

	private saveLastTokenId(): void {
		fs.writeFileSync("./last_token_id", this.lastTokenId + "");
	}

	public updateLastTokenId(): void {
		this.lastTokenId++;
		this.saveLastTokenId();
	}

	private async checkMessagesLoop(): Promise<void> {
		while (true) {
			const tokenId = this.lastTokenId;
			const tokenAddressResult = await this.getTokenAddress(tokenId + "");

			if (!tokenAddressResult.is_success) {
				console.log("Failed to get token address with id", tokenId);
				console.log(tokenAddressResult.error);

				continue;
			}

			const newBoc = await this.getBoc(tokenAddressResult.data);
			if (!newBoc.is_success) {
				continue;
			}

			console.log("Token address received", tokenId, tokenAddressResult.data);

			this.created.emit({
				addr: tokenAddressResult.data
			});

			this.updateLastTokenId();

			const floodLimitsPreventiveDelayMs = 1000;
			await timeout(floodLimitsPreventiveDelayMs);
		}
	}

	private async rawInvoke(boc: string, functionName: string): Promise<RgResult<unknown, number>> {
		let result: ResultOfRunTvm;

		try {
			const encodedMessage = await this.tonClient.abi.encode_message({
				abi: ART_TOKEN_ABI,
				signer: {
					type: "None"
				},
				call_set: {
					function_name: functionName,
					input: {}
				},
				address: this.address
			});
			
			result = await this.tonClient.tvm.run_tvm({
				message: encodedMessage.message,
				account: boc
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

		const rawMessage = result.out_messages[0];
		if (!rawMessage) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: "Response does not contain messages"
				}
			};
		}

		const decoded = await this.tonClient.abi.decode_message({
			abi: ART_TOKEN_ABI,
			message: rawMessage
		});

		if (!decoded.value) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: "Response does not contain useful data"
				}
			};
		}

		return {
			is_success: true,
			data: decoded.value
		};
	}

	public async getInfoAboutMultipleAccounts(
		addresses: string[]
	): Promise<RgResult<[string, TotalInfo][]>> {
		const bocs = await getMultipleBocs(this.tonClient, addresses);
		if (!bocs.is_success) {
			return bocs;
		}

		const result: [string, TotalInfo][] = [];
		for (const [address, boc] of bocs.data.entries()) {
			const info = await this.rawInvoke(boc, "getInfo");
			if (!info.is_success) {
				continue;
			}

			const validInfo = getValidatedInfoResult(info.data);
			if (!validInfo) {
				continue;
			}

			const artResult = await this.rawInvoke(boc, "getArtInfo");

			if (!artResult.is_success) {
				continue;
			}

			const artResultValidated = getValidatedArtInfoResult(artResult.data);

			if (artResultValidated === null) {
				continue;
			}

			result.push([address, {
				baseInfo: validInfo,
				artInfo: artResultValidated
			}]);
		}

		return {
			is_success: true,
			data: result
		};
	}

	private async getTokenAddress(tokenId: string): Promise<RgResult<string, unknown>> {
		const result = await this.invoke("getTokenAddress", { id: tokenId });

		if (!result.is_success) {
			return result;
		}

		const info = getValidatedTokenAddressResult(result.data);

		if (info === null) {
			console.log("Response validation fault to getTokenAddress for root contract");
			console.log(result.data);

			return {
				is_success: false,
				error: {
					code: -1,
					message: "Validation fault"
				}
			};
		}

		return {
			is_success: true,
			data: info.addr
		};
	}

	private async invoke(functionName: string, input: unknown): Promise<RgResult<unknown, number>> {
		const bocResult = await this.getBoc();

		if (!bocResult.is_success) {
			return bocResult;
		}

		let result: ResultOfRunTvm;

		try {
			const encodedMessage = await this.tonClient.abi.encode_message({
				abi: ART_ROOT_ABI,
				signer: {
					type: "None"
				},
				call_set: {
					function_name: functionName,
					input
				},
				address: this.address
			});
			
			result = await this.tonClient.tvm.run_tvm({
				message: encodedMessage.message,
				account: bocResult.data,
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

		const rawMessage = result.out_messages[0];
		if (!rawMessage) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: "Response does not contain messages"
				}
			};
		}

		const decoded = await this.tonClient.abi.decode_message({
			abi: ART_ROOT_ABI,
			message: rawMessage
		});

		if (!decoded.value) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: "Response does not contain useful data"
				}
			};
		}

		return {
			is_success: true,
			data: decoded.value
		};
	}

	private async getBoc(address?: string): Promise<RgResult<string, number>> {
		let result: unknown[];

		try {
			const queryCollectionResult = await this.tonClient.net.query_collection({
				collection: "accounts",
				filter: {
					id: { eq: address || this.address },
				},
				result: "boc",
				limit: 1
			});

			result = queryCollectionResult.result;
		} catch (err) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: err.message
				}
			};
		}

		if (!result[0]) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: "TON SDK returned empty response on BOC request"
				}
			};
		}

		const validatedBoc = getValidatedBocResult(result[0]);

		if (!validatedBoc) {
			console.log("Validation fault for attempt to get BOC for root contract");
			console.log(result[0]);

			return {
				is_success: false,
				error: {
					code: -1,
					message: "BOC Validation Fault"
				}
			};
		}

		return {
			is_success: true,
			data: validatedBoc.boc
		};
	}
}

function isStruct(data: unknown): data is Record<string, unknown> {
	if (typeof data !== "object" || data == null) {
		return false;
	}
  
	return true;
}

function getValidatedTokenAddressResult(input: unknown): GetTokenAddressResult | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.addr !== "string") {
		return null;
	}

	return {
		addr: input.addr
	};
}

function getValidatedBocResult(input: unknown): BocResult | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.boc !== "string") {
		return null;
	}

	return {
		boc: input.boc
	};
}
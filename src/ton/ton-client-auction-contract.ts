import {
	ITonAuctionContract,
	ITonAuctionContractFactory,
	TonAuctionContractGetInfoResult
} from "./ton-auction-contract";

import * as fs from "fs";
import { Abi, ResultOfRunTvm, TonClient } from "@tonclient/core";
import { AuctionBid } from "../auctions/auctions-manager";
import { Event } from "../utils/events";
import { RgResult } from "../utils/result";

const DIRECT_AUCTION_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/DirectAuction.abi.json", "utf-8"))
};

type BocResult = {
	readonly boc: string;
};

type InfoResult = {
	readonly id: string;
	readonly creator: string;
	readonly token: string;
	readonly startBid: string;
	readonly stepBid: string;
	readonly feeBid: string;
	readonly startTime: string;
	readonly endTime: string;
};

export class TonClientAuctionContractFactory implements ITonAuctionContractFactory {
	private readonly tonClient: TonClient;

	constructor(tonClient: TonClient) {
		this.tonClient = tonClient;
	}

	public getAuctionContract(addr: string): ITonAuctionContract {
		return new TonClientAuctionContract(this.tonClient, addr);
	}
}

export class TonClientAuctionContract implements ITonAuctionContract {
	public readonly bidEvent = new Event<AuctionBid>();
	public readonly finishEvent = new Event<AuctionBid>();

	private readonly tonClient: TonClient;
	private readonly address: string;

	constructor(tonClient: TonClient, address: string) {
		this.tonClient = tonClient;
		this.address = address;
	}

	public async getInfo(): Promise<RgResult<TonAuctionContractGetInfoResult, number>> {
		const result = await this.invoke("getInfo");

		if (!result.is_success) {
			return result;
		}

		const info = getValidatedInfoResult(result.data);

		if (info === null) {
			console.log("Response validation fault to getInfo for address", this.address);
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
			data: {
				id: info.id,
				creator: info.creator,
				token: info.token,
				startBid: info.startBid,
				stepBid: info.stepBid,
				feeBid: info.feeBid,
				startTime: +info.startTime,
				endTime: +info.endTime
			}
		};
	}

	private async getBoc(): Promise<RgResult<string, number>> {
		let result: unknown[];

		try {
			const queryCollectionResult = await this.tonClient.net.query_collection({
				collection: "accounts",
				filter: {
					id: { eq: this.address },
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
			console.log("Validation fault for attempt to get BOC for address", this.address);
			console.log(result[0]);

			return {
				is_success: false,
				error: {
					code: -1,
					message: "BOC Validation fault"
				}
			};
		}

		return {
			is_success: true,
			data: validatedBoc.boc
		};
	}

	private async invoke(functionName: string): Promise<RgResult<unknown, number>> {
		const bocResult = await this.getBoc();

		if (!bocResult.is_success) {
			return bocResult;
		}

		let result: ResultOfRunTvm;

		try {
			const encodedMessage = await this.tonClient.abi.encode_message({
				abi: DIRECT_AUCTION_ABI,
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
			abi: DIRECT_AUCTION_ABI,
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
}

function isStruct(data: unknown): data is Record<string, unknown> {
	if (typeof data !== "object" || data == null) {
		return false;
	}
  
	return true;
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

function getValidatedInfoResult(input: unknown): InfoResult | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.id !== "string") {
		return null;
	}

	if (typeof input.creator !== "string") {
		return null;
	}

	if (typeof input.token !== "string") {
		return null;
	}

	if (typeof input.startBid !== "string") {
		return null;
	}

	if (typeof input.stepBid !== "string") {
		return null;
	}

	if (typeof input.feeBid !== "string") {
		return null;
	}

	if (typeof input.startTime !== "string") {
		return null;
	}

	if (typeof input.endTime !== "string") {
		return null;
	}

	return {
		id: input.id,
		creator: input.creator,
		token: input.token,
		startBid: input.startBid,
		stepBid: input.stepBid,
		feeBid: input.feeBid,
		startTime: input.startTime,
		endTime: input.endTime
	};
}
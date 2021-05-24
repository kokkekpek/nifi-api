import { Abi, DecodedMessageBody, ResultOfRunTvm, SortDirection, TonClient } from "@tonclient/core";
import * as fs from "fs";
import { Event } from "../../utils/events";
import { RgResult } from "../../utils/result";
import { timeout } from "../../utils/timeout";
import { ITonRootOffersContract, TonOfferCreatedEvent } from "./ton-root-offers-contract";

const OFFERS_ROOT_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/OfferRoot.abi.json", "utf-8"))
};

type BocResult = {
	readonly boc: string;
};

type EncodedMessage = {
	readonly body: string;
	readonly created_at: number;
	readonly dst_transaction: {
		readonly aborted: boolean;
		readonly id: string;
	} | null;
};

type DecodedMessage = {
	readonly name: string;
	readonly encodedMessage: EncodedMessage;
	readonly body: Record<string, unknown>;
	readonly createdAt: number;
};

type GetTokenAddressResult = {
	readonly addr: string;
};

export class TonClientRootOffersContract implements ITonRootOffersContract {
	public readonly created = new Event<TonOfferCreatedEvent>();

	private readonly tonClient: TonClient;
	private readonly address: string;

	private lastOfferTime: number;
	private lastOfferId: number;

	constructor(tonClient: TonClient, address: string) {
		this.tonClient = tonClient;
		this.address = address;

		try {
			this.lastOfferTime = +fs.readFileSync("./last_offer_time", "utf-8");
		} catch (err) {
			this.lastOfferTime = 0;
		}

		try {
			this.lastOfferId = +fs.readFileSync("./last_offer_id", "utf-8");
		} catch (err) {
			this.lastOfferId = 0;
		}

		this.checkMessagesLoop();
	}

	private saveLastOfferTime(): void {
		fs.writeFileSync("./last_offer_time", this.lastOfferTime + "");
	}

	private saveLastOfferd(): void {
		fs.writeFileSync("./last_offer_id", this.lastOfferId + "");
	}

	public updateLastOfferId(): void {
		this.lastOfferId++;
		this.saveLastOfferd();
	}

	private async checkMessagesLoop(): Promise<void> {
		while (true) {
			const offerId = this.lastOfferId;
			const offerAddressResult = await this.getOfferAddress(offerId + "");

			if (!offerAddressResult.is_success) {
				console.log("Failed to get offer address with id", offerId);
				console.log(offerAddressResult.error);

				continue;
			}

			const messages = await this.getOutgoingMessagesLength(offerAddressResult.data);

			if (!messages.is_success) continue;
			if (messages.data === 0) continue;

			console.log("Offer address received", offerId, offerAddressResult.data);

			this.created.emit({
				addr: offerAddressResult.data
			});

			this.updateLastOfferId();

			const floodLimitsPreventiveDelayMs = 1000;
			await timeout(floodLimitsPreventiveDelayMs);
		}
	}

	private async getMessages(): Promise<RgResult<DecodedMessage[], number>> {
		let result: unknown[];

		try {
			const queryCollectionResult = await this.tonClient.net.query_collection({
				collection: "messages",
				order: [
					{
						path: "created_at",
						direction: SortDirection.ASC
					}
				],
				filter: {
					created_at: { gt: this.lastOfferTime },
					src: { eq: this.address }
				},
				result: "body created_at dst_transaction { aborted, id }",
				limit: 100
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

		const encodedMessages: EncodedMessage[] = [];

		for (const entry of result) {
			const encodedMessage = getValidatedEncodedMessage(entry);

			if (encodedMessage === null) {
				continue;
			}

			encodedMessages.push(encodedMessage);
		}

		const lastEncodedMessage = encodedMessages[encodedMessages.length - 1];
		if (lastEncodedMessage !== undefined) {
			this.lastOfferTime = lastEncodedMessage.created_at;
			this.saveLastOfferTime();
		}

		const decodedMessages: DecodedMessage[] = [];

		for (const encodedMessage of encodedMessages) {
			if (encodedMessage.dst_transaction && encodedMessage.dst_transaction.aborted) {
				continue;
			}

			let decoded: DecodedMessageBody;

			try {
				decoded = await this.tonClient.abi.decode_message_body({
					abi: OFFERS_ROOT_ABI,
					body: encodedMessage.body,
					is_internal: true
				});
			} catch (err) {
				continue;
			}

			
			if (!decoded.value) {
				continue;
			}

			decodedMessages.push({
				name: decoded.name,
				encodedMessage,
				body: decoded.value,
				createdAt: encodedMessage.created_at
			});
		}

		return {
			is_success: true,
			data: decodedMessages
		};
	}

	private async getOutgoingMessagesLength(address: string): Promise<RgResult<number, number>> {
		try {
			const queryCollectionResult = await this.tonClient.net.query_collection({
				collection: "messages",
				filter: {
					src: { eq: address }
				},
				result: "body",
				limit: 100
			});

			return {
				is_success: true,
				data: queryCollectionResult.result.length
			};
		} catch (err) {
			return {
				is_success: false,
				error: {
					code: -1,
					message: err.message
				}
			};
		}
	}

	private async getOfferAddress(tokenId: string): Promise<RgResult<string, unknown>> {
		const result = await this.invoke("getTokenAddress", { id: tokenId });

		if (!result.is_success) {
			return result;
		}

		const info = getValidatedTokenAddressResult(result.data);

		if (info === null) {
			console.log("Response validation fault to getTokenAddress for offers root contract");
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
				abi: OFFERS_ROOT_ABI,
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
			abi: OFFERS_ROOT_ABI,
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

function getValidatedEncodedMessage(input: unknown): EncodedMessage | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.body !== "string") {
		return null;
	}

	if (typeof input.created_at !== "number") {
		return null;
	}

	let dstTransaction: EncodedMessage["dst_transaction"] = null;

	if (isStruct(input.dst_transaction)) {
		if (typeof input.dst_transaction.aborted !== "boolean") {
			return null;
		}
	
		if (typeof input.dst_transaction.id !== "string") {
			return null;
		}

		dstTransaction = {
			aborted: input.dst_transaction.aborted,
			id: input.dst_transaction.id
		};
	}

	return {
		body: input.body,
		created_at: input.created_at,
		dst_transaction: dstTransaction
	};
}
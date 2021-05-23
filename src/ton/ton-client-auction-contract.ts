import {
	ITonAuctionContract,
	ITonAuctionContractFactory,
	TonAuctionContractGetInfoResult
} from "./ton-auction-contract";

import * as fs from "fs";
import { Abi, DecodedMessageBody, ResultOfRunTvm, SortDirection, TonClient } from "@tonclient/core";
import { AuctionBid } from "../auctions/auctions-manager";
import { Event } from "../utils/events";
import { RgResult } from "../utils/result";
import { ITonMessagesCheckerStorage } from "./ton-messages-checker-storage";
import { timeout } from "../utils/timeout";

const DIRECT_AUCTION_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/DirectAuction.abi.json", "utf-8"))
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
	};
};

type DecodedMessage = {
	readonly name: string;
	readonly encodedMessage: EncodedMessage;
	readonly body: Record<string, unknown>;
	readonly createdAt: number;
};

type InfoResult = {
	readonly id: string;
	readonly creator: string;
	readonly token: string;
	readonly startBid: string;
	readonly stepBid: string;
	readonly feeBid: string;
	readonly starTime: string; // TODO: Fix typo
	readonly endTime: string;
};

type BidEventMessage = {
	readonly id: string;
	readonly creator: string;
	readonly token: string;
	readonly bider: string;
	readonly value: string;
};

export class TonClientAuctionContractFactory implements ITonAuctionContractFactory {
	private readonly storage: ITonMessagesCheckerStorage;
	private readonly tonClient: TonClient;

	constructor(storage: ITonMessagesCheckerStorage, tonClient: TonClient) {
		this.storage = storage;
		this.tonClient = tonClient;
	}

	public getAuctionContract(addr: string): ITonAuctionContract {
		return new TonClientAuctionContract(this.storage, this.tonClient, addr);
	}
}

export class TonClientAuctionContract implements ITonAuctionContract {
	private readonly storage: ITonMessagesCheckerStorage;

	public readonly bidEvent = new Event<AuctionBid>();
	public readonly finishEvent = new Event<AuctionBid>();

	private readonly tonClient: TonClient;
	private readonly address: string;

	constructor(storage: ITonMessagesCheckerStorage, tonClient: TonClient, address: string) {
		this.storage = storage;
		this.tonClient = tonClient;
		this.address = address;
	}

	private getBidByMessageBidEvent(messageBidEvent: BidEventMessage): AuctionBid {
		return {
			bidId: messageBidEvent.id,
			...messageBidEvent
		};
	}

	public async checkMessages(): Promise<void> {
		const messagesResult = await this.getMessages();

		if (!messagesResult.is_success) {
			console.log("Failed to get auction messages:");
			console.log(messagesResult.error);

			const delayBeforeRetryAfterError = 3000;
			await timeout(delayBeforeRetryAfterError);

			return;
		}

		let total = 0;
		let unvalidatedEvents = 0;
		let validatedEvents = 0;

		for (const message of messagesResult.data) {
			if (message.name !== "BidEvent" && message.name !== "FinishEvent") continue;

			total++;

			const bidEventMessage = getValidatedBidEventMessage(message.body);

			if (bidEventMessage === null) {
				unvalidatedEvents++;
				continue;
			}

			validatedEvents++;

			switch (message.name) {
				case "BidEvent":
					this.bidEvent.emit(this.getBidByMessageBidEvent(bidEventMessage));
					break;
				case "FinishEvent":
					this.finishEvent.emit(this.getBidByMessageBidEvent(bidEventMessage));
					break;
			}
		}

		if (total !== 0) {
			console.log("Auction contract", this.address, "checked", total, "messages");
			console.log("Unvalidated:", unvalidatedEvents, "validated:", validatedEvents);
		}
	}

	private async getMessages(): Promise<RgResult<DecodedMessage[], number>> {
		let result: unknown[];

		const lastMessageTime = await this.storage.getLastMessageTimeByAddress(this.address) || 0;

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
					created_at: { gt: lastMessageTime },
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
			await this.storage.setLastMessageTimeByAddress(
				this.address,
				lastEncodedMessage.created_at
			);
		}

		const decodedMessages: DecodedMessage[] = [];

		for (const encodedMessage of encodedMessages) {
			if (encodedMessage.dst_transaction.aborted) {
				continue;
			}

			let decoded: DecodedMessageBody;

			try {
				decoded = await this.tonClient.abi.decode_message_body({
					abi: DIRECT_AUCTION_ABI,
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
				startTime: +info.starTime,
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

	if (typeof input.starTime !== "string") {
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
		starTime: input.starTime,
		endTime: input.endTime
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

	if (!isStruct(input.dst_transaction)) {
		return null;
	}

	if (typeof input.dst_transaction.aborted !== "boolean") {
		return null;
	}

	if (typeof input.dst_transaction.id !== "string") {
		return null;
	}

	return {
		body: input.body,
		created_at: input.created_at,
		dst_transaction: {
			aborted: input.dst_transaction.aborted,
			id: input.dst_transaction.id
		}
	};
}

function getValidatedBidEventMessage(input: unknown): BidEventMessage | null {
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

	if (typeof input.bider !== "string") {
		return null;
	}

	if (typeof input.value !== "string") {
		return null;
	}

	return {
		id: input.id,
		creator: input.creator,
		token: input.token,
		bider: input.bider,
		value: input.value
	};
}
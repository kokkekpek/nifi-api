import * as fs from "fs";
import { Abi, DecodedMessageBody, ResultOfRunTvm, SortDirection, TonClient } from "@tonclient/core";
import { Event } from "../../utils/events";
import { ITonMessagesCheckerStorage } from "../ton-messages-checker-storage";
import { ITonOfferContract, TonOfferContractGetInfoResult } from "./ton-offer-contract";
import { RgResult } from "../../utils/result";
import { timeout } from "../../utils/timeout";

const OFFER_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/Offer.abi.json", "utf-8"))
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

type InfoResult = {
	readonly id: string;
	readonly creator: string;
	readonly token: string;
	readonly price: string;
	readonly fee: string;
	readonly endTime: string;
};

export class TonClientOfferContract implements ITonOfferContract {
	private readonly storage: ITonMessagesCheckerStorage;

	public readonly offerAcceptedEvent = new Event<void>();
	public readonly offerFinishedEvent = new Event<void>();

	private readonly tonClient: TonClient;
	private readonly address: string;

	constructor(storage: ITonMessagesCheckerStorage, tonClient: TonClient, address: string) {
		this.storage = storage;
		this.tonClient = tonClient;
		this.address = address;
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
		let validatedEvents = 0;

		for (const message of messagesResult.data) {
			if (message.name !== "OfferAccepted" && message.name !== "OfferFinished") continue;

			total++;
			validatedEvents++;

			switch (message.name) {
				case "OfferAccepted":
					this.offerAcceptedEvent.emit();
					break;
				case "OfferFinished":
					this.offerFinishedEvent.emit();
					break;
			}
		}

		if (total !== 0) {
			console.log("Offer contract", this.address, "checked", total, "messages");
			console.log("validated:", validatedEvents);
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
			if (encodedMessage.dst_transaction && encodedMessage.dst_transaction.aborted) {
				continue;
			}

			let decoded: DecodedMessageBody;

			try {
				decoded = await this.tonClient.abi.decode_message_body({
					abi: OFFER_ABI,
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

	public async getInfo(): Promise<RgResult<TonOfferContractGetInfoResult, number>> {
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
				price: info.price,
				fee: info.fee,
				endTime: info.endTime
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
				abi: OFFER_ABI,
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
			abi: OFFER_ABI,
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

	if (typeof input.price !== "string") {
		return null;
	}

	if (typeof input.fee !== "string") {
		return null;
	}

	if (typeof input.endTime !== "string") {
		return null;
	}

	return {
		id: input.id,
		creator: input.creator,
		token: input.token,
		price: input.price,
		fee: input.fee,
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
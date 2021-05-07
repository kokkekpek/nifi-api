import {
	Abi,
	DecodedMessageBody,
	ResultOfRunTvm,
	SortDirection,
	TonClient
} from "@tonclient/core";

import { Event, RgResult, timeout } from "rg";
import * as fs from "fs";
import { ITonRootContract, TonContractTokenCreatedEvent } from "./ton-root-contract";

const ART_ROOT_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/ArtRoot.abi.json", "utf-8"))
};

type EncodedMessage = {
	readonly body: string;
	readonly created_at: number;
};

type DecodedMessage = {
	readonly body: Record<string, unknown>;
	readonly createdAt: number;
};

type BocResult = {
	readonly boc: string;
};

type CreateMessage = {
	readonly owner: string;
	readonly manager: string;
	readonly managerUnlockTime: string;
	readonly creator: string;
	readonly creatorFees: string;
	readonly hash: string;
};

type GetTokenAddressResult = {
	readonly addr: string;
};

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

	private saveLastMessageTime(): void {
		fs.writeFileSync("./last_message_time", this.lastMessageTime + "");
	}

	private saveLastTokenId(): void {
		fs.writeFileSync("./last_token_id", this.lastTokenId + "");
	}

	private async checkMessagesLoop(): Promise<void> {
		while (true) {
			const messagesResult = await this.getMessages();

			if (!messagesResult.is_success) {
				console.log("Не удалось получить сообщения корневого кошелька:");
				console.log(messagesResult.error);

				const delayBeforeRetryAfterError = 3000;
				await timeout(delayBeforeRetryAfterError);

				continue;
			}

			let isLastTokenIdModified = false;

			for (const message of messagesResult.data) {
				const validatedMessage = getValidatedCreateMessage(message.body);

				if (validatedMessage === null) continue;

				await timeout(500);

				const tokenId = this.lastTokenId;
				this.lastTokenId++;
				isLastTokenIdModified = true;

				console.log("Получаю адрес токена с идентификатором", tokenId);
				const tokenAddressResult = await this.getTokenAddress(tokenId + "");

				if (!tokenAddressResult.is_success) {
					console.log("Не удалось получить адрес токена с идентификатором", tokenId);
					console.log(tokenAddressResult.error);

					continue;
				}

				console.log("Получен адрес токена", tokenId, tokenAddressResult.data);

				this.created.emit({
					addr: tokenAddressResult.data
				});
			}

			if (isLastTokenIdModified) {
				this.saveLastTokenId();
			}

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
					created_at: { gt: this.lastMessageTime },
					dst: { eq: this.address }
				},
				result: "body created_at",
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

			if (encodedMessage === null) continue;

			encodedMessages.push(encodedMessage);
		}

		const lastEncodedMessage = encodedMessages[encodedMessages.length - 1];
		if (lastEncodedMessage !== undefined) {
			this.lastMessageTime = lastEncodedMessage.created_at;
			this.saveLastMessageTime();
		}

		const decodedMessages: DecodedMessage[] = [];

		for (const encodedMessage of encodedMessages) {
			let decoded: DecodedMessageBody;

			try {
				decoded = await this.tonClient.abi.decode_message({
					abi: ART_ROOT_ABI,
					message: encodedMessage.body,
				});
			} catch (err) {
				continue;
			}

			if (!decoded.value) continue;

			decodedMessages.push({
				body: decoded.value,
				createdAt: encodedMessage.created_at
			});
		}

		return {
			is_success: true,
			data: decodedMessages
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
			console.log("Ошибка валидации попытки получения boc для корневого контракта");
			console.log(result[0]);

			return {
				is_success: false,
				error: {
					code: -1,
					message: "Ошибка валидации BOC"
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

	return {
		body: input.body,
		created_at: input.created_at
	};
}

function getValidatedCreateMessage(input: unknown): CreateMessage | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.owner !== "string") {
		return null;
	}

	if (typeof input.manager !== "string") {
		return null;
	}

	if (typeof input.managerUnlockTime !== "string") {
		return null;
	}

	if (typeof input.creator !== "string") {
		return null;
	}

	if (typeof input.creatorFees !== "string") {
		return null;
	}

	if (typeof input.hash !== "string") {
		return null;
	}

	return {
		owner: input.owner,
		manager: input.manager,
		managerUnlockTime: input.managerUnlockTime,
		creator: input.creator,
		creatorFees: input.creatorFees,
		hash: input.hash
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
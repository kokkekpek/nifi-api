import { Abi, DecodedMessageBody, TonClient } from "@tonclient/core";
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

type CreateMessage = {
	readonly name: "create";
	readonly outputs: {
		readonly addr: string;
	};
};

export class TonClientRootContract implements ITonRootContract {
	public readonly created = new Event<TonContractTokenCreatedEvent>();

	private readonly tonClient: TonClient;
	private readonly address: string;

	private lastMessageTime: number;

	constructor(tonClient: TonClient, address: string) {
		this.tonClient = tonClient;
		this.address = address;

		try {
			this.lastMessageTime = +fs.readFileSync("./last_message_time", "utf-8");
		} catch (err) {
			this.lastMessageTime = 0;
		}

		this.checkMessagesLoop();
	}

	private saveLastMessageTime(): void {
		fs.writeFileSync("./last_message_time", this.lastMessageTime + "");
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

			for (const message of messagesResult.data) {
				const validatedMessage = getValidatedCreateMessage(message.body);

				if (validatedMessage === null) continue;

				this.created.emit({
					addr: validatedMessage.outputs.addr
				});
			}

			const lastMessage = messagesResult.data[messagesResult.data.length - 1];

			if (lastMessage !== undefined) {
				this.lastMessageTime = lastMessage.createdAt;
				this.saveLastMessageTime();
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

		const decodedMessages: DecodedMessage[] = [];

		for (const entry of result) {
			const encodedMessage = getValidatedEncodedMessage(entry);

			if (encodedMessage === null) continue;

			let decoded: DecodedMessageBody;

			try {
				decoded = await this.tonClient.abi.decode_message({
					abi: ART_ROOT_ABI,
					message: encodedMessage.body
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

	if (input.name !== "create") {
		return null;
	}

	if (!isStruct(input.outputs)) {
		return null;
	}

	if (typeof input.outputs.addr !== "string") {
		return null;
	}

	return {
		name: input.name,
		outputs: {
			addr: input.outputs.addr
		}
	};
}
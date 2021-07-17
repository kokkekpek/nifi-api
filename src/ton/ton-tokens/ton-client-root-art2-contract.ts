import {
	Abi,
	DecodedMessageBody,
	ResultOfRunTvm,
	SortDirection,
	TonClient
} from "@tonclient/core";

import * as fs from "fs";
import { getMultipleBocs } from "../../utils";
import { Event } from "../../utils/events";
import { RgResult } from "../../utils/result";
import { ITonRootArt2Contract, TonContractArt2Mint, TonContractArt2Series } from "./ton-root-art2-contract";
import { ITonMessagesCheckerStorage } from "./../ton-messages-checker-storage";
import { timeout } from "../../utils/timeout";
import { Connection } from "typeorm";
import { UniversalMessageStorage } from "../../uni-msgs-str";

const ART2_ROOT_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/Art2Root.abi.json", "utf-8"))
};

const ART2_SERIES_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/Art2Series.abi.json", "utf-8"))
};

const ART2_TOKEN_ABI: Abi = {
	type: "Contract",
	value: JSON.parse(fs.readFileSync("./abi/Art2Token.abi.json", "utf-8"))
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

export type ArtInfoResult = {
	readonly hash: string;
	readonly creator: string;
};

export type InfoResult = {
	readonly id: string;
	readonly publicKey: string;
	readonly owner: string;
	readonly manager: string;
	readonly maximum: string | null;
};

export type TotalInfo = {
	readonly baseInfo: InfoResult;
	readonly artInfo: ArtInfoResult;
};

type BocResult = {
	readonly boc: string;
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
		manager: input.manager,
		maximum: null
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

export type SeriesInfo = {
	id: string;
	limit: string;
	name: string;
	symbol: string;
	totalSupply: string;
};
function getValidatedSeries(input: unknown): SeriesInfo | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.id !== "string") {
		return null;
	}

	if (typeof input.limit !== "string") {
		return null;
	}

	if (typeof input.name !== "string") {
		return null;
	}

	if (typeof input.symbol !== "string") {
		return null;
	}

	if (typeof input.totalSupply !== "string") {
		return null;
	}

	return {
		id: input.id,
		limit: input.limit,
		name: input.name,
		symbol: input.symbol,
		totalSupply: input.totalSupply
	};
}

type SeriesEventMessage = {
	id: string;
	serie: string;
};
function getValidatedSeriesEvent(input: unknown): SeriesEventMessage | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.id !== "string") {
		return null;
	}

	if (typeof input.serie !== "string") {
		return null;
	}

	return {
		id: input.id,
		serie: input.serie,
	};
}

type MintEventMessage = {
	id: string;
	token: string;
};
function getValidatedMintEvent(input: unknown): MintEventMessage | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.id !== "string") {
		return null;
	}

	if (typeof input.token !== "string") {
		return null;
	}

	return {
		id: input.id,
		token: input.token,
	};
}

export class TonClientRootArt2Contract implements ITonRootArt2Contract {
	public readonly series: Event<TonContractArt2Series> = new Event();
	public readonly mint: Event<TonContractArt2Mint> = new Event();

	private readonly storage: UniversalMessageStorage;
	private readonly tonClient: TonClient;
	private readonly address: string;

	constructor(storage: UniversalMessageStorage, tonClient: TonClient, address: string) {
		this.tonClient = tonClient;
		this.address = address;
		this.storage = storage;

		this.checkMessagesRoot();
	}

	public async init(): Promise<void> {
		const series = await this.storage.getAll();
		for (const s of series) {
			this.checkMessagesSeries(s);
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
					abi: ART2_ROOT_ABI,
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

	public async setSeries(addr: string, lt: number): Promise<void> {
		await this.storage.setLastMessageTimeByAddress(addr, lt);
	}

	private async getMessagesSeries(addr: string): Promise<RgResult<DecodedMessage[], number>> {
		let result: unknown[];

		const lastMessageTime = await this.storage.getLastMessageTimeByAddress(addr) || 0;

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
					src: { eq: addr }
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
				addr,
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
					abi: ART2_SERIES_ABI,
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

	private async checkMessagesRoot(): Promise<void> {
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
			if (message.name !== "newSerie") continue;

			total++;

			const seriesEventMessage = getValidatedSeriesEvent(message.body);

			if (seriesEventMessage === null) {
				unvalidatedEvents++;
				continue;
			}

			validatedEvents++;

			switch (message.name) {
				case "newSerie":
					this.series.emit({
						addr: seriesEventMessage.serie,
						time: message.createdAt
					});

					this.checkMessagesSeries(seriesEventMessage.serie);
					
					break;
			}
		}

		if (total !== 0) {
			console.log("Auction contract", this.address, "checked", total, "messages");
			console.log("Unvalidated:", unvalidatedEvents, "validated:", validatedEvents);
		}

		setTimeout(this.checkMessagesRoot.bind(this), 1000);
	}

	public getDatabase(): Connection {
		return this.storage.getDatabase();
	}

	public async getSeriesInfo(addr: string): Promise<RgResult<SeriesInfo>> {
		const info = await this.invoke(addr, "getInfo");
		if (!info.is_success) {
			return info;
		}
		
		const ok = getValidatedSeries(info.data);
		if (!ok) {
			return {
				is_success: false,
				error: {
					code: 0,
					message: "invalid serie"
				}
			};
		}

		return {
			is_success: true,
			data: {
				limit: ok.limit,
				id: ok.id,
				symbol: ok.symbol,
				name: ok.name,
				totalSupply: ok.totalSupply
			}
		};
	}

	private async checkMessagesSeries(addr: string): Promise<void> {
		const messagesResult = await this.getMessagesSeries(addr);

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
			if (message.name !== "mint") continue;

			total++;

			const mintEventMessage = getValidatedMintEvent(message.body);

			if (mintEventMessage === null) {
				unvalidatedEvents++;
				continue;
			}

			validatedEvents++;

			switch (message.name) {
				case "mint":
					this.mint.emit({
						addr: mintEventMessage.token,
						series: addr
					});

					break;
			}
		}

		if (total !== 0) {
			console.log("Auction contract", this.address, "checked", total, "messages");
			console.log("Unvalidated:", unvalidatedEvents, "validated:", validatedEvents);
		}

		setTimeout(() => {
			this.checkMessagesSeries(addr);
		}, 1000);
	}

	private async rawInvoke(boc: string, functionName: string): Promise<RgResult<unknown, number>> {
		let result: ResultOfRunTvm;

		try {
			const encodedMessage = await this.tonClient.abi.encode_message({
				abi: ART2_TOKEN_ABI,
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
			abi: ART2_TOKEN_ABI,
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

	private async rawInvokeSeries(boc: string, functionName: string): Promise<RgResult<unknown, number>> {
		let result: ResultOfRunTvm;

		try {
			const encodedMessage = await this.tonClient.abi.encode_message({
				abi: ART2_SERIES_ABI,
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
			abi: ART2_TOKEN_ABI,
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

	private async invoke(addr: string, functionName: string): Promise<RgResult<unknown, number>> {
		const bocResult = await this.getBoc(addr);

		if (!bocResult.is_success) {
			return bocResult;
		}

		let result: ResultOfRunTvm;

		try {
			const encodedMessage = await this.tonClient.abi.encode_message({
				abi: ART2_SERIES_ABI,
				signer: {
					type: "None"
				},
				call_set: {
					function_name: functionName,
					input: {}
				},
				address: addr
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
			abi: ART2_SERIES_ABI,
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
import { TonClient } from "@tonclient/core";
import { Token } from "./tokens/tokens-manager";
import { RgResult } from "./utils/result";

export type MultipleBocsResult = Map<string, string>;
type BocResult = {
	readonly boc: string;
	readonly id: string;
};

function getValidatedBocResult(input: unknown): BocResult | null {
	if (!isStruct(input)) {
		return null;
	}

	if (typeof input.boc !== "string") {
		return null;
	}

	if (typeof input.id !== "string") {
		return null;
	}

	return {
		boc: input.boc,
		id: input.id
	};
}

export function sliceIntoChunks(arr: Token[], chunkSize: number): Token[][] {
	const res = [];
	for (let i = 0; i < arr.length; i += chunkSize) {
		const chunk = arr.slice(i, i + chunkSize);
		res.push(chunk);
	}

	return res;
}

export async function getMultipleBocs(
	client: TonClient,
	addresses: string[]
): Promise<RgResult<MultipleBocsResult, number>> {
	let result: unknown[];

	try {
		const queryCollectionResult = await client.net.query_collection({
			collection: "accounts",
			filter: {
				id: { in: addresses },
			},
			result: "boc id",
			limit: 50
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

	const bocs = new Map<string, string>();
	for (const unk of result) {
		const validatedBoc = getValidatedBocResult(unk);

		if (!validatedBoc) {
			continue;
		}

		bocs.set(validatedBoc.id, validatedBoc.boc);
	}

	return {
		is_success: true,
		data: bocs
	};
}

function isStruct(data: unknown): data is Record<string, unknown> {
	if (typeof data !== "object" || data == null) {
		return false;
	}
  
	return true;
}

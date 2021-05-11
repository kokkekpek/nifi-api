import { mutexLockOrAwait, mutexUnlock } from "../utils/mutex";
import { ITokensStorage } from "./tokens-storage";

export type Token = {
	readonly id: string;
	readonly address: string;
	readonly userPublicKey: string;
	owner: string;
	hash: string;
};

export type AddTokenResult = "success" | "token_with_such_id_already_exists";

export class TokensManager {
	private readonly storage: ITokensStorage;

	constructor(storage: ITokensStorage) {
		this.storage = storage;
	}

	public async addToken(token: Token): Promise<AddTokenResult> {
		const mutexName = "saving_token_" + token.id;
		await mutexLockOrAwait(mutexName);

		try {
			const hasToken = await this.storage.hasTokenWithId(token.id);

			if (hasToken) {
				return "token_with_such_id_already_exists";
			}
	
			await this.storage.addToken(token);
			return "success";
		} finally {
			mutexUnlock(mutexName);
		}
	}

	public async setOwnerByTokenId(tokenId: string, newOwner: string): Promise<void> {
		await this.storage.setOwnerByTokenId(tokenId, newOwner);
	}

	public async setHashByTokenId(tokenId: string, newHash: string): Promise<void> {
		await this.storage.setHashByTokenId(tokenId, newHash);
	}

	public async getAllTokens(): Promise<Token[]> {
		return await this.storage.getAllTokens();
	}

	public async getTokensByUserPublicKey(userPublicKey: string): Promise<Token[]> {
		return await this.storage.getTokensByUserPublicKey(userPublicKey);
	}

	public async getTokensByOwner(owner: string): Promise<Token[]> {
		return await this.storage.getTokensByOwner(owner);
	}
}
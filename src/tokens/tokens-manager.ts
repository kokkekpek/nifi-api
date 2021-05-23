import { Auction, AuctionsManager } from "../auctions/auctions-manager";
import { AuctionStorageEntry } from "../auctions/auctions-storage";
import { mutexLockOrAwait, mutexUnlock } from "../utils/mutex";
import { ITokensStorage, TokenStorageEntry } from "./tokens-storage";

export type Token = {
	readonly id: string;
	readonly address: string;
	readonly userPublicKey: string;
	auction: Auction | null;
	owner: string;
	hash: string;
};

export type AddTokenResult = "success" | "token_with_such_id_already_exists";

export class TokensManager {
	private readonly storage: ITokensStorage;
	private readonly auctionsManager: AuctionsManager;

	constructor(storage: ITokensStorage, auctionsManager: AuctionsManager) {
		this.storage = storage;
		this.auctionsManager = auctionsManager;
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

	private async getTokenByTokenStorageEntry(storageEntry: TokenStorageEntry): Promise<Token> {
		const token: Token = {
			id: storageEntry.id,
			address: storageEntry.address,
			userPublicKey: storageEntry.userPublicKey,
			auction: null,
			owner: storageEntry.owner,
			hash: storageEntry.hash
		};

		if (storageEntry.auctionId !== undefined) {
			const auction = await this.auctionsManager.getAuctionByAuctionId(storageEntry.auctionId);

			if (auction !== undefined) {
				token.auction = auction;
			}
		}

		return token;
	}

	private async getTokensByTokensStorageEntries(storageEntries: TokenStorageEntry[]): Promise<Token[]> {
		const result: Token[] = [];

		for (const entry of storageEntries) {
			result.push(await this.getTokenByTokenStorageEntry(entry));
		}

		return result;
	}

	public async setAuctionByTokenId(tokenId: string, auction: AuctionStorageEntry): Promise<void> {
		await this.storage.setAuctionIdByTokenId(tokenId, auction.auctionId);
		await this.auctionsManager.addAuction(auction);
	}

	public async setOwnerByTokenId(tokenId: string, newOwner: string): Promise<void> {
		await this.storage.setOwnerByTokenId(tokenId, newOwner);
	}

	public async setHashByTokenId(tokenId: string, newHash: string): Promise<void> {
		await this.storage.setHashByTokenId(tokenId, newHash);
	}

	public async getTokenById(tokenId: string): Promise<Token | undefined> {
		const result = await this.storage.getTokenById(tokenId);

		if (!result) return;

		return this.getTokenByTokenStorageEntry(result);
	}

	public async getAllTokens(): Promise<Token[]> {
		const result = await this.storage.getAllTokens();
		return this.getTokensByTokensStorageEntries(result);
	}

	public async getTokensByUserPublicKey(userPublicKey: string): Promise<Token[]> {
		const result = await this.storage.getTokensByUserPublicKey(userPublicKey);
		return this.getTokensByTokensStorageEntries(result);
	}

	public async getTokensByOwner(owner: string): Promise<Token[]> {
		const result = await this.storage.getTokensByOwner(owner);
		return this.getTokensByTokensStorageEntries(result);
	}
}
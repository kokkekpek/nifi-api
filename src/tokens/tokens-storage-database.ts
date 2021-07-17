import { Repository } from "typeorm";
import { ITokensStorage, TokenStorageEntry } from "./tokens-storage";
import { DatabaseToken } from "../database/models/token";

export class TokensStorageDatabase implements ITokensStorage {
	private repository: Repository<DatabaseToken>;

	constructor(repository: Repository<DatabaseToken>) {
		this.repository = repository;
	}

	public async hasTokenWithId(tokenId: string): Promise<boolean> {
		const result = await this.repository.findOne({ tokenId });

		if (result !== undefined) {
			return true;
		} else {
			return false;
		}
	}

	public async addToken(record: TokenStorageEntry): Promise<void> {
		const databaseToken = new DatabaseToken(
			record.id,
			record.address,
			null,
			record.userPublicKey,
			record.owner,
			record.hash,
			record.creator,
			record.type,
			record.maximum
		);

		await this.repository.insert(databaseToken);
	}

	private getTokenByDatabaseToken(databaseToken: DatabaseToken): TokenStorageEntry {
		return {
			type: databaseToken.type as "art1" | "art2",
			id: databaseToken.tokenId,
			address: databaseToken.address,
			userPublicKey: databaseToken.user_public_key,
			owner: databaseToken.owner,
			hash: databaseToken.hash,
			auctionId: databaseToken.auction_id || undefined,
			creator: databaseToken.creator,
			maximum: databaseToken.maximum
		};
	}

	public async getTokenById(tokenId: string): Promise<TokenStorageEntry | undefined> {
		const databaseToken = await this.repository.findOne({ tokenId });

		if (!databaseToken) return;

		return this.getTokenByDatabaseToken(databaseToken);
	}

	public async getTokenByAddress(tokenAddress: string): Promise<TokenStorageEntry | undefined> {
		const databaseToken = await this.repository.findOne({ address: tokenAddress });

		if (!databaseToken) return;

		return this.getTokenByDatabaseToken(databaseToken);
	}

	public async getAllTokens(): Promise<TokenStorageEntry[]> {
		const databaseTokens = await this.repository.find();
		return databaseTokens.map(this.getTokenByDatabaseToken);
	}

	public async getTokensByUserPublicKey(userPublicKey: string): Promise<TokenStorageEntry[]> {
		const databaseTokens = await this.repository.find({ user_public_key: userPublicKey });
		return databaseTokens.map(this.getTokenByDatabaseToken);
	}

	public async getTokensByOwner(owner: string): Promise<TokenStorageEntry[]> {
		const databaseTokens = await this.repository.find({ owner });
		return databaseTokens.map(this.getTokenByDatabaseToken);
	}

	public async setOwnerByTokenId(tokenId: string, newOwner: string): Promise<void> {
		await this.repository.update({ tokenId }, {
			owner: newOwner
		});
	}

	public async setHashByTokenId(tokenId: string, newHash: string): Promise<void> {
		await this.repository.update({ tokenId }, {
			hash: newHash
		});
	}

	public async setAuctionIdByTokenId(tokenId: string, auctionId: string): Promise<void> {
		await this.repository.update({ tokenId }, {
			auction_id: auctionId
		});
	}
}
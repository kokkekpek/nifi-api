import { Repository } from "typeorm";
import { Token } from "./tokens-manager";
import { ITokensStorage } from "./tokens-storage";
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

	public async addToken(record: Token): Promise<void> {
		const databaseToken = new DatabaseToken(
			record.id,
			record.address,
			record.userPublicKey,
			record.owner,
			record.hash
		);

		await this.repository.insert(databaseToken);
	}

	private getTokenByDatabaseToken(databaseToken: DatabaseToken): Token {
		return {
			id: databaseToken.tokenId,
			address: databaseToken.address,
			userPublicKey: databaseToken.user_public_key,
			owner: databaseToken.owner,
			hash: databaseToken.hash
		};
	}

	public async getAllTokens(): Promise<Token[]> {
		const databaseTokens = await this.repository.find();
		return databaseTokens.map(this.getTokenByDatabaseToken);
	}

	public async getTokensByUserPublicKey(userPublicKey: string): Promise<Token[]> {
		const databaseTokens = await this.repository.find({ user_public_key: userPublicKey });
		return databaseTokens.map(this.getTokenByDatabaseToken);
	}
}
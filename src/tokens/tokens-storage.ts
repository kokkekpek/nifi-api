import { Token } from "./tokens-manager";

export interface ITokensStorage {
	hasTokenWithId(tokenId: string): Promise<boolean>;
	addToken(record: Token): Promise<void>;
	getAllTokens(): Promise<Token[]>;
	getTokenById(tokenId: string): Promise<Token | undefined>;
	getTokensByUserPublicKey(userPublicKey: string): Promise<Token[]>;
	getTokensByOwner(owner: string): Promise<Token[]>;
	setOwnerByTokenId(tokenId: string, newOwner: string): Promise<void>;
	setHashByTokenId(tokenId: string, newHash: string): Promise<void>;
}
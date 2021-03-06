export type TokenStorageEntry = {
	readonly type: "art1" | "art2";
	readonly id: string;
	readonly address: string;
	readonly userPublicKey: string;
	readonly auctionId?: string;
	readonly owner: string;
	readonly hash: string;
	readonly creator: string;
	readonly maximum: string | null;
	readonly collection: string;
};

export interface ITokensStorage {
	hasTokenWithId(tokenId: string): Promise<boolean>;
	addToken(record: TokenStorageEntry): Promise<void>;
	getAllTokens(): Promise<TokenStorageEntry[]>;
	getTokenById(tokenId: string, collectionId: string): Promise<TokenStorageEntry | undefined>;
	getTokenByAddress(tokenAddress: string): Promise<TokenStorageEntry | undefined>;
	getTokensByUserPublicKey(userPublicKey: string): Promise<TokenStorageEntry[]>;
	getTokensByOwner(owner: string): Promise<TokenStorageEntry[]>;
	setOwnerByTokenId(tokenId: string, newOwner: string): Promise<void>;
	setHashByTokenId(tokenId: string, newHash: string): Promise<void>;
	setAuctionIdByTokenId(tokenId: string, auctionId: string): Promise<void>;
}
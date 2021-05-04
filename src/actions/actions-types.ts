type BaseAction = {
	readonly time: number;
};

export type ActionCreateToken = BaseAction & {
	readonly action: "create";
	readonly tokenId: string;
	readonly address: string;
	readonly userPublicKey: string;
	readonly owner: string;
	readonly hash: string;
};

export type ActionChangeOwner = BaseAction & {
	readonly action: "changeOwner";
	readonly tokenId: string;
	readonly address: string;
	readonly previousOwner: string;
	readonly owner: string;
	readonly hash: string;
};

export type ActionSetHash = BaseAction & {
	readonly action: "setHash";
	readonly tokenId: string;
	readonly address: string;
	readonly owner: string;
	readonly hash: string;
	readonly previousHash: string;
};

export type Action = ActionCreateToken | ActionChangeOwner | ActionSetHash;
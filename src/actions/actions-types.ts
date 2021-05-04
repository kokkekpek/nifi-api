import { Token } from "../tokens/tokens-manager";

type BaseAction = {
	readonly time: number;
};

export type ActionCreateToken = BaseAction & {
	readonly action: "create";
} & Token;

export type ActionChangeOwner = BaseAction & {
	readonly action: "changeOwner";
	readonly id: string;
	readonly address: string;
	readonly previousOwner: string;
	readonly owner: string;
	readonly hash: string;
};

export type ActionSetHash = BaseAction & {
	readonly action: "setHash";
	readonly id: string;
	readonly address: string;
	readonly owner: string;
	readonly hash: string;
	readonly previousHash: string;
};

export type Action = ActionCreateToken | ActionChangeOwner | ActionSetHash;
export interface ITonMessagesCheckerStorage {
	setLastMessageTimeByAddress(address: string, lastMessageTime: number): Promise<void>;
	getLastMessageTimeByAddress(address: string): Promise<number | undefined>;
}
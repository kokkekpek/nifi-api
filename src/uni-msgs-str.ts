import { Repository } from "typeorm";
import { DatabaseUniStorage } from "./database/models/uni-str";
import { ITonMessagesCheckerStorage } from "./ton/ton-messages-checker-storage";

export class UniversalMessageStorage implements ITonMessagesCheckerStorage {
	private readonly repository: Repository<DatabaseUniStorage>;

	constructor(repository: Repository<DatabaseUniStorage>) {
		this.repository = repository;
	}

	public async getAll(): Promise<string[]> {
		const all = await this.repository.find();
		return all.map(a => a.address);
	}

	public async setLastMessageTimeByAddress(address: string, lastMessageTime: number): Promise<void> {
		let a = await this.repository.findOne({ address });
		if (!a) {
			a = new DatabaseUniStorage(address, lastMessageTime);
			await this.repository.save(a);
		}

		await this.repository.update({ address }, {
			last_message_time: lastMessageTime
		});
	}

	public async getLastMessageTimeByAddress(address: string): Promise<number | undefined> {
		const result = await this.repository.findOne({ address });

		if (!result) return;

		return result.last_message_time;
	}
}
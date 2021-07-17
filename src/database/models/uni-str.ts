import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "uni_str" })
export class DatabaseUniStorage {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 255, type: "varchar" })
	@Index()
	address: string;

	@Column({ type: "int", unsigned: true })
	last_message_time: number;

	constructor(
		address: string,
		lastMessageTime: number
	) {
		this.address = address;
		this.last_message_time = lastMessageTime;
	}
}
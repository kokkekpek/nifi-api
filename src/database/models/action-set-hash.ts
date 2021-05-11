import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "actions_set_hash" })
export class DatabaseActionSetHash{
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 255, type: "varchar" })
	@Index()
	tokenId: string;

	@Column({ length: 255, type: "varchar" })
	address: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	user_public_key: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	owner: string;

	@Column({ length: 255, type: "varchar" })
	previous_hash: string;

	@Column({ length: 255, type: "varchar" })
	hash: string;

	@Column({ length: 255, type: "varchar" })
	time: string;

	constructor(
		tokenId: string,
		address: string,
		userPublicKey: string,
		owner: string,
		previousHash: string,
		hash: string,
		time: string
	) {
		this.tokenId = tokenId;
		this.address = address;
		this.user_public_key = userPublicKey;
		this.owner = owner;
		this.previous_hash = previousHash;
		this.hash = hash;
		this.time = time;
	}
}
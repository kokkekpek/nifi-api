import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "actions_create_token" })
export class DatabaseActionCreateToken {
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
	hash: string;

	@Column({ length: 255, type: "varchar" })
	time: string;

	constructor(
		tokenId: string,
		address: string,
		userPublicKey: string,
		owner: string,
		hash: string,
		time: string
	) {
		this.tokenId = tokenId;
		this.address = address;
		this.user_public_key = userPublicKey;
		this.owner = owner;
		this.hash = hash;
		this.time = time;
	}
}
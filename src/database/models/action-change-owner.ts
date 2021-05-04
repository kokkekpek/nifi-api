import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "actions_change_owner" })
export class DatabaseActionChangeOwner {
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
	previous_owner: string;

	@Column({ length: 255, type: "varchar" })
	owner: string;

	@Column({ length: 255, type: "varchar" })
	hash: string;

	@Column({ length: 255, type: "varchar" })
	time: string;

	constructor(
		tokenId: string,
		address: string,
		previousOwner: string,
		userPublicKey: string,
		owner: string,
		hash: string,
		time: string
	) {
		this.tokenId = tokenId;
		this.address = address;
		this.previous_owner = previousOwner;
		this.user_public_key = userPublicKey;
		this.owner = owner;
		this.hash = hash;
		this.time = time;
	}
}
import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "tokens" })
export class DatabaseToken {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 255, type: "varchar" })
	@Index({ unique: false })
	tokenId: string;

	@Column({ length: 255, type: "varchar", nullable: true, default: null })
	maximum: string | null;

	@Column({ length: 15, type: "varchar", default: "art1" })
	type: string;

	@Column({ length: 255, type: "varchar" })
	address: string;

	@Column({ length: 255, type: "varchar", nullable: true })
	auction_id: string | null;

	@Column({ length: 255, type: "varchar" })
	@Index()
	user_public_key: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	owner: string;

	@Column({ length: 255, type: "varchar" })
	hash: string;

	@Column({ length: 255, type: "varchar" })
	creator: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	collection: string;

	constructor(
		tokenId: string,
		address: string,
		auctionId: string | null,
		userPublicKey: string,
		owner: string,
		hash: string,
		creator: string,
		type: string,
		maximum: string | null,
		collection: string
	) {
		this.tokenId = tokenId;
		this.address = address;
		this.auction_id = auctionId;
		this.user_public_key = userPublicKey;
		this.owner = owner;
		this.hash = hash;
		this.creator = creator;
		this.type = type;
		this.maximum = maximum;
		this.collection = collection;
	}
}
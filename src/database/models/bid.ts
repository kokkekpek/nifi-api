import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "bids" })
export class DatabaseBid {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 255, type: "varchar" })
	bid_id: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	auction_id: string;

	@Column({ length: 255, type: "varchar" })
	creator: string;

	@Column({ length: 255, type: "varchar" })
	token: string;

	@Column({ length: 255, type: "varchar" })
	bider: string;

	@Column({ length: 255, type: "varchar" })
	value: string;

	constructor(
		bidId: string,
		auctionId: string,
		creator: string,
		token: string,
		bider: string,
		value: string
	) {
		this.bid_id = bidId;
		this.auction_id = auctionId;
		this.creator = creator;
		this.token = token;
		this.bider = bider;
		this.value = value;
	}
}
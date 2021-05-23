import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "auctions" })
export class DatabaseAuction {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 255, type: "varchar" })
	@Index({ unique: true })
	auction_id: string;

	@Column({ length: 255, type: "varchar" })
	address: string;

	@Column({ length: 255, type: "varchar" })
	creator: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	token: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	start_bid: string;

	@Column({ length: 255, type: "varchar" })
	step_bid: string;

	@Column({ length: 255, type: "varchar" })
	fee_bid: string;

	@Column({ type: "int", unsigned: true })
	start_time: number;

	@Column({ type: "int", unsigned: true })
	end_time: number;

	@Column({ length: 255, type: "varchar", nullable: true })
	finish_bid: string | null;

	constructor(
		auctionId: string,
		address: string,
		creator: string,
		token: string,
		startBid: string,
		stepBid: string,
		feeBid: string,
		startTime: number,
		endTime: number,
		finishBid: string | null
	) {
		this.address = address;
		this.auction_id = auctionId;
		this.creator = creator;
		this.token = token;
		this.start_bid = startBid;
		this.step_bid = stepBid;
		this.fee_bid = feeBid;
		this.start_time = startTime;
		this.end_time = endTime;
		this.finish_bid = finishBid;
	}
}
import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";
import { OfferStatus } from "../../offers/offers-manager";

@Entity({ name: "offers" })
export class DatabaseOffer {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 255, type: "varchar" })
	@Index({ unique: true })
	offer_id: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	address: string;

	@Column({ length: 255, type: "varchar" })
	creator: string;

	@Column({ length: 255, type: "varchar" })
	token: string;

	@Column({ length: 255, type: "varchar" })
	price: string;

	@Column({ length: 255, type: "varchar" })
	fee: string;

	@Column({ length: 255, type: "varchar" })
	end_time: string;

	@Column({ length: 255, type: "varchar" })
	@Index()
	status: OfferStatus;

	@Column({ type: "int", unsigned: true })
	last_message_time: number;

	constructor(
		offerId: string,
		address: string,
		creator: string,
		token: string,
		price: string,
		fee: string,
		endTime: string,
		status: OfferStatus,
		lastMessageTime: number
	) {
		this.offer_id = offerId;
		this.address = address;
		this.creator = creator;
		this.token = token;
		this.price = price;
		this.fee = fee;
		this.end_time = endTime;
		this.status = status;
		this.last_message_time = lastMessageTime;
	}
}
import "reflect-metadata";

import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index
} from "typeorm";

@Entity({ name: "collections" })
export class DatabaseCollection {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ length: 255, type: "varchar" })
	@Index({ unique: true })
	tokenId: string;

	@Column({ length: 255, type: "varchar", nullable: true })
	maximum: string;

	@Column({ length: 255, type: "varchar" })
	address: string;

	@Column({ length: 255, type: "varchar" })
	name: string;

	@Column({ length: 255, type: "varchar" })
	symbol: string;

	@Column({ length: 255, type: "varchar" })
	supply: string;

	constructor(
		tokenId: string,
		address: string,
		maximum: string,
		symbol: string,
		name: string
	) {
		this.tokenId = tokenId;
		this.address = address;
		this.maximum = maximum;
		this.name = name;
		this.symbol = symbol;
		this.supply = "0";
	}
}
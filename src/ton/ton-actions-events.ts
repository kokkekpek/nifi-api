import { Event, RgResult, timeout } from "rg";
import { IActionsEvents } from "../actions/actions-events";
import { Action } from "../actions/actions-types";
import { TokensManager } from "../tokens/tokens-manager";
import { ITonRootContract, TonContractTokenCreatedEvent } from "./ton-root-contract";
import { ITonTokenContract, ITonTokenContractFactory } from "./ton-token-contract";

type GetFullTokenInfoResult = {
	readonly id: string;
	readonly publicKey: string;
	readonly owner: string;
	readonly hash: string;
};

export class TonActionsEvents implements IActionsEvents {
	public readonly event = new Event<Action>();

	private readonly tokensManager: TokensManager;
	private readonly rootContract: ITonRootContract;
	private readonly tokenContractFactory: ITonTokenContractFactory;
	
	constructor(
		tokensManager: TokensManager,
		rootContract: ITonRootContract,
		tokenContractFactory: ITonTokenContractFactory
	) {
		this.tokensManager = tokensManager;
		this.rootContract = rootContract;
		this.tokenContractFactory = tokenContractFactory;

		this.rootContract.created.on(this.onTokenCreated.bind(this));

		this.tokenContractsLoop();
	}

	private async getFullTokenInfo(tokenContract: ITonTokenContract): Promise<RgResult<GetFullTokenInfoResult>> {
		const addr = tokenContract.getAddress();

		console.log("Выполняю getArtInfo... для контракта", addr);
		const artInfoResult = await tokenContract.getArtInfo();

		if (!artInfoResult.is_success) {
			console.log("Выполнение getArtInfo для контракта", addr, "завершено с ошибкой");
			console.log(artInfoResult.error);

			return artInfoResult;
		}

		console.log("getArtInfo для контракта", addr, "выполнен успешно");

		const floodLimitsPreventiveDelayMs = 500;
		await timeout(floodLimitsPreventiveDelayMs);

		console.log("Выполняю getInfo... для контракта", addr);
		const infoResult = await tokenContract.getInfo();

		if (!infoResult.is_success) {
			console.log("Выполнение getInfo для контракта", addr, "завершено с ошибкой");
			console.log(infoResult.error);

			return infoResult;
		}

		console.log("getInfo для контракта", addr, "выполнен успешно");

		return {
			is_success: true,
			data: {
				id: infoResult.data.id,
				publicKey: infoResult.data.publicKey,
				owner: infoResult.data.owner,
				hash: artInfoResult.data.hash
			}
		};
	}

	private async onTokenCreated(event: TonContractTokenCreatedEvent): Promise<void> {
		console.log("Получено событие создания токена от корневого контракта:\n", event);

		console.log("Получаю подробную информацию о контракте", event.addr);
		const tokenContract = this.tokenContractFactory.getTokenContract(event.addr);
		const fullTokenInfoResult = await this.getFullTokenInfo(tokenContract);
		
		if (!fullTokenInfoResult.is_success) {
			console.log("Не удалось получить подробную информацию о контракте", event.addr, "пропускаю");
			return;
		}

		const info = fullTokenInfoResult.data;
		
		this.event.emit({
			action: "create",
			time: Date.now(),
			address: event.addr,
			tokenId: info.id,
			userPublicKey: info.publicKey,
			owner: info.owner,
			hash: info.hash
		});
	}

	private async tokenContractsLoop(): Promise<void> {
		while (true) {
			const tokens = await this.tokensManager.getAllTokens();

			for (const token of tokens) {
				const floodLimitsPreventiveDelayMs = 1000;
				await timeout(floodLimitsPreventiveDelayMs);

				console.log("Обновляю информацию о контракте", token.address);
				const tokenContract = this.tokenContractFactory.getTokenContract(token.address);
				const fullTokenInfoResult = await this.getFullTokenInfo(tokenContract);

				if (!fullTokenInfoResult.is_success) {
					console.log(
						"Не удалось получить подробную информацию о контракте", token.address, "пока не обновляю"
					);

					continue;
				}

				if (token.hash !== fullTokenInfoResult.data.hash) {
					this.event.emit({
						action: "setHash",
						time: Date.now(),
						tokenId: token.id,
						hash: fullTokenInfoResult.data.hash,
						previousHash: token.hash,
						owner: token.owner,
						address: token.address,
						userPublicKey: token.userPublicKey
					});

					token.hash = fullTokenInfoResult.data.hash;
					this.tokensManager.setHashByTokenId(token.id, fullTokenInfoResult.data.hash);
				}

				if (token.owner !== fullTokenInfoResult.data.owner) {
					this.event.emit({
						action: "changeOwner",
						time: Date.now(),
						tokenId: token.id,
						previousOwner: token.owner,
						owner: fullTokenInfoResult.data.owner,
						address: token.address,
						userPublicKey: token.userPublicKey,
						hash: token.hash
					});

					token.owner = fullTokenInfoResult.data.owner;
					this.tokensManager.setOwnerByTokenId(token.id, fullTokenInfoResult.data.owner);
				}
			}

			const floodLimitsPreventiveDelayMs = 1000;
			await timeout(floodLimitsPreventiveDelayMs);
		}
	}
}
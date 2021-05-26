import { IActionsEvents } from "../actions/actions-events";
import { Action } from "../actions/actions-types";
import { AuctionsManager } from "../auctions/auctions-manager";
import { AuctionStorageEntry } from "../auctions/auctions-storage";
import { OffersManager } from "../offers/offers-manager";
import { Token, TokensManager } from "../tokens/tokens-manager";
import { Event } from "../utils/events";
import { RgResult } from "../utils/result";
import { timeout } from "../utils/timeout";
import { ITonAuctionContractFactory } from "./ton-auctions/ton-auction-contract";
import { ITonOfferContractFactory } from "./ton-offers/ton-offer-contract";
import { ITonRootOffersContract, TonOfferCreatedEvent } from "./ton-offers/ton-root-offers-contract";
import { ITonRootContract, TonContractTokenCreatedEvent } from "./ton-tokens/ton-root-contract";
import { ITonTokenContract, ITonTokenContractFactory } from "./ton-tokens/ton-token-contract";

type GetFullTokenInfoResult = {
	readonly id: string;
	readonly publicKey: string;
	readonly owner: string;
	readonly hash: string;
	readonly manager: string;
};

export type TokenManagerChangedEvent = {
	readonly token: Token;
	readonly newManager: string;
};

export class TonActionsEvents implements IActionsEvents {
	public readonly event = new Event<Action>();

	public readonly managerChanged = new Event<TokenManagerChangedEvent>();

	private readonly tokensManager: TokensManager;
	private readonly auctionsManager: AuctionsManager;
	private readonly offersManager: OffersManager;

	private readonly rootContract: ITonRootContract;
	private readonly tokenContractFactory: ITonTokenContractFactory;
	private readonly auctionContractFactory: ITonAuctionContractFactory;

	private readonly offersRootContract: ITonRootOffersContract;
	private readonly offerContractFactory: ITonOfferContractFactory;
	
	constructor(
		tokensManager: TokensManager,
		auctionsManager: AuctionsManager,
		offersManager: OffersManager,
		rootContract: ITonRootContract,
		tokenContractFactory: ITonTokenContractFactory,
		auctionContractFactory: ITonAuctionContractFactory,
		offersRootContract: ITonRootOffersContract,
		offerContractFactory: ITonOfferContractFactory
	) {
		this.tokensManager = tokensManager;
		this.auctionsManager = auctionsManager;
		this.offersManager = offersManager;
		this.rootContract = rootContract;
		this.tokenContractFactory = tokenContractFactory;
		this.auctionContractFactory = auctionContractFactory;
		this.offersRootContract = offersRootContract;
		this.offerContractFactory = offerContractFactory;

		this.rootContract.created.on(this.onTokenCreated.bind(this));
		this.offersRootContract.created.on(this.onOfferContract.bind(this));

		this.tokenContractsLoop();
	}

	private async getFullTokenInfo(tokenContract: ITonTokenContract): Promise<RgResult<GetFullTokenInfoResult>> {
		const addr = tokenContract.getAddress();

		const artInfoResult = await tokenContract.getArtInfo();

		if (!artInfoResult.is_success) {
			console.log("Executing getArtInfo for a contract", addr, "completed with an error");
			console.log(artInfoResult.error);

			return artInfoResult;
		}

		const floodLimitsPreventiveDelayMs = 50;
		await timeout(floodLimitsPreventiveDelayMs);

		const infoResult = await tokenContract.getInfo();

		if (!infoResult.is_success) {
			console.log("Executing getInfo for a contract", addr, "completed with an error");
			console.log(infoResult.error);

			return infoResult;
		}

		return {
			is_success: true,
			data: {
				id: infoResult.data.id,
				publicKey: infoResult.data.publicKey,
				owner: infoResult.data.owner,
				hash: artInfoResult.data.hash,
				manager: infoResult.data.manager
			}
		};
	}

	private async onOfferContract(event: TonOfferCreatedEvent): Promise<void> {
		console.log("Received offer creation event from root contract:\n", event);

		console.log("Receiving detailed information about the contract", event.addr);
		const offerContract = this.offerContractFactory.getOfferContract(event.addr);
		await offerContract.checkMessages();
	}

	private async onTokenCreated(event: TonContractTokenCreatedEvent): Promise<void> {
		console.log("Received token creation event from root contract:\n", event);

		console.log("Receiving detailed information about the contract", event.addr);
		const tokenContract = this.tokenContractFactory.getTokenContract(event.addr);
		const fullTokenInfoResult = await this.getFullTokenInfo(tokenContract);
		
		if (!fullTokenInfoResult.is_success) {
			console.log("Failed to get detailed information about the contract", event.addr, "skipped");
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

		this.rootContract.updateLastTokenId();
	}

	private async tokenContractsLoop(): Promise<void> {
		while (true) {
			const tokens = await this.tokensManager.getAllTokens();

			for (const token of tokens) {
				const floodLimitsPreventiveDelayMs = 50;
				await timeout(floodLimitsPreventiveDelayMs);

				const tokenContract = this.tokenContractFactory.getTokenContract(token.address);
				const fullTokenInfoResult = await this.getFullTokenInfo(tokenContract);

				if (!fullTokenInfoResult.is_success) {
					console.log(
						"Failed to get detailed information about the contract", token.address, "not updating yet"
					);

					continue;
				}

				if (token.hash !== fullTokenInfoResult.data.hash) {
					console.log("The hash of the contract", token.address, "has changed, updating");

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
					console.log("The owner of the contract", token.address, "has changed, updating");

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

				let auctionErrorHappened = false;

				if (token.auction?.address !== fullTokenInfoResult.data.manager) {
					const auctionContract = this.auctionContractFactory.getAuctionContract(
						fullTokenInfoResult.data.manager
					);

					const auctionDetailsResult = await auctionContract.getInfo();

					if (auctionDetailsResult.is_success) {
						const auction: AuctionStorageEntry = {
							auctionId: auctionDetailsResult.data.id,
							address: fullTokenInfoResult.data.manager,
							creator: auctionDetailsResult.data.creator,
							token: auctionDetailsResult.data.token,
							startBid: auctionDetailsResult.data.startBid,
							stepBid: auctionDetailsResult.data.stepBid,
							feeBid: auctionDetailsResult.data.feeBid,
							startTime: auctionDetailsResult.data.startTime,
							endTime: auctionDetailsResult.data.endTime
						};

						this.tokensManager.setAuctionByTokenId(token.id, auction);
					} else {
						if (
							!auctionDetailsResult.error.message?.includes("Replay protection exception") &&
							!auctionDetailsResult.error.message?.includes("empty response on BOC request") &&
							!auctionDetailsResult.error.message?.includes("exit code: 60") &&
							!auctionDetailsResult.error.message?.includes("BOC Validation fault")
						) {
							console.log(
								"Failed to get detailed information about auction:",
								fullTokenInfoResult.data.manager,
								"for token",
								token.address
							);
	
							console.log(auctionDetailsResult.error);
						}

						auctionErrorHappened = true;
					}
				}
				
				if (token.auction !== null && token.auction.finishBid === null && !auctionErrorHappened) {
					const auctionContract = this.auctionContractFactory.getAuctionContract(
						token.auction.address
					);

					const currentTime = Math.floor(Date.now() / 1000);

					if (token.auction.endTime >= currentTime) {
						console.log("Auction", token.auction.address, "ended, requesting finish...");
						const auctionFinishResult = await auctionContract.finish();

						if (auctionFinishResult.is_success) {
							console.log("Auction", token.auction.address, "successfully finished!");
						} else {
							console.log("Auction", token.auction.address, "finishing has failed!");
							console.log(auctionFinishResult.error);
						}
					}

					auctionContract.bidEvent.on((bidEvent) => {
						if (token.auction === null) return;

						this.auctionsManager.addBid({
							auctionId: token.auction.auctionId,
							bidId: bidEvent.bidId,
							creator: bidEvent.creator,
							token: bidEvent.token,
							bider: bidEvent.bider,
							value: bidEvent.value
						});
					});

					auctionContract.finishEvent.on((finishEvent) => {
						if (token.auction === null) return;

						this.auctionsManager.setAuctionFinishBid({
							auctionId: token.auction.auctionId,
							bidId: finishEvent.bidId,
							creator: finishEvent.creator,
							token: finishEvent.token,
							bider: finishEvent.bider,
							value: finishEvent.value
						});
					});

					await auctionContract.checkMessages();
				}

				const offers = await this.offersManager.getOffersByTokenId(token.id, "pending");

				for (const offer of offers) {
					const offerContract = this.offerContractFactory.getOfferContract(offer.address);

					offerContract.offerAcceptedEvent.on(() => {
						this.offersManager.setOfferStatus(offer.offerId, "accepted");
					});

					offerContract.offerFinishedEvent.on(() => {
						this.offersManager.setOfferStatus(offer.offerId, "expired");
					});

					await offerContract.checkMessages();
				}
			}

			const floodLimitsPreventiveDelayMs = 50;
			await timeout(floodLimitsPreventiveDelayMs);
		}
	}
}
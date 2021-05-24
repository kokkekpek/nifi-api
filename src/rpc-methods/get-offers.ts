import { OffersManager, OfferStatus } from "../offers/offers-manager";
import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";

type Parameters = {
	readonly tokenId: string;
	readonly filter?: OfferStatus;
};

export class GetOffers implements IRpcRequestHandler<Parameters> {
	private readonly offersManager: OffersManager;

	constructor(offersManager: OffersManager) {
		this.offersManager = offersManager;
	}

	public async onRequest(request: RpcRequest<Parameters>): Promise<void> {
		const parameters = request.getParameters();

		let filter: OfferStatus | null = null;

		if (parameters.filter) {
			filter = parameters.filter;
		}

		const result = await this.offersManager.getOffersByTokenId(parameters.tokenId, filter);

		request.success({
			result
		});
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [{
			parameterName: "tokenId",
			parameterType: "string"
		}];
	}
}
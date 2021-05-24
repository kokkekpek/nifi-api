import { AuctionsManager } from "../auctions/auctions-manager";
import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";

type Parameters = {
	readonly tokenId: string;
};

export class GetAuctions implements IRpcRequestHandler<Parameters> {
	private readonly auctionsManager: AuctionsManager;

	constructor(auctionsManager: AuctionsManager) {
		this.auctionsManager = auctionsManager;
	}

	public async onRequest(request: RpcRequest<Parameters>): Promise<void> {
		const parameters = request.getParameters();

		const result = await this.auctionsManager.getAuctionsByTokenId(parameters.tokenId);

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
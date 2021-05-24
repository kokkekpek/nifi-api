import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";
import { StatusCodes } from "../rpc/rpc-server";
import { TokensManager } from "../tokens/tokens-manager";

type Parameters = {
	readonly tokenId: string;
};

export class GetTokenById implements IRpcRequestHandler<Parameters> {
	private readonly tokensManager: TokensManager;

	constructor(tokensManager: TokensManager) {
		this.tokensManager = tokensManager;
	}

	public async onRequest(request: RpcRequest<Parameters>): Promise<void> {
		const parameters = request.getParameters();
		const result = await this.tokensManager.getTokenById(parameters.tokenId);

		if (!result) {
			request.error("Not found", StatusCodes.NotFound);
			return;
		}

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
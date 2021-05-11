import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";
import { TokensManager } from "../tokens/tokens-manager";

type Parameters = {
	readonly owner: string;
};

export class GetTokensByOwner implements IRpcRequestHandler<Parameters> {
	private readonly tokensManager: TokensManager;

	constructor(tokensManager: TokensManager) {
		this.tokensManager = tokensManager;
	}

	public async onRequest(request: RpcRequest<Parameters>): Promise<void> {
		const parameters = request.getParameters();
		const result = await this.tokensManager.getTokensByOwner(parameters.owner);

		request.success({
			result
		});
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [{
			parameterName: "owner",
			parameterType: "string"
		}];
	}
}
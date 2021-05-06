import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";
import { TokensManager } from "../tokens/tokens-manager";

export class GetAllTokens implements IRpcRequestHandler<Record<string, never>> {
	private readonly tokensManager: TokensManager;

	constructor(tokensManager: TokensManager) {
		this.tokensManager = tokensManager;
	}

	public async onRequest(request: RpcRequest<Record<string, never>>): Promise<void> {
		const result = await this.tokensManager.getAllTokens();

		request.success({
			result
		});
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [];
	}
}
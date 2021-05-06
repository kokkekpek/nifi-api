import { ActionsManager } from "../actions/actions-manager";
import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";

export class GetAllActions implements IRpcRequestHandler<Record<string, never>> {
	private readonly actionsManager: ActionsManager;

	constructor(actionsManager: ActionsManager) {
		this.actionsManager = actionsManager;
	}

	public async onRequest(request: RpcRequest<Record<string, never>>): Promise<void> {
		const result = await this.actionsManager.getAllActions();

		request.success({
			result
		});
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [];
	}
}
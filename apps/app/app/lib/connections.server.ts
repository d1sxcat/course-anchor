import { type ProviderName } from './connections'
import { GitHubProvider } from './providers/github.server'
import { GoogleProvider } from './providers/google.server'
import { type AuthProvider } from './providers/provider'
import { type Timings } from './timing.server'

export const providers: Record<ProviderName, AuthProvider> = {
	github: new GitHubProvider(),
	google: new GoogleProvider()
}

export function handleMockAction(providerName: ProviderName, request: Request) {
	return providers[providerName].handleMockAction(request)
}

export function resolveConnectionData(
	providerName: ProviderName,
	providerId: string,
	options?: { timings?: Timings },
) {
	return providers[providerName].resolveConnectionData(providerId, options)
}

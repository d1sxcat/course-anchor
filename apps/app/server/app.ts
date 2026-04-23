import 'react-router'
import { createRequestHandler } from '@react-router/express'
import express from 'express'
import { type ServerBuild, RouterContextProvider } from 'react-router'

declare module 'react-router' {
	interface RouterContextProvider {
		serverBuild: ServerBuild
	}
}

export const app = express()

app.use(
	createRequestHandler({
		mode: process.env.NODE_ENV ?? 'development',
		build: () => import('virtual:react-router/server-build'),
		getLoadContext: async () => {
			const loadContext = {
				serverBuild: await import('virtual:react-router/server-build'),
			}
			let context = new RouterContextProvider();
			Object.assign(context, loadContext);
			return context
		},
	}),
)

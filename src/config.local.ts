import { AppConfig } from "./types/config";

// Debug environment variables

export const config: AppConfig = {
	url: process.env.NEXT_PUBLIC_URL ?? "",
	backend_url: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
	graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "",
	auth0: {
		domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN ?? "",
		clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ?? "",
		redirectUri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI ?? "",
		audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE ?? "",
	},
	gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
	amplitudeApiKey: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? "",
};

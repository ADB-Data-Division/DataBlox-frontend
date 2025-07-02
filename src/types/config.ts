export type AppConfig = {
	/**
	 * The base URL of the Agora application.
	 */
	url: string;
	/**
	 * The base URL of the Backend API.
	 */
	backend_url: string;
	/**
	 * The base URL of the Hasura GraphQL API.
	 */
	graphqlUrl: string;
	/**
	 * The Auth0 configuration.
	 */
	auth0: {
		domain: string;
		clientId: string;
		redirectUri: string;
		audience: string;
	};
	/**
	 * The Google Analytics measurement ID.
	 */
	gaMeasurementId: string;
	/**
	 * The Amplitude API key.
	 */
	amplitudeApiKey: string;
};

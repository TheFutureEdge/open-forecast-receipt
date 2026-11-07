'use strict';

const profiles = require('./deployment-profiles.json');
let federatedClient;
let googleAuth;
const isVercel = () => process.env.VERCEL === '1';

function deploymentProfile(env = process.env) {
  const environment = env.NEXT_PUBLIC_OFL_ENVIRONMENT;
  const profile = environment === 'staging' || environment === 'production' ? profiles[environment] : undefined;
  if (!profile || env.VERCEL_ENV !== 'production'
    || env.VERCEL_PROJECT_ID !== profile.vercelProjectId
    || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== profile.firebaseProjectId
    || env.GCP_PROJECT_NUMBER !== profile.gcpProjectNumber
    || env.GCP_SERVICE_ACCOUNT_EMAIL !== profile.serviceAccountEmail
    || env.GCP_WORKLOAD_IDENTITY_POOL_ID !== 'vercel-library'
    || env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID !== 'vercel-library') {
    throw new Error('Forecast Library Vercel identity does not match an isolated deployment profile');
  }
  if (env.NEXT_PUBLIC_SITE_ORIGIN !== profile.origin) {
    throw new Error('Forecast Library origin does not match its deployment profile');
  }
  return profile;
}

function federationConfig(env = process.env) {
  const profile = deploymentProfile(env);
  return {
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${profile.gcpProjectNumber}/locations/global/workloadIdentityPools/vercel-library/providers/vercel-library`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${profile.serviceAccountEmail}:generateAccessToken`,
    service_account_impersonation: { token_lifetime_seconds: 3600 },
    scopes: ['https://www.googleapis.com/auth/datastore'],
    eagerRefreshThresholdMillis: 300000,
  };
}

function getLibraryGoogleAuth() {
  if (!isVercel()) return undefined;
  // Validate every factory call, and share Google's token cache/refresh across
  // requests. The Vercel assertion is supplied afresh only when refreshing.
  const profile = deploymentProfile();
  if (!googleAuth) {
    const { ExternalAccountClient, GoogleAuth } = require('google-auth-library');
    federatedClient = ExternalAccountClient.fromJSON({
      ...federationConfig(),
      subject_token_supplier: {
        getSubjectToken: async () => {
          const { getVercelOidcToken } = await import('@vercel/oidc');
          return getVercelOidcToken();
        },
      },
    });
    if (!federatedClient) throw new Error('Forecast Library federation could not initialize');
    googleAuth = new GoogleAuth({
      authClient: federatedClient,
      projectId: profile.firebaseProjectId,
      scopes: ['https://www.googleapis.com/auth/datastore'],
    });
  }
  return googleAuth;
}

module.exports = { isVercel, deploymentProfile, federationConfig, getLibraryGoogleAuth };

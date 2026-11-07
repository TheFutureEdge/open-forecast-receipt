import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import profiles from '../../deployment-profiles.json' with { type: 'json' };
const require = createRequire(import.meta.url);
const { deploymentProfile, federationConfig, getLibraryGoogleAuth } = require('../../gcp-auth.cjs');
function environment(name) {
  const p = profiles[name];
  return {
    VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: p.vercelProjectId,
    NEXT_PUBLIC_OFL_ENVIRONMENT: name, NEXT_PUBLIC_FIREBASE_PROJECT_ID: p.firebaseProjectId,
    NEXT_PUBLIC_SITE_ORIGIN: p.origin, GCP_PROJECT_NUMBER: p.gcpProjectNumber,
    GCP_SERVICE_ACCOUNT_EMAIL: p.serviceAccountEmail,
    GCP_WORKLOAD_IDENTITY_POOL_ID: 'vercel-library', GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'vercel-library',
  };
}
afterEach(() => vi.unstubAllEnvs());
describe('isolated keyless deployment identities', () => {
  it.each(['staging', 'production'])('accepts only the exact %s project and read scope', name => {
    const env = environment(name);
    expect(deploymentProfile(env)).toEqual(profiles[name]);
    const config = federationConfig(env);
    expect(config.audience).toContain(`/projects/${profiles[name].gcpProjectNumber}/`);
    expect(config.service_account_impersonation_url).toContain(profiles[name].serviceAccountEmail);
    expect(config.scopes).toEqual(['https://www.googleapis.com/auth/datastore']);
  });
  it.each(['VERCEL_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'GCP_PROJECT_NUMBER', 'GCP_SERVICE_ACCOUNT_EMAIL', 'NEXT_PUBLIC_SITE_ORIGIN'])(
    'rejects a cross-environment %s', key => {
      expect(() => deploymentProfile({ ...environment('production'), [key]: environment('staging')[key] })).toThrow('profile');
    },
  );
  it.each(['preview', 'development'])('denies %s production-data credentials', VERCEL_ENV => {
    expect(() => deploymentProfile({ ...environment('production'), VERCEL_ENV })).toThrow('profile');
  });
  it('rejects unknown and prototype environment names', () => {
    for (const name of ['__proto__', 'constructor', 'dev', '']) expect(() => deploymentProfile({ NEXT_PUBLIC_OFL_ENVIRONMENT: name, VERCEL_ENV: 'production' })).toThrow('profile');
  });
  it('preserves ADC outside Vercel without creating a federated client', () => {
    vi.stubEnv('VERCEL', '');
    expect(getLibraryGoogleAuth()).toBeUndefined();
  });
  it('reuses one SDK credential and initializes without exchanging a token', () => {
    for (const [key, value] of Object.entries(environment('staging'))) vi.stubEnv(key, value);
    const first = getLibraryGoogleAuth();
    expect(first).toBe(getLibraryGoogleAuth());
    expect(first.cachedCredential).toBeTruthy();
  });
});

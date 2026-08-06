export function StandardsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Standards &amp; About
      </h1>

      {/* What is an OFR */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">What is an Open Forecast Receipt?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          An Open Forecast Receipt (OFR) is a structured, provenance-aware forecast record defined by the
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> ofr-core-v0.1.0</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> ofr-market-v0.1.0</code>, and
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> ofr-ai-v0.1.0</code> profiles.
          It binds a market prediction (anchor price, cadence, step returns) to cryptographic integrity verification
          and, when published, to an Ethereum Attestation Service (EAS) record on Base Sepolia.
          The goal is transparent, verifiable, and portable forecast data while making the limits of each proof explicit.
        </p>
      </section>

      {/* OFR Schema */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">OFR Schema v0.1.0</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
          Every OFR follows the JSON Schema at <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">https://ipulseai.com/schemas/open-forecast-receipt/v0.1.0/schema.json</code>.
          The schema defines five required top-level sections: <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">$schema</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">specVersion</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">profiles</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">receiptPayload</code>, and
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">proofEnvelope</code>.
          The immutable payload contains receipt identity, issuer, forecast, temporal and generation provenance,
          evidence, and disclosure. The proof envelope contains the payload digest and independently mutable proofs.
          The schema uses <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">additionalProperties: false</code> to reject unknown fields.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Stable identity when tickers change</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          A ticker is a point-in-time market identifier, not the permanent identity of a company or instrument.
          Each receipt therefore binds an issuer-stable <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">subject.id</code>
          and snapshots the ticker, MIC, ISIN, and other available identifiers that applied to that forecast.
          Public asset URLs use a stable navigation slug with optional aliases. If a company changes its ticker,
          the current subject registry and URL aliases may be updated, while historical receipts, identifiers,
          digests, and attestations remain untouched.
        </p>
      </section>

      {/* Digest Computation */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Digest Computation (RFC 8785 + SHA-256)</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
          <p>The sealed payload digest is computed as follows:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Select exactly <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">receiptPayload</code>. The proof envelope is never part of its own digest.</li>
            <li>Canonicalize the payload using the RFC 8785 JSON Canonicalization Scheme (<code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">json-canonicalize</code> v2).</li>
            <li>Compute the SHA-256 hash of the canonical UTF-8 bytes via the Web Crypto API.</li>
            <li>Compare the hex-encoded digest to <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">proofEnvelope.payloadDigestSha256</code>.</li>
          </ol>
        </div>
      </section>

      {/* EAS Attestation */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">EAS Attestation (Base Sepolia)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          When published, an OFR's key fields (17 fields covering market identity, prediction parameters, and the
          receipt digest) are encoded as an EAS attestation on Base Sepolia (chain ID 84532) at contract
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> 0x4200...0021</code>.
          The EAS schema uses <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">bytes32 receiptDigest</code> and is non-revocable.
          Currently, no attestations have been issued yet — all chain statuses show "Not Issued" honestly.
        </p>
      </section>

      {/* Blockchain Status */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Blockchain Status</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The blockchain status axis shows whether the receipt's digest has been attested onchain.
          In this phase, all receipts show <strong>not_issued</strong> because no real attestation UIDs exist.
          When real UIDs are available, the app reads the Base Sepolia EAS contract, ABI-decodes all 17 fields, and compares the onchain digest against the locally computed
          digest and reports one of: verified, revoked, pending, or unavailable.
        </p>
      </section>

      {/* Canonical Fixture Info */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Canonical Fixture: PepsiCo Batch 6 / Ray Dalio</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The PepsiCo/Ray Dalio fixture is the canonical data source for this explorer. It represents Batch 6,
          run 6, revision 2 of the iPulse AI forecast pipeline for PepsiCo, Inc. (PEP:XNAS). The fixture is a
          <strong> retrospective</strong> receipt — created after the original forecast was published — and carries
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> issuanceMode: "retrospective"</code>.
          The forecast was generated by the <strong>Gemini 3.1 Pro</strong> AI model (Google DeepMind), using the
          <strong>Ray Dalio / The Strategist / RESEARCHER</strong> advisor persona. The 20-step prediction starts with
          -400 bps and -300 bps step returns. The terminal reconstructed price is approximately <strong>$180.61</strong>
          (anchor $144.22 × compound 25.23% return). Its researcher response was generated at
          <strong> 2026-07-05 14:48:47 UTC</strong>. The canonical payload digest is
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> 85e82d4748...60ea4a5</code>.
        </p>
      </section>

      {/* Data Sources */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Data Sources</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          All forecast data shown is loaded from local JSON fixture files. No real-time market-data calls and no
          blockchain RPC requests are made on initial load. A Base Sepolia RPC read occurs only when a fixture has
          a non-null attestation UID. The PepsiCo/Ray Dalio fixture is a reviewed
          canonical example; all 60 Phase 1 fixtures are static Batch 6 snapshots.
        </p>
      </section>

      {/* Limitations */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-400 mb-3">Limitations</h2>
        <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <li><strong>The receipt proves integrity and publication timing, not correctness.</strong> A valid digest confirms the document has not been tampered with; it does not validate the forecast's accuracy.</li>
          <li>No attestations have been issued yet — all chain statuses show "Not Issued."</li>
          <li>All 60 Phase 1 advisor receipts are retrospective examples and have not yet been attested.</li>
          <li><strong>Named forecasters are software advisor personas.</strong> The receipt does not claim endorsement by or affiliation with the named person.</li>
          <li>This is an example retrospective receipt. The blockchain timestamp (when issued) must not be presented as the forecast creation time.</li>
          <li>The Batch 6 context snapshot is a reconstructed backfill and is labeled accordingly.</li>
          <li>Researcher web search was configured, but result-level grounding was not retained; actual execution and retrieved evidence remain unknown.</li>
          <li>No real-time data — all fixtures are static snapshots.</li>
          <li>No wallet, auth, or backend — entirely client-side.</li>
          <li>This is experimental educational content. Not investment advice.</li>
        </ul>
      </section>

      {/* Event */}
      <section className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Built for the <strong>AI Factory — Native.builder Hackathon</strong>.
        </p>
      </section>
    </div>
  );
}

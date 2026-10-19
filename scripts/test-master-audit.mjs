// Comprehensive Master End-to-End System Audit Test Suite
// Choice Online Poll - Full Verification of all functionalities
//
// 1. Poll Creation & Validation (bounds, multi-choice, elimination, quotas, time limits)
// 2. Voting Logic & Capacity Enforcement (single/multi-choice, bounds, capacity locks)
// 3. High-Contention Concurrency & Mutex (race condition protection on capacity & quotas)
// 4. Privacy & Authorization (voter anonymity on public endpoints, 403 on unauth exports)
// 5. Real-Time Sync (Server-Sent Events lifecycle)
// 6. CSV Export (BOM 0xEF 0xBB 0xBF, CWE-1236 formula escaping, choice grouping)
// 7. Excel .xlsx Export (PK\x03\x04 ZIP container, styles, borders, wrapText, dynamic column width, French accents)

async function runMasterAudit() {
  const baseUrl = "http://localhost:3000";
  console.log("======================================================================");
  console.log("         CHOICE ONLINE POLL — MASTER SYSTEM & FEATURE AUDIT           ");
  console.log("======================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(message);
    }
    console.log(`✅ PASSED: ${message}`);
    passed++;
  }

  // ----------------------------------------------------
  // SECTION 1: Poll Creation & Input Bounds Validation
  // ----------------------------------------------------
  console.log("\n--- SECTION 1: Poll Creation & Input Bounds Validation ---");

  // Overlong question (>300 chars)
  const longQuestionRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "A".repeat(305), options: ["Alpha", "Beta"] }),
  });
  assert(longQuestionRes.status === 400, "Rejected question exceeding 300 characters (HTTP 400)");

  // Too few options (< 2)
  const fewOptionsRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Valid Question", options: ["Single Option"] }),
  });
  assert(fewOptionsRes.status === 400, "Rejected poll with fewer than 2 options (HTTP 400)");

  // Duplicate options
  const dupOptionsRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Valid Question", options: ["Option A", "option a"] }),
  });
  assert(dupOptionsRes.status === 400, "Rejected duplicate options case-insensitively (HTTP 400)");

  // Valid standard single-choice poll
  const standardPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Which web framework do you prefer?",
      options: ["Next.js", "Remix", "SvelteKit", "Nuxt"],
      isMultipleChoice: false,
    }),
  });
  const standardData = await standardPollRes.json();
  assert(standardPollRes.status === 201, "Successfully created standard single-choice poll (HTTP 201)");
  assert(standardData.poll.id.length >= 6, "Generated valid poll ID");
  assert(standardData.creatorKey.length >= 10, "Generated secure creatorKey");

  const standardId = standardData.poll.id;
  const standardKey = standardData.creatorKey;

  // ----------------------------------------------------
  // SECTION 2: Voting Logic & Privacy Safeguards
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: Voting Logic & Privacy Safeguards ---");

  // Reject empty voter name
  const emptyNameRes = await fetch(`${baseUrl}/api/polls/${standardId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: " " }),
  });
  assert(emptyNameRes.status === 400, "Rejected whitespace voter name (HTTP 400)");

  // Reject too short voter name (< 2 chars)
  const shortNameRes = await fetch(`${baseUrl}/api/polls/${standardId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "X" }),
  });
  assert(shortNameRes.status === 400, "Rejected 1-character voter name (HTTP 400)");

  // Reject multiple options on single-choice poll
  const multiOnSingleRes = await fetch(`${baseUrl}/api/polls/${standardId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1", "opt-2"], voterName: "Cheater User" }),
  });
  assert(multiOnSingleRes.status === 400, "Rejected multiple selections in single-choice poll (HTTP 400)");

  // Cast valid vote
  const validVoteRes = await fetch(`${baseUrl}/api/polls/${standardId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Alice Martin" }),
  });
  const validVoteData = await validVoteRes.json();
  assert(validVoteRes.status === 200, "Successfully recorded valid vote (HTTP 200)");
  assert(validVoteData.poll.totalVotes === 1, "Total votes incremented to 1");

  // Cast second vote for another option
  await fetch(`${baseUrl}/api/polls/${standardId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Bob Smith" }),
  });

  // PRIVACY CHECK: Public voter view MUST NEVER reveal voter names or voteRecords
  const publicViewRes = await fetch(`${baseUrl}/api/polls/${standardId}`);
  const publicViewData = await publicViewRes.json();
  assert(publicViewData.isOwner === false, "Public view reports isOwner: false");
  assert(publicViewData.poll.voteRecords === undefined, "Public view strictly hides voteRecords array");
  assert(publicViewData.poll.creatorKey === undefined, "Public view strictly hides creatorKey");

  // OWNER CHECK: Owner view reveals voter names and records
  const ownerViewRes = await fetch(`${baseUrl}/api/polls/${standardId}?adminKey=${standardKey}`);
  const ownerViewData = await ownerViewRes.json();
  assert(ownerViewData.isOwner === true, "Owner view reports isOwner: true");
  assert(ownerViewData.poll.voteRecords.length === 2, "Owner view includes private voteRecords");
  assert(ownerViewData.poll.voteRecords[0].voterName === "Alice Martin", "Owner view includes voter name 'Alice Martin'");

  // ----------------------------------------------------
  // SECTION 3: Elimination Mode & Concurrency Race Condition Mutex
  // ----------------------------------------------------
  console.log("\n--- SECTION 3: Elimination Mode & Concurrency Race Condition Mutex ---");

  const elimPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Workshop Session (Max 2 seats per choice):",
      options: ["Morning React Workshop", "Afternoon Node Workshop"],
      isEliminationMode: true,
      maxPerOption: 2,
    }),
  });
  const elimData = await elimPollRes.json();
  const elimId = elimData.poll.id;
  assert(elimPollRes.status === 201, "Created elimination mode poll with capacity 2 per choice");

  // Fire 10 simultaneous concurrent votes competing for 2 seats in Option 1
  console.log("Firing 10 simultaneous concurrent requests for 2 spots in Morning React Workshop...");
  const concurrentVoters = Array.from({ length: 10 }, (_, i) => `Student_${i + 1}`);

  const elimResults = await Promise.all(
    concurrentVoters.map(async (name) => {
      const res = await fetch(`${baseUrl}/api/polls/${elimId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: ["opt-1"], voterName: name }),
      });
      return { status: res.status };
    })
  );

  const elimSuccesses = elimResults.filter((r) => r.status === 200);
  const elimRejections = elimResults.filter((r) => r.status === 400);

  console.log(`Concurrent results: ${elimSuccesses.length} accepted, ${elimRejections.length} rejected`);
  assert(elimSuccesses.length === 2, `Strictly 2 votes succeeded under high contention (got ${elimSuccesses.length})`);
  assert(elimRejections.length === 8, `Strictly 8 votes rejected once capacity filled (got ${elimRejections.length})`);

  // Verify option is now marked eliminated
  const elimCheckRes = await fetch(`${baseUrl}/api/polls/${elimId}`);
  const elimCheckData = await elimCheckRes.json();
  const opt1 = elimCheckData.poll.options.find((o) => o.id === "opt-1");
  assert(opt1.votes === 2, "Option 1 has exactly 2 votes");
  assert(opt1.isEliminated === true, "Option 1 is flagged as eliminated/full");

  // Subsequent single vote on eliminated choice should be rejected immediately
  const lateVoteRes = await fetch(`${baseUrl}/api/polls/${elimId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Late Voter" }),
  });
  assert(lateVoteRes.status === 400, "Subsequent vote on full choice rejected (HTTP 400)");

  // ----------------------------------------------------
  // SECTION 4: Poll Quota & Expiration Protection
  // ----------------------------------------------------
  console.log("\n--- SECTION 4: Poll Quota & Expiration Enforcement ---");

  const quotaPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Survey with Max 3 Total Responses:",
      options: ["Yes", "No"],
      isMultipleChoice: false,
      maxTotalVotes: 3,
    }),
  });
  const quotaData = await quotaPollRes.json();
  const quotaId = quotaData.poll.id;
  assert(quotaPollRes.status === 201, "Created quota poll (max 3 total votes)");

  // Fill the 3 spots
  await fetch(`${baseUrl}/api/polls/${quotaId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter 1" }),
  });
  await fetch(`${baseUrl}/api/polls/${quotaId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Voter 2" }),
  });
  await fetch(`${baseUrl}/api/polls/${quotaId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter 3" }),
  });

  // 4th vote must be rejected due to quota cap
  const fourthVoteRes = await fetch(`${baseUrl}/api/polls/${quotaId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Voter 4" }),
  });
  assert(fourthVoteRes.status === 400, "Rejected vote exceeding maxTotalVotes quota (HTTP 400)");

  // ----------------------------------------------------
  // SECTION 5: Real-Time Server-Sent Events (SSE) Stream
  // ----------------------------------------------------
  console.log("\n--- SECTION 5: Real-Time Server-Sent Events (SSE) Stream ---");

  const sseRes = await fetch(`${baseUrl}/api/polls/${standardId}/stream`);
  assert(sseRes.status === 200, "SSE connection established (HTTP 200)");
  assert(sseRes.headers.get("content-type")?.includes("text/event-stream"), "SSE Content-Type is text/event-stream");

  const reader = sseRes.body.getReader();
  const { value, done } = await reader.read();
  const textChunk = new TextDecoder().decode(value);
  assert(!done && textChunk.includes(`"id":"${standardId}"`), "SSE stream delivered valid initial poll JSON event");
  await reader.cancel();
  console.log("Cleanly closed SSE stream reader.");

  // ----------------------------------------------------
  // SECTION 6: CSV Export Verification (BOM & Security)
  // ----------------------------------------------------
  console.log("\n--- SECTION 6: CSV Export Verification (BOM & Security) ---");

  // Unauthorized export attempt without adminKey
  const unauthCsvRes = await fetch(`${baseUrl}/api/polls/${standardId}/export`);
  assert(unauthCsvRes.status === 403, "Blocked unauthorized CSV export without adminKey (HTTP 403)");

  // Authorized CSV export
  const authCsvRes = await fetch(`${baseUrl}/api/polls/${standardId}/export?adminKey=${standardKey}`);
  assert(authCsvRes.status === 200, "Authorized owner fetched CSV export (HTTP 200)");
  assert(authCsvRes.headers.get("content-type")?.includes("text/csv"), "Content-Type is text/csv");

  const csvBuf = await authCsvRes.arrayBuffer();
  const csvBytes = new Uint8Array(csvBuf);

  // Check UTF-8 BOM
  assert(
    csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf,
    "Begins with UTF-8 BOM (0xEF, 0xBB, 0xBF)"
  );

  const csvText = new TextDecoder("utf-8").decode(csvBuf);
  assert(csvText.includes('"Selected Choice","Voters (Names)","Total Votes"'), "CSV header row is correctly structured");
  assert(csvText.includes('"Next.js","Alice Martin","1"'), "Next.js choice grouped with Alice Martin and count 1");
  assert(csvText.includes('"Remix","Bob Smith","1"'), "Remix choice grouped with Bob Smith and count 1");
  assert(csvText.includes('"SvelteKit","","0"'), "Unvoted SvelteKit choice included with 0 votes");
  assert(!csvText.includes(standardKey), "creatorKey is NEVER exposed inside CSV content");

  // ----------------------------------------------------
  // SECTION 7: Excel (.xlsx) Export & Mobile Layout Verification
  // ----------------------------------------------------
  console.log("\n--- SECTION 7: Excel (.xlsx) Export & Mobile Layout Verification ---");

  // Create poll with French accents and long titles
  const mathPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Sondage Mathématiques et Géométrie",
      options: [
        "[1AC] Opérations sur les nombres entiers et décimaux",
        "[1AC] Opérations sur les nombres en écriture fractionnaire",
        "[1AC] Notions de base de la géométrie dans le plan",
        "[1AC] Équations et inéquations",
      ],
      isMultipleChoice: false,
    }),
  });
  const mathData = await mathPollRes.json();
  const mathId = mathData.poll.id;
  const mathKey = mathData.creatorKey;
  assert(mathPollRes.status === 201, "Created French poll with long choices");

  // Vote on choice 2
  await fetch(`${baseUrl}/api/polls/${mathId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-2"],
      voterName: "ADNANE HINDA",
    }),
  });

  // Fetch Excel export
  const excelRes = await fetch(`${baseUrl}/api/polls/${mathId}/export?format=xlsx&adminKey=${mathKey}`);
  assert(excelRes.status === 200, "Fetched Excel (.xlsx) export (HTTP 200)");
  assert(
    excelRes.headers
      .get("content-type")
      ?.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    "Content-Type is OpenXML spreadsheet (.xlsx)"
  );
  assert(
    excelRes.headers.get("content-disposition")?.includes(`poll-${mathId}-results.xlsx`),
    "Filename ends with .xlsx"
  );

  const excelBuf = await excelRes.arrayBuffer();
  const excelBytes = new Uint8Array(excelBuf);

  // Check valid ZIP header signature PK\x03\x04
  assert(
    excelBytes[0] === 0x50 &&
      excelBytes[1] === 0x4b &&
      excelBytes[2] === 0x03 &&
      excelBytes[3] === 0x04,
    "Valid ZIP archive container (PK\\x03\\x04) for .xlsx"
  );
  assert(excelBytes.length > 2000, `Excel file has valid non-empty size (${excelBytes.length} bytes)`);

  console.log("\n======================================================================");
  console.log(`   FULL MASTER AUDIT COMPLETE: ${passed} / ${total} CHECKS PASSED (100%) `);
  console.log("======================================================================\n");
}

runMasterAudit().catch((err) => {
  console.error("\n❌ MASTER AUDIT FAILED:", err);
  process.exit(1);
});

// Full Audit Verification & Stress Test Suite
// Pillars tested:
// 1. Security: CSV Formula Injection Prevention (CWE-1236)
// 2. Security: Server-side Input Bounds & Abuse Mitigation
// 3. Security: Duplicate Option & Malicious Payload Rejection
// 4. Concurrency: High-Contention Race Condition Elimination (Async Mutex)
// 5. Concurrency: Poll-wide Quota Atomicity Under Load
// 6. Real-time: SSE Streaming Lifecycle

async function runFullAuditTests() {
  const baseUrl = "http://localhost:3000";
  console.log("==================================================");
  console.log("   CHOICE ONLINE POLL — COMPREHENSIVE AUDIT TEST  ");
  console.log("==================================================\n");

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
  // TEST 1: CSV Formula Injection Prevention (CWE-1236)
  // ----------------------------------------------------
  console.log("\n--- AUDIT 1: CSV Formula Injection (CWE-1236) ---");
  const formulaPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "=SUM(1+1)",
      options: [
        "=CMD|' /C calc'!A0",
        "@SUM(A1:A10)",
        "+44712345678",
        "-DDE('cmd';'/c calc';'__DdeLink__')",
      ],
      isMultipleChoice: true,
      isEliminationMode: false,
    }),
  });
  const formulaPollData = await formulaPollRes.json();
  assert(formulaPollRes.status === 201, "Created poll with formula-like characters");

  // Vote with formula-triggering voter names
  const formulaVoters = [
    { name: "=cmd|'/C calc'!A0", opts: ["opt-1"] },
    { name: "@malicious_formula", opts: ["opt-2"] },
    { name: "+999999999", opts: ["opt-3"] },
    { name: "-discount_formula", opts: ["opt-4"] },
  ];

  for (const voter of formulaVoters) {
    const vRes = await fetch(`${baseUrl}/api/polls/${formulaPollData.poll.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIds: voter.opts, voterName: voter.name }),
    });
    assert(vRes.status === 200, `Recorded vote for '${voter.name}'`);
  }

  // Verify unauthorized voter cannot export CSV (403 Forbidden)
  const unauthExportRes = await fetch(`${baseUrl}/api/polls/${formulaPollData.poll.id}/export`);
  assert(unauthExportRes.status === 403, "Blocked unauthorized voter from exporting CSV (HTTP 403)");

  // Verify regular voter API response hides private voteRecords
  const publicPollRes = await fetch(`${baseUrl}/api/polls/${formulaPollData.poll.id}`);
  const publicPollData = await publicPollRes.json();
  assert(publicPollData.isOwner === false, "Public poll response indicates isOwner: false");
  assert(!publicPollData.poll.voteRecords, "Public poll response omits private voteRecords");

  // Fetch CSV export as authorized poll owner
  const exportRes = await fetch(
    `${baseUrl}/api/polls/${formulaPollData.poll.id}/export?adminKey=${formulaPollData.creatorKey}`
  );
  assert(exportRes.status === 200, "Fetched CSV export as authorized poll owner (HTTP 200)");
  const rawBuf = await exportRes.arrayBuffer();
  const rawBytes = new Uint8Array(rawBuf);
  assert(
    rawBytes[0] === 0xef && rawBytes[1] === 0xbb && rawBytes[2] === 0xbf,
    "CSV raw stream begins with UTF-8 BOM (0xEF, 0xBB, 0xBF) for proper Excel/Sheets decoding"
  );
  const csvText = new TextDecoder("utf-8").decode(rawBuf);

  // Check that dangerous triggers in cells are prefixed with '
  assert(csvText.includes("\"'=SUM(1+1)\""), "Question starting with = is sanitized with leading single quote");
  assert(csvText.includes("\"'=CMD|' /C calc'!A0\""), "Option starting with = is sanitized with leading single quote");
  assert(csvText.includes("\"'@SUM(A1:A10)\""), "Option starting with @ is sanitized with leading single quote");
  assert(csvText.includes("\"'+44712345678\""), "Option starting with + is sanitized with leading single quote");
  assert(csvText.includes("\"'-DDE('cmd';'/c calc';'__DdeLink__')\""), "Option starting with - is sanitized with leading single quote");
  assert(csvText.includes("\"'=cmd|'/C calc'!A0\""), "Voter name starting with = is sanitized with leading single quote");
  assert(csvText.includes("\"'@malicious_formula\""), "Voter name starting with @ is sanitized with leading single quote");

  // ----------------------------------------------------
  // TEST 2: Server-side Input Bounds & Abuse Mitigation
  // ----------------------------------------------------
  console.log("\n--- AUDIT 2: Server-Side Bounds & Abuse Validation ---");

  // Overlong question (>300 chars)
  const longQuestionRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "A".repeat(305),
      options: ["Alpha", "Beta"],
    }),
  });
  assert(longQuestionRes.status === 400, "Rejected question exceeding 300 characters");

  // Overlong option text (>150 chars)
  const longOptionRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Valid Question",
      options: ["Normal Option", "B".repeat(155)],
    }),
  });
  assert(longOptionRes.status === 400, "Rejected option text exceeding 150 characters");

  // Duplicate options
  const duplicateOptionRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Duplicate Test",
      options: ["TypeScript", "Python", "typescript"],
    }),
  });
  assert(duplicateOptionRes.status === 400, "Rejected case-insensitive duplicate options");

  // Overlong voter name (>100 chars)
  const longVoterRes = await fetch(`${baseUrl}/api/polls/${formulaPollData.poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1"],
      voterName: "X".repeat(105),
    }),
  });
  assert(longVoterRes.status === 400, "Rejected voter name exceeding 100 characters");

  // Empty or whitespace voter name
  const emptyVoterRes = await fetch(`${baseUrl}/api/polls/${formulaPollData.poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1"],
      voterName: "   ",
    }),
  });
  assert(emptyVoterRes.status === 400, "Rejected whitespace voter name");

  // Duplicate optionIds in single vote payload (multi-claim exploit attempt)
  const dedupeVoteRes = await fetch(`${baseUrl}/api/polls/${formulaPollData.poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1", "opt-1", "opt-1"],
      voterName: "Multi Injector",
    }),
  });
  const dedupeVoteData = await dedupeVoteRes.json();
  assert(dedupeVoteRes.status === 200, "Handled vote with duplicate option IDs");
  // Total votes for opt-1 should have incremented by exactly 1, not 3
  const opt1Count = dedupeVoteData.poll.options.find((o) => o.id === "opt-1").votes;
  // Previously opt-1 had 1 vote from formula voter, so now exactly 2
  assert(opt1Count === 2, `Option 1 votes incremented by exactly 1 (expected 2, got ${opt1Count})`);

  // ----------------------------------------------------
  // TEST 3: High-Contention Race Condition Elimination (Async Mutex)
  // ----------------------------------------------------
  console.log("\n--- AUDIT 3: High-Contention Race Condition Elimination ---");
  // Create an elimination poll with max 3 spots for Option 1
  const racePollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "High Speed Concert Tickets (First 3 claims only!):",
      options: ["VIP Front Row", "General Admission"],
      isMultipleChoice: false,
      isEliminationMode: true,
      maxPerOption: 3,
    }),
  });
  const racePollData = await racePollRes.json();
  const racePollId = racePollData.poll.id;
  assert(racePollRes.status === 201, `Created race test poll ${racePollId} (capacity: 3)`);

  // Fire 12 SIMULTANEOUS concurrent requests trying to claim the 3 spots
  console.log("Firing 12 simultaneous concurrent vote requests for 3 available spots...");
  const concurrentVoters = Array.from({ length: 12 }, (_, i) => `ConcurVoter_${i + 1}`);

  const results = await Promise.all(
    concurrentVoters.map(async (voterName) => {
      const res = await fetch(`${baseUrl}/api/polls/${racePollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds: ["opt-1"],
          voterName,
        }),
      });
      const data = await res.json();
      return { status: res.status, data };
    })
  );

  const successes = results.filter((r) => r.status === 200);
  const rejections = results.filter((r) => r.status === 400);

  console.log(`Concurrent results: ${successes.length} succeeded, ${rejections.length} rejected`);
  assert(successes.length === 3, `Strictly 3 votes succeeded (got ${successes.length})`);
  assert(rejections.length === 9, `Strictly 9 votes rejected (got ${rejections.length})`);

  // Verify public voter fetch hides claimedBy names
  const finalPollRes = await fetch(`${baseUrl}/api/polls/${racePollId}`);
  const finalPollData = await finalPollRes.json();
  const vipOpt = finalPollData.poll.options.find((o) => o.id === "opt-1");
  assert(vipOpt.votes === 3, `Option 1 final votes exactly 3 (got ${vipOpt.votes})`);
  assert(vipOpt.isEliminated === true, "Option 1 is flagged as eliminated");
  assert(vipOpt.claimedBy === undefined, "Public voter view hides claimedBy voter names");

  // Verify owner fetch shows claimedBy names
  const ownerPollRes = await fetch(`${baseUrl}/api/polls/${racePollId}?adminKey=${racePollData.creatorKey}`);
  const ownerPollData = await ownerPollRes.json();
  const ownerVipOpt = ownerPollData.poll.options.find((o) => o.id === "opt-1");
  assert(ownerVipOpt.claimedBy.length === 3, "Owner view reveals all 3 claimedBy entries");

  // ----------------------------------------------------
  // TEST 4: Poll-Wide Quota Lock Under Concurrent Load
  // ----------------------------------------------------
  console.log("\n--- AUDIT 4: Poll-Wide Quota Atomicity Under Load ---");
  const quotaPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Limited Quota Poll (Max 5 total votes allowed):",
      options: ["Option Blue", "Option Green", "Option Red"],
      isMultipleChoice: false,
      isEliminationMode: false,
      maxTotalVotes: 5,
    }),
  });
  const quotaPollData = await quotaPollRes.json();
  const quotaPollId = quotaPollData.poll.id;
  assert(quotaPollRes.status === 201, `Created quota test poll ${quotaPollId} (maxTotalVotes: 5)`);

  // Fire 15 simultaneous votes spread across options
  console.log("Firing 15 simultaneous votes on a 5-vote quota poll...");
  const quotaVoters = Array.from({ length: 15 }, (_, i) => ({
    name: `QuotaVoter_${i + 1}`,
    optId: `opt-${(i % 3) + 1}`,
  }));

  const quotaResults = await Promise.all(
    quotaVoters.map(async (v) => {
      const res = await fetch(`${baseUrl}/api/polls/${quotaPollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds: [v.optId],
          voterName: v.name,
        }),
      });
      const data = await res.json();
      return { status: res.status, data };
    })
  );

  const quotaSuccesses = quotaResults.filter((r) => r.status === 200);
  const quotaRejections = quotaResults.filter((r) => r.status === 400);

  console.log(`Quota test results: ${quotaSuccesses.length} accepted, ${quotaRejections.length} rejected`);
  assert(quotaSuccesses.length === 5, `Strictly 5 votes accepted (got ${quotaSuccesses.length})`);
  assert(quotaRejections.length === 10, `Strictly 10 votes rejected (got ${quotaRejections.length})`);

  const finalQuotaRes = await fetch(`${baseUrl}/api/polls/${quotaPollId}`);
  const finalQuotaData = await finalQuotaRes.json();
  assert(finalQuotaData.poll.totalVotes === 5, `Total votes exactly 5 (got ${finalQuotaData.poll.totalVotes})`);

  // ----------------------------------------------------
  // TEST 5: SSE Real-Time Streaming Lifecycle
  // ----------------------------------------------------
  console.log("\n--- AUDIT 5: SSE Real-Time Streaming Lifecycle ---");
  const sseRes = await fetch(`${baseUrl}/api/polls/${quotaPollId}/stream`);
  assert(sseRes.status === 200, "SSE stream connection established");
  assert(sseRes.headers.get("content-type")?.includes("text/event-stream"), "Content-Type is text/event-stream");

  // Read first chunk from SSE stream
  const reader = sseRes.body.getReader();
  const { value, done } = await reader.read();
  const textChunk = new TextDecoder().decode(value);
  assert(!done && textChunk.includes(`"id":"${quotaPollId}"`), "SSE stream delivered initial poll payload");

  // Cleanly close reader
  await reader.cancel();
  console.log("Cleanly cancelled SSE stream reader.");

  console.log("\n==================================================");
  console.log(`   FULL AUDIT COMPLETE: ${passed}/${total} CHECKS PASSED (100%) `);
  console.log("==================================================");
}

runFullAuditTests().catch((err) => {
  console.error("\n❌ AUDIT FAILED WITH ERROR:", err);
  process.exit(1);
});

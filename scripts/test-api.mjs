async function runTests() {
  console.log("Starting Choice Online Poll API tests...");
  const baseUrl = "http://localhost:3000";

  // Test 1: Create a standard poll
  console.log("\n--- Test 1: Create Standard Poll ---");
  const res1 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "What is your favorite programming language?",
      options: ["TypeScript", "Python", "Rust", "Go"],
      isMultipleChoice: false,
      isEliminationMode: false,
    }),
  });
  const data1 = await res1.json();
  console.log("Create Status:", res1.status, "Poll ID:", data1.poll?.id);
  if (!data1.poll?.id) throw new Error("Failed to create standard poll");

  // Vote on standard poll
  const voteRes1 = await fetch(`${baseUrl}/api/polls/${data1.poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Alex Standard" }),
  });
  const voteData1 = await voteRes1.json();
  console.log("Vote Status:", voteRes1.status, "Votes for opt-1:", voteData1.poll?.options[0]?.votes);
  if (voteData1.poll?.options[0]?.votes !== 1) throw new Error("Vote count did not increment");

  // Test 2: Create Elimination / Single-Claim Poll (User's feature)
  console.log("\n--- Test 2: Elimination / Single-Claim Mode Poll ---");
  const res2 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Claim your presentation topic (First come first served):",
      options: ["Topic A: WebSockets", "Topic B: AI Agents", "Topic C: Next.js 16"],
      isMultipleChoice: false,
      isEliminationMode: true,
    }),
  });
  const data2 = await res2.json();
  const poll2Id = data2.poll.id;
  console.log("Elimination Poll Created:", poll2Id, "isEliminationMode:", data2.poll.isEliminationMode);

  // First voter claims Topic B (opt-2)
  console.log("Voter 1 claims Option 2 ('Topic B: AI Agents')...");
  const voteRes2 = await fetch(`${baseUrl}/api/polls/${poll2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Alice Walker" }),
  });
  const voteData2 = await voteRes2.json();
  const claimedOpt = voteData2.poll.options.find(o => o.id === "opt-2");
  console.log("Claimed Option Status:", {
    votes: claimedOpt.votes,
    isEliminated: claimedOpt.isEliminated,
    claimedAt: claimedOpt.claimedAt
  });
  if (!claimedOpt.isEliminated) {
    throw new Error("Option was not eliminated after being claimed!");
  }

  // Second voter tries to claim the SAME Topic B (should be rejected!)
  console.log("Voter 2 tries to claim the same Option 2 (Should fail)...");
  const voteRes3 = await fetch(`${baseUrl}/api/polls/${poll2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Bob Singer" }),
  });
  const voteData3 = await voteRes3.json();
  console.log("Voter 2 Attempt Status:", voteRes3.status, "Error message:", voteData3.error);
  if (voteRes3.status === 200) {
    throw new Error("Eliminated option was allowed to be claimed again!");
  }

  // Voter 2 claims Option 1 instead (should succeed)
  console.log("Voter 2 claims Option 1 ('Topic A: WebSockets')...");
  const voteRes4 = await fetch(`${baseUrl}/api/polls/${poll2Id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Bob Singer" }),
  });
  const voteData4 = await voteRes4.json();
  console.log("Voter 2 Status:", voteRes4.status, "Opt 1 eliminated:", voteData4.poll.options[0].isEliminated);

  // Test 3: Fetch Results
  console.log("\n--- Test 3: Fetch Final Results ---");
  const resultsRes = await fetch(`${baseUrl}/api/polls/${poll2Id}`);
  const resultsData = await resultsRes.json();
  console.log("Poll Question:", resultsData.poll.question);
  console.log("Total Votes:", resultsData.poll.totalVotes);
  console.log("Options Summary:");
  resultsData.poll.options.forEach(opt => {
    console.log(`  - ${opt.text}: ${opt.votes} vote(s) | Status: ${opt.isEliminated ? "ELIMINATED / CLAIMED" : "AVAILABLE"}`);
  });

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

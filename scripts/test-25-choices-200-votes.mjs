async function test100ChoicesAnd200Votes() {
  console.log("Testing 100 Choices and 200 Votes limit...");
  const baseUrl = "http://localhost:3000";

  // Test 1: Create a poll with exactly 100 choices
  const choices100 = Array.from({ length: 100 }, (_, i) => `Option ${i + 1}`);
  console.log(`Creating poll with ${choices100.length} choices...`);

  const res100 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Which of these 100 technologies do you use most?",
      options: choices100,
      isMultipleChoice: true,
      isEliminationMode: false,
      maxTotalVotes: 200,
    }),
  });

  const data100 = await res100.json();
  console.log("Poll Created Status:", res100.status, "ID:", data100.poll?.id);
  console.log("Number of Options in Poll:", data100.poll?.options.length);
  console.log("Max Total Votes:", data100.poll?.maxTotalVotes);

  if (data100.poll?.options.length !== 100) {
    throw new Error(`Expected 100 options, got ${data100.poll?.options.length}`);
  }
  if (data100.poll?.maxTotalVotes !== 200) {
    throw new Error(`Expected maxTotalVotes 200, got ${data100.poll?.maxTotalVotes}`);
  }

  // Test 2: Rejecting > 100 choices (e.g. 101 choices)
  const choices101 = Array.from({ length: 101 }, (_, i) => `Option ${i + 1}`);
  console.log(`\nTesting rejection of ${choices101.length} choices...`);
  const res101 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Too many choices test",
      options: choices101,
    }),
  });
  const data101 = await res101.json();
  console.log(`Rejection Status: ${res101.status}, Error: "${data101.error}"`);
  if (res101.status === 200) {
    throw new Error("Should have rejected 101 choices!");
  }

  // Test 3: Elimination mode with 10 votes per choice capacity
  console.log("\nTesting Elimination mode with 10 capacity per choice...");
  const resElim10 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Conference Room Allocation (Up to 10 per room):",
      options: ["Auditorium A", "Auditorium B"],
      isEliminationMode: true,
      maxPerOption: 10,
      maxTotalVotes: 200,
    }),
  });
  const dataElim10 = await resElim10.json();
  const pollElim = dataElim10.poll;
  console.log("Elimination Poll Created:", pollElim.id);
  console.log("Option 1 maxClaims:", pollElim.options[0].maxClaims);
  if (pollElim.options[0].maxClaims !== 10) {
    throw new Error(`Expected 10 maxClaims, got ${pollElim.options[0].maxClaims}`);
  }

  // Test 4: Vote Quota Enforcement
  console.log("\nTesting Vote Quota Lock (e.g. quota of 2 votes)...");
  const quotaPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Quick 2-vote quota test",
      options: ["Yes", "No"],
      maxTotalVotes: 2,
    }),
  });
  const quotaPoll = (await quotaPollRes.json()).poll;

  // Vote 1
  await fetch(`${baseUrl}/api/polls/${quotaPoll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter 1" }),
  });

  // Vote 2 (reaches quota = 2)
  await fetch(`${baseUrl}/api/polls/${quotaPoll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Voter 2" }),
  });

  // Vote 3 (should be BLOCKED)
  const vote3Res = await fetch(`${baseUrl}/api/polls/${quotaPoll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter 3" }),
  });
  const vote3Data = await vote3Res.json();
  console.log(`Vote 3 Status (Quota Lock): ${vote3Res.status}, Error: "${vote3Data.error}"`);
  if (vote3Res.status === 200) {
    throw new Error("Should have blocked voting after quota reached!");
  }

  console.log("\n>>> ALL TESTS FOR 100 CHOICES AND 200 VOTES PASSED 100%! <<<");
}

test100ChoicesAnd200Votes().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

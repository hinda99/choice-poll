async function test200ChoicesAnd200Votes() {
  console.log("Testing 200 Choices and 200 Votes limit...");
  const baseUrl = "http://localhost:3000";

  // Test 1: Create a poll with exactly 200 choices
  const choices200 = Array.from({ length: 200 }, (_, i) => `Option ${i + 1}`);
  console.log(`Creating poll with ${choices200.length} choices...`);

  const res200 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Which of these 200 technologies do you use most?",
      options: choices200,
      isMultipleChoice: true,
      isEliminationMode: false,
      maxTotalVotes: 200,
    }),
  });

  const data200 = await res200.json();
  console.log("Poll Created Status:", res200.status, "ID:", data200.poll?.id);
  console.log("Number of Options in Poll:", data200.poll?.options.length);
  console.log("Max Total Votes:", data200.poll?.maxTotalVotes);

  if (data200.poll?.options.length !== 200) {
    throw new Error(`Expected 200 options, got ${data200.poll?.options.length}`);
  }
  if (data200.poll?.maxTotalVotes !== 200) {
    throw new Error(`Expected maxTotalVotes 200, got ${data200.poll?.maxTotalVotes}`);
  }

  // Test 2: Rejecting > 200 choices (e.g. 201 choices)
  const choices201 = Array.from({ length: 201 }, (_, i) => `Option ${i + 1}`);
  console.log(`\nTesting rejection of ${choices201.length} choices...`);
  const res201 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Too many choices test",
      options: choices201,
    }),
  });
  const data201 = await res201.json();
  console.log(`Rejection Status: ${res201.status}, Error: "${data201.error}"`);
  if (res201.status === 200) {
    throw new Error("Should have rejected 201 choices!");
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

  console.log("\n>>> ALL TESTS FOR 200 CHOICES AND 200 VOTES PASSED 100%! <<<");
}

test200ChoicesAnd200Votes().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

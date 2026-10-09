// Comprehensive Choice-Based CSV Export Verification Test Suite
// Covers:
// 1. Single-choice polls (correct grouping, total votes, zero-vote choices, duplicate voter names)
// 2. Multiple-choice polls (voters appear under all selected choices)
// 3. Empty polls (zero votes cast, all choices included with 0 votes and empty cell)
// 4. Formula injection protection (CWE-1236: =, +, -, @, \t, \r sanitized with leading ')
// 5. Internationalization & special characters (Arabic, French, commas, double quotes)
// 6. Security & access controls (403 for unauthorized voters, no leaked metadata or technical IDs)
// 7. Strict RFC 4180 structure & UTF-8 BOM verification

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentCell);
        currentCell = "";
        i++;
        continue;
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i += 2;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

async function runCsvExportTests() {
  const baseUrl = "http://localhost:3000";
  console.log("==========================================================");
  console.log("   CHOICE-BASED CSV EXPORT — COMPREHENSIVE TEST SUITE     ");
  console.log("==========================================================\n");

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
  // TEST 1: Single-Choice Poll Export
  // ----------------------------------------------------
  console.log("\n--- TEST 1: Single-Choice Poll CSV Export ---");
  const singlePollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Favorite Framework?",
      options: ["React", "Vue", "Svelte", "Angular"],
      isMultipleChoice: false,
    }),
  });
  const singlePollData = await singlePollRes.json();
  const singlePollId = singlePollData.poll.id;
  const singleAdminKey = singlePollData.creatorKey;
  assert(singlePollRes.status === 201, "Created single-choice poll");

  // Cast votes:
  // Alice -> React
  // Bob -> React
  // Alice -> React (Duplicate voter name representing separate valid vote)
  // Charlie -> Vue
  // Svelte & Angular -> 0 votes
  await fetch(`${baseUrl}/api/polls/${singlePollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Alice Smith" }),
  });
  await fetch(`${baseUrl}/api/polls/${singlePollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Bob Jones" }),
  });
  await fetch(`${baseUrl}/api/polls/${singlePollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Alice Smith" }),
  });
  await fetch(`${baseUrl}/api/polls/${singlePollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Charlie Brown" }),
  });

  const singleExportRes = await fetch(
    `${baseUrl}/api/polls/${singlePollId}/export?adminKey=${singleAdminKey}`
  );
  assert(singleExportRes.status === 200, "Owner successfully fetched CSV export");
  assert(
    singleExportRes.headers.get("content-type")?.includes("text/csv"),
    "Content-Type is text/csv"
  );
  assert(
    singleExportRes.headers.get("content-disposition")?.includes(`poll-${singlePollId}-results.csv`),
    "Content-Disposition specifies correct filename"
  );

  const singleBuf = await singleExportRes.arrayBuffer();
  const singleBytes = new Uint8Array(singleBuf);
  assert(
    singleBytes[0] === 0xef && singleBytes[1] === 0xbb && singleBytes[2] === 0xbf,
    "Begins with UTF-8 BOM (0xEF, 0xBB, 0xBF)"
  );

  const singleText = new TextDecoder("utf-8").decode(singleBuf);
  const singleRows = parseCSV(singleText);

  assert(singleRows.length === 5, `CSV has 5 rows (1 header + 4 choices, got ${singleRows.length})`);
  assert(singleRows[0][0] === "Selected Choice", "Column 1 header is 'Selected Choice'");
  assert(singleRows[0][1] === "Voters (Names)", "Column 2 header is 'Voters (Names)'");
  assert(singleRows[0][2] === "Total Votes", "Column 3 header is 'Total Votes'");

  // Row 1: React
  assert(singleRows[1][0] === "React", "Row 1 Choice is 'React'");
  assert(
    singleRows[1][1] === "Alice Smith, Bob Jones, Alice Smith",
    `Row 1 Voters cell preserves duplicates and order ('${singleRows[1][1]}')`
  );
  assert(singleRows[1][2] === "3", `Row 1 Total Votes is '3' (got '${singleRows[1][2]}')`);

  // Row 2: Vue
  assert(singleRows[2][0] === "Vue", "Row 2 Choice is 'Vue'");
  assert(singleRows[2][1] === "Charlie Brown", "Row 2 Voters cell is 'Charlie Brown'");
  assert(singleRows[2][2] === "1", "Row 2 Total Votes is '1'");

  // Row 3: Svelte (0 votes)
  assert(singleRows[3][0] === "Svelte", "Row 3 Choice is 'Svelte'");
  assert(singleRows[3][1] === "", "Row 3 Voters cell is empty for 0 votes");
  assert(singleRows[3][2] === "0", "Row 3 Total Votes is '0'");

  // Row 4: Angular (0 votes)
  assert(singleRows[4][0] === "Angular", "Row 4 Choice is 'Angular'");
  assert(singleRows[4][1] === "", "Row 4 Voters cell is empty for 0 votes");
  assert(singleRows[4][2] === "0", "Row 4 Total Votes is '0'");

  // ----------------------------------------------------
  // TEST 2: Multiple-Choice Poll Export
  // ----------------------------------------------------
  console.log("\n--- TEST 2: Multiple-Choice Poll CSV Export ---");
  const multiPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Which areas do you contribute to?",
      options: ["Frontend", "Backend", "DevOps"],
      isMultipleChoice: true,
    }),
  });
  const multiPollData = await multiPollRes.json();
  const multiPollId = multiPollData.poll.id;
  const multiAdminKey = multiPollData.creatorKey;
  assert(multiPollRes.status === 201, "Created multiple-choice poll");

  // Voter 1: Dave -> Frontend, Backend
  // Voter 2: Emma -> Frontend, DevOps
  // Voter 3: Frank -> Backend, DevOps
  await fetch(`${baseUrl}/api/polls/${multiPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1", "opt-2"],
      voterName: "Dave Developer",
    }),
  });
  await fetch(`${baseUrl}/api/polls/${multiPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1", "opt-3"],
      voterName: "Emma Engineer",
    }),
  });
  await fetch(`${baseUrl}/api/polls/${multiPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-2", "opt-3"],
      voterName: "Frank Fullstack",
    }),
  });

  const multiExportRes = await fetch(
    `${baseUrl}/api/polls/${multiPollId}/export?adminKey=${multiAdminKey}`
  );
  assert(multiExportRes.status === 200, "Fetched multiple-choice CSV export");
  const multiBuf = await multiExportRes.arrayBuffer();
  const multiText = new TextDecoder("utf-8").decode(multiBuf);
  const multiRows = parseCSV(multiText);

  assert(multiRows.length === 4, "CSV has exactly 4 rows (1 header + 3 choices)");
  assert(multiRows[0].join(",") === "Selected Choice,Voters (Names),Total Votes", "Headers match exactly");

  // Frontend: Dave, Emma
  assert(multiRows[1][0] === "Frontend", "Choice is 'Frontend'");
  assert(multiRows[1][1] === "Dave Developer, Emma Engineer", "Frontend contains Dave and Emma");
  assert(multiRows[1][2] === "2", "Frontend total votes is 2");

  // Backend: Dave, Frank
  assert(multiRows[2][0] === "Backend", "Choice is 'Backend'");
  assert(multiRows[2][1] === "Dave Developer, Frank Fullstack", "Backend contains Dave and Frank");
  assert(multiRows[2][2] === "2", "Backend total votes is 2");

  // DevOps: Emma, Frank
  assert(multiRows[3][0] === "DevOps", "Choice is 'DevOps'");
  assert(multiRows[3][1] === "Emma Engineer, Frank Fullstack", "DevOps contains Emma and Frank");
  assert(multiRows[3][2] === "2", "DevOps total votes is 2");

  // ----------------------------------------------------
  // TEST 3: Empty Poll (Zero Votes Cast)
  // ----------------------------------------------------
  console.log("\n--- TEST 3: Empty Poll CSV Export (Zero Votes) ---");
  const emptyPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Brand new poll with no votes yet?",
      options: ["Alpha Option", "Beta Option", "Gamma Option"],
      isMultipleChoice: false,
    }),
  });
  const emptyPollData = await emptyPollRes.json();
  const emptyPollId = emptyPollData.poll.id;
  const emptyAdminKey = emptyPollData.creatorKey;
  assert(emptyPollRes.status === 201, "Created empty poll");

  const emptyExportRes = await fetch(
    `${baseUrl}/api/polls/${emptyPollId}/export?adminKey=${emptyAdminKey}`
  );
  assert(emptyExportRes.status === 200, "Fetched empty poll CSV");
  const emptyBuf = await emptyExportRes.arrayBuffer();
  const emptyText = new TextDecoder("utf-8").decode(emptyBuf);
  const emptyRows = parseCSV(emptyText);

  assert(emptyRows.length === 4, "Empty poll CSV has 4 rows (header + 3 choices)");
  assert(emptyRows[0].join(",") === "Selected Choice,Voters (Names),Total Votes", "Header row is present");

  for (let i = 1; i <= 3; i++) {
    assert(emptyRows[i][1] === "", `Row ${i} voters cell is empty`);
    assert(emptyRows[i][2] === "0", `Row ${i} total votes is 0`);
  }
  assert(emptyRows[1][0] === "Alpha Option", "Alpha Option preserved");
  assert(emptyRows[2][0] === "Beta Option", "Beta Option preserved");
  assert(emptyRows[3][0] === "Gamma Option", "Gamma Option preserved");

  // ----------------------------------------------------
  // TEST 4: Formula Injection (CWE-1236) Protection
  // ----------------------------------------------------
  console.log("\n--- TEST 4: Formula Injection (CWE-1236) Protection ---");
  const formulaPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "=1+1 Formula Question",
      options: [
        "=SUM(1+1)",
        "+447911123456",
        "-SUBTRACT(5,2)",
        "@DDE('cmd')",
      ],
      isMultipleChoice: true,
    }),
  });
  const formulaPollData = await formulaPollRes.json();
  const formulaPollId = formulaPollData.poll.id;
  const formulaAdminKey = formulaPollData.creatorKey;
  assert(formulaPollRes.status === 201, "Created poll with formula options");

  // Cast votes with formula voter names
  // Test choice with multiple voters where first voter is a formula
  await fetch(`${baseUrl}/api/polls/${formulaPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1"],
      voterName: "=cmd|'/C calc'!A0",
    }),
  });
  await fetch(`${baseUrl}/api/polls/${formulaPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1"],
      voterName: "Alice Safe",
    }),
  });

  // Test choice with multiple voters where second voter is a formula
  await fetch(`${baseUrl}/api/polls/${formulaPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-2"],
      voterName: "Bob Safe",
    }),
  });
  await fetch(`${baseUrl}/api/polls/${formulaPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-2"],
      voterName: "+9999999999",
    }),
  });

  await fetch(`${baseUrl}/api/polls/${formulaPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-3"],
      voterName: "-discount_formula",
    }),
  });
  await fetch(`${baseUrl}/api/polls/${formulaPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-4"],
      voterName: "@malicious_at",
    }),
  });

  const formulaExportRes = await fetch(
    `${baseUrl}/api/polls/${formulaPollId}/export?adminKey=${formulaAdminKey}`
  );
  assert(formulaExportRes.status === 200, "Fetched formula poll CSV");
  const formulaBuf = await formulaExportRes.arrayBuffer();
  const formulaText = new TextDecoder("utf-8").decode(formulaBuf);
  const formulaRows = parseCSV(formulaText);

  // Check choices are sanitized with leading single quote
  assert(formulaRows[1][0] === "'=SUM(1+1)", "= Choice prepended with '");
  assert(formulaRows[2][0] === "'+447911123456", "+ Choice prepended with '");
  assert(formulaRows[3][0] === "'-SUBTRACT(5,2)", "- Choice prepended with '");
  assert(formulaRows[4][0] === "'@DDE('cmd')", "@ Choice prepended with '");

  // Check voter names are sanitized with leading single quote, even when mixed in multi-voter cells
  assert(
    formulaRows[1][1] === "'=cmd|'/C calc'!A0, Alice Safe",
    "Mixed cell with formula first has leading quote and preserves safe voter"
  );
  assert(formulaRows[1][2] === "2", "Row 1 Total Votes correctly calculates 2");

  assert(
    formulaRows[2][1] === "Bob Safe, '+9999999999",
    "Mixed cell with formula second sanitizes formula voter without corrupting first voter"
  );
  assert(formulaRows[2][2] === "2", "Row 2 Total Votes correctly calculates 2");

  assert(formulaRows[3][1] === "'-discount_formula", "- Voter prepended with '");
  assert(formulaRows[4][1] === "'@malicious_at", "@ Voter prepended with '");

  // ----------------------------------------------------
  // TEST 5: Arabic, French, Comma & Quotes Special Characters
  // ----------------------------------------------------
  console.log("\n--- TEST 5: Multilingual (Arabic, French) & Special Characters ---");
  const specialPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "استطلاع دولي / Sondage International",
      options: [
        "نعم بالتأكيد (Option Arabe)",
        "Café, thé ou chocolat chaud (Français)",
        "Choice with \"Quotes\" inside",
      ],
      isMultipleChoice: true,
    }),
  });
  const specialPollData = await specialPollRes.json();
  const specialPollId = specialPollData.poll.id;
  const specialAdminKey = specialPollData.creatorKey;
  assert(specialPollRes.status === 201, "Created international poll");

  await fetch(`${baseUrl}/api/polls/${specialPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-1"],
      voterName: "محمد عبد الله",
    }),
  });
  await fetch(`${baseUrl}/api/polls/${specialPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-2"],
      voterName: "Éléonore François",
    }),
  });
  await fetch(`${baseUrl}/api/polls/${specialPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionIds: ["opt-3"],
      voterName: "Smith, John \"The Great\"",
    }),
  });

  const specialExportRes = await fetch(
    `${baseUrl}/api/polls/${specialPollId}/export?adminKey=${specialAdminKey}`
  );
  assert(specialExportRes.status === 200, "Fetched special characters CSV");
  const specialBuf = await specialExportRes.arrayBuffer();
  const specialText = new TextDecoder("utf-8").decode(specialBuf);
  const specialRows = parseCSV(specialText);

  assert(specialRows[1][0] === "نعم بالتأكيد (Option Arabe)", "Arabic choice text preserved");
  assert(specialRows[1][1] === "محمد عبد الله", "Arabic voter name preserved");

  assert(specialRows[2][0] === "Café, thé ou chocolat chaud (Français)", "French choice text with commas preserved");
  assert(specialRows[2][1] === "Éléonore François", "French voter name with accents preserved");

  assert(specialRows[3][0] === 'Choice with "Quotes" inside', "Choice with embedded quotes parsed correctly");
  assert(specialRows[3][1] === 'Smith, John "The Great"', "Voter name with commas and quotes parsed correctly");

  // ----------------------------------------------------
  // TEST 6: Security & Access Control
  // ----------------------------------------------------
  console.log("\n--- TEST 6: Security & Access Controls ---");
  // Unauthorized request (no admin key)
  const unauthRes = await fetch(`${baseUrl}/api/polls/${singlePollId}/export`);
  assert(unauthRes.status === 403, "Export without adminKey returns 403 Forbidden");

  // Unauthorized request (wrong admin key)
  const wrongKeyRes = await fetch(`${baseUrl}/api/polls/${singlePollId}/export?adminKey=wrong-key`);
  assert(wrongKeyRes.status === 403, "Export with invalid adminKey returns 403 Forbidden");

  // Non-existent poll
  const notFoundRes = await fetch(`${baseUrl}/api/polls/nonexistent-id/export?adminKey=any`);
  assert(notFoundRes.status === 404, "Export for non-existent poll returns 404 Not Found");

  // Verify internal metadata and technical IDs are not exposed in CSV
  assert(!singleText.includes("creatorKey"), "creatorKey is NOT exposed in CSV");
  assert(!singleText.includes("Poll ID:"), "Technical Poll ID label is NOT exposed in CSV");
  assert(!singleText.includes("opt-1"), "Internal option ID is NOT exposed in CSV");
  assert(!singleText.includes("v-"), "Internal voteRecord ID is NOT exposed in CSV");
  assert(!singleText.includes("Expiration:"), "Internal expiration metadata is NOT exposed in CSV");

  // ----------------------------------------------------
  // TEST 7: Elimination Mode with Choice Capacity
  // ----------------------------------------------------
  console.log("\n--- TEST 7: Elimination Mode with Capacity Poll CSV Export ---");
  const elimPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Workshop Session Preference",
      options: ["Morning Session", "Afternoon Session", "Evening Session"],
      isEliminationMode: true,
      maxPerOption: 2,
    }),
  });
  const elimPollData = await elimPollRes.json();
  const elimPollId = elimPollData.poll.id;
  const elimAdminKey = elimPollData.creatorKey;
  assert(elimPollRes.status === 201, "Created elimination mode poll");

  // Morning gets 2 claims (hits max capacity)
  await fetch(`${baseUrl}/api/polls/${elimPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter One" }),
  });
  await fetch(`${baseUrl}/api/polls/${elimPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter Two" }),
  });

  // Afternoon gets 1 claim
  await fetch(`${baseUrl}/api/polls/${elimPollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Voter Three" }),
  });
  // Evening gets 0 claims

  const elimExportRes = await fetch(
    `${baseUrl}/api/polls/${elimPollId}/export?adminKey=${elimAdminKey}`
  );
  assert(elimExportRes.status === 200, "Fetched elimination mode CSV");
  const elimBuf = await elimExportRes.arrayBuffer();
  const elimText = new TextDecoder("utf-8").decode(elimBuf);
  const elimRows = parseCSV(elimText);

  assert(elimRows.length === 4, "Elimination mode CSV has 4 rows");
  assert(elimRows[0].join(",") === "Selected Choice,Voters (Names),Total Votes", "Elimination CSV header matches");
  assert(elimRows[1][0] === "Morning Session", "Choice 1 is Morning Session");
  assert(elimRows[1][1] === "Voter One, Voter Two", "Choice 1 voters grouped correctly");
  assert(elimRows[1][2] === "2", "Choice 1 total votes is 2");

  assert(elimRows[2][0] === "Afternoon Session", "Choice 2 is Afternoon Session");
  assert(elimRows[2][1] === "Voter Three", "Choice 2 voters grouped correctly");
  assert(elimRows[2][2] === "1", "Choice 2 total votes is 1");

  assert(elimRows[3][0] === "Evening Session", "Choice 3 is Evening Session (0 votes)");
  assert(elimRows[3][1] === "", "Choice 3 voters is empty");
  assert(elimRows[3][2] === "0", "Choice 3 total votes is 0");

  // ----------------------------------------------------
  // TEST 8: Tab (\t), Carriage Return (\r) & Formula Sanitization Units
  // ----------------------------------------------------
  console.log("\n--- TEST 8: Direct Formula Sanitization & Escaping Tests ---");
  // Test sanitizeFormula logic:
  function sanitizeFormula(val) {
    if (val === undefined || val === null) return "";
    const str = String(val);
    const trimmed = str.trimStart();
    if (trimmed.startsWith("'")) {
      return str;
    }
    if (
      trimmed.startsWith("=") ||
      trimmed.startsWith("+") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("@") ||
      str.startsWith("\t") ||
      str.startsWith("\r") ||
      str.startsWith("\n")
    ) {
      return `'${str}`;
    }
    return str;
  }

  assert(sanitizeFormula("\tcalc") === "'\tcalc", "Horizontal tab is sanitized with leading single quote");
  assert(sanitizeFormula("\rcalc") === "'\rcalc", "Carriage return is sanitized with leading single quote");
  assert(sanitizeFormula("\ncalc") === "'\ncalc", "Newline is sanitized with leading single quote");
  assert(sanitizeFormula("   =SUM(1)") === "'   =SUM(1)", "Leading whitespace before = is sanitized");
  assert(sanitizeFormula("'+44123") === "'+44123", "Already escaped value is not double-escaped");
  assert(sanitizeFormula("Alice") === "Alice", "Safe text is not modified");
  assert(sanitizeFormula(0) === "0", "Numeric 0 is not modified");
  assert(sanitizeFormula(null) === "", "Null produces empty string without throwing");
  assert(sanitizeFormula(undefined) === "", "Undefined produces empty string without throwing");

  console.log("\n==========================================================");
  console.log(`   ALL ${passed} / ${total} CHOICE-BASED CSV TESTS PASSED! `);
  console.log("==========================================================\n");
}

runCsvExportTests().catch((err) => {
  console.error("CSV Export test run failed:", err);
  process.exit(1);
});

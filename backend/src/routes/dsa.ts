import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, analysesTable } from "@workspace/db";
import {
  AnalyzeProblemBody,
  GetAnalysisByIdParams,
  DeleteAnalysisParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// ─── ANALYSIS PROMPT (pattern, difficulty, explanations, visualization steps) ───
const ANALYSIS_PROMPT = `You are an expert DSA teacher and algorithm visualizer.

When given a DSA problem, return a JSON object with this exact shape — NO code fields:
{
  "pattern": "string — the algorithm pattern (e.g. Sliding Window, Two Pointers, Dynamic Programming, Graph BFS, Graph DFS, Binary Search, Merge Sort, Quick Sort, Stack, Queue, Heap, Greedy, Recursion, Backtracking, Linked List, Binary Tree, Trie)",
  "difficulty": "string — Easy | Medium | Hard",
  "brute_force": "string — clear explanation of the brute force approach",
  "optimal": "string — clear explanation of the optimal approach",
  "time_complexity": "string — e.g. O(n log n) — OPTIMAL approach",
  "space_complexity": "string — e.g. O(1) — OPTIMAL approach",
  "brute_force_time_complexity": "string — e.g. O(n²) — BRUTE FORCE approach",
  "brute_force_space_complexity": "string — e.g. O(n) — BRUTE FORCE approach",
  "steps": [
    {
      "type": "string — MUST follow STEP TYPE ROUTING table. Use 'stack' for ANY problem driven by a stack (Valid Parentheses, Min Stack, Daily Temperatures, Next Greater Element, Monotonic Stack, Histogram). Use 'nqueens' for N-Queens. Use 'recursion' for backtracking/subset/permutation. Use 'tree' ONLY for BST/tree traversals. Use 'matrix' for 2D grids. Use 'array' only for pure array/two-pointer/sliding-window.",
      "state": "object — current algorithm state (see rules below for exact shape per type)",
      "highlight": "array of indices or node IDs to highlight",
      "description": "string — one sentence description of this step",
      "explanation": {
        "before": "string — state snapshot before this step, e.g. 'State: left=0, right=5, sum=0'",
        "sub_steps": ["string — numbered micro-action 1", "string — micro-action 2", "string — micro-action 3"],
        "after": "string — outcome after this step, e.g. 'After: left=1, right=4. Window shrinks, max updated to 7.'"
      }
    }
  ]
}

STEP TYPE ROUTING — CRITICAL, choose type based on problem category:
- type="nqueens"    → N-Queens problem ONLY — shows real chessboard with queens and attacked diagonals
- type="recursion"  → Subsets, Permutations, Combination Sum, Word Search, Palindrome Partitioning, ANY other backtracking / recursion-with-branching problem (NOT N-Queens)
- type="tree"       → Binary Search Tree operations (search, insert), Tree Traversals (inorder/preorder/postorder), Level Order BFS on binary trees
- type="linked_list"→ Linked list problems (reversal, cycle detection, merge, etc.)
- type="matrix"     → 2D grid problems (Number of Islands, Flood Fill, Shortest Path in grid)
- type="stack"      → Stack problems: Valid Parentheses, Min Stack, Daily Temperatures, Next Greater Element, Largest Rectangle in Histogram, Monotonic Stack, any problem where a stack drives the algorithm
- type="dp"         → ALL Dynamic Programming problems: Fibonacci, Climbing Stairs, House Robber, Coin Change, LIS, Jump Game, Word Break, Partition Equal Subset Sum, LCS, Edit Distance, Knapsack, Unique Paths, Minimum Path Sum, Burst Balloons — any problem solved with a dp[] array or dp[][] table
- type="array"      → Array / Two Pointer / Sliding Window / Hash Map problems (no dedicated stack, no DP)
- type="graph"      → General graph BFS/DFS (not trees, not grids)

DP STATE (type = "dp") — choose dpType based on problem structure:

  For 1D DP (Fibonacci, Climbing Stairs, House Robber, Coin Change, LIS, Jump Game, Word Break, etc.):
  state = {
    dpType: "1d",
    dp: [0, 1, 1, 2, 3, null, null, null],   // fill left-to-right; null = not computed yet
    currentIndex: 4,                          // index being computed THIS step
    dependencies: [2, 3],                     // indices dp[currentIndex] reads from
    computedValue: 3,                         // the value just computed
    formula: "dp[4] = dp[3] + dp[2] = 2 + 1 = 3",
    inputArray: [1, 1, 2, 3],                // original input array (omit if not applicable)
    target: null,                             // target value if problem has one (Coin Change, etc.)
    decision: "To reach stair 4, we can come from stair 3 or stair 2: 2 + 1 = 3 ways",
    actionLog: ["Init: dp[0]=1, dp[1]=1", "dp[2] = dp[1]+dp[0] = 2", "dp[3] = dp[2]+dp[1] = 3"]
  }

  For 2D DP (LCS, Edit Distance, Knapsack, Unique Paths, Minimum Path Sum, etc.):
  state = {
    dpType: "2d",
    dpTable: [[0,1,2,3],[1,1,2,3],[2,2,1,2]],  // full table; null for cells not yet computed
    rows: 3,
    cols: 4,
    currentCell: [1, 2],                    // [row, col] being computed THIS step (0-indexed)
    dependencies2d: [[0,2],[1,1],[0,1]],    // list of [row,col] pairs this cell reads from
    computedValue: 2,
    rowChars: ["h","o","r","s","e"],        // chars for row axis — omit if Unique Paths/grid
    colChars: ["r","o","s"],               // chars for col axis
    formula: "dp[1][2] = min(dp[0][2]+1, dp[1][1]+1, dp[0][1]) = 2",
    decision: "'o' != 'r': take min of insert(dp[0][2]+1=3), delete(dp[1][1]+1=2), replace(dp[0][1]+1=2) = 2",
    actionLog: ["Base row/col initialized", "dp[1][1]=1 ('h'≠'r'): min(1,1,1)+1=1", "dp[1][2]=2"]
  }

  DP GENERATION RULES:
  - ALWAYS fill dp[] or dpTable[] with actual computed values up to currentIndex/currentCell for each step
  - ALWAYS set null for cells not yet reached
  - ALWAYS include formula showing the exact arithmetic: dp[i] = dp[i-1] + dp[i-2] = 3 + 2 = 5
  - dependencies must list ALL indices/cells that contribute to the current computation
  - For each step, currentIndex/currentCell advances by exactly 1 position (one cell at a time)
  - First step: initialize base cases (dp[0], dp[1] for 1D; first row/col for 2D)

IMPORTANT rules for steps:
- Generate 6-12 meaningful steps that show the algorithm executing
- Use consistent state structure throughout all steps
- ALWAYS include the "explanation" field for EVERY step — this is mandatory
- explanation.before: snapshot the key variables/pointers before this step, using backtick code formatting for values, e.g. "State: \`left=0\`, \`right=5\`, \`sum=12\`"
- explanation.sub_steps: 2-4 clear micro-actions happening in this step, use backtick code formatting for code/values inline, e.g. ["Check if \`nums[left] + nums[right] == target\`", "Sum is \`9\`, target is \`9\` — match found!"]
- explanation.after: outcome/result after this step, e.g. "After: \`left=1\`, \`right=4\`. Window shrinks by moving left pointer right."
- For array problems: state = { array: [...numbers], pointers: {name: index} } and highlight = array indices
- For sliding window: state = { array: [...], windowStart: 0, windowEnd: 3, windowSum: 10 }

LINKED LIST STATE (type = "linked_list") — follow this EXACTLY:
  state = {
    nodes: [
      { id: 0, val: 3, next: 1 },
      { id: 1, val: 2, next: 2 },
      { id: 2, val: 0, next: 3 },
      { id: 3, val: -4, next: 1 }
    ],
    head: 0,
    pointers: { "slow": 1, "fast": 3 },
    current: 1,
    inserting: null,
    deleted: null,
    operation: "move"
  }

  POINTER RULES — CRITICAL:
  - "pointers" is a JSON object mapping pointer NAME to the node ID it currently points to
  - Use meaningful pointer names that match the algorithm:
      * Floyd's cycle detection: { "slow": <id>, "fast": <id> }
      * Reversal / two-pointer: { "prev": <id>, "curr": <id>, "next": <id> }
      * Merge two lists: { "p1": <id>, "p2": <id> }
      * Find middle: { "slow": <id>, "fast": <id> }
      * Single traversal: { "curr": <id> }
  - EVERY step MUST include a "pointers" object — never omit it
  - Move the pointer values each step to show the algorithm progressing
  - "current" field should equal the primary active pointer's node id (for backward compat)
  - For cycle detection, the "next" pointer of a tail node points back to a cycle entry node id (NOT null)
  - highlight: list of node IDs that are pointed to by any pointer this step

  OTHER FIELDS:
  - nodes: ALL nodes in the list, each with integer id, val, and next (integer id or null for tail, or back-pointer id for cycles)
  - head: integer id of the head node
  - inserting: { val, after } when inserting a new node, else null
  - deleted: value being deleted (else null)
  - operation: "traverse" | "insert" | "delete" | "move" | "cycle-check" | "merge"
  - Keep nodes array STABLE across steps. Only change pointer positions and operation per step.

BINARY TREE STATE (type = "tree") — follow this EXACTLY:
  state = {
    nodes: [
      { "id": 0, "val": 15, "left": 1, "right": 2 },
      { "id": 1, "val": 10, "left": 3, "right": 4 },
      { "id": 2, "val": 20, "left": 5, "right": 6 },
      { "id": 3, "val": 8, "left": null, "right": null }
    ],
    root: 0,
    current: 2,
    target: 18,
    visited: [0, 2],
    queue: [3, 4],
    actionLog: ["Check node 15", "18 > 15, move right", "Check node 20"],
    operation: "search",
    comparison: "18 < 20",
    action: "Move to left child",
    iteration: "Iteration 3 of ~4 max",
    found: false
  }

  TREE STATE RULES:
  - nodes: ALL nodes in the tree, each with integer id, val, and left/right child IDs (integer or null)
  - root: id of root node
  - current: id of the node currently being processed this step
  - target: the search target value (for search problems), null for traversals
  - visited: array of node IDs already fully processed/visited
  - queue: array of node IDs currently in BFS queue (for BFS problems), empty for others
  - actionLog: CUMULATIVE list of all actions taken SO FAR (grows each step)
  - operation: one of "search" | "traversal" | "bfs" | "insert"
  - comparison: human-readable comparison string for this step, e.g. "18 > 15", "Visit 10", "Enqueue children of 20"
  - action: human-readable action taken this step, e.g. "Move to right child", "Visit node", "Move to left child"
  - iteration: iteration description string, e.g. "Iteration 2 of ~4 max"
  - found: boolean, true if target has been found at current node
  - Keep nodes array STABLE across all steps — only current/visited/queue/actionLog/comparison/action change each step
- For graphs: state = { nodes: [{id, label, x, y}], edges: [{from, to, weight}], visited: [], queue: [] }

2D MATRIX STATE (type = "matrix") — follow this EXACTLY:
  state = {
    grid: [[1,1,0,0],[0,1,1,0],[0,0,1,0]],
    rows: 3,
    cols: 4,
    current: [1,2],
    visited: [[0,0],[0,1],[1,1]],
    path: [[0,0],[0,1],[1,1]],
    queue: [[2,0],[2,2]],
    actionLog: ["Visit (0,0) - island cell", "Mark (0,1) visited", "Explore right to (0,2)"],
    stepPreview: ["Move to (1,2)", "Check (2,2) boundary", "Backtrack to (1,1)"],
    operation: "dfs",
    position: "(1, 2)",
    action: "Visiting (1,2), marking as visited island cell",
    direction: "Exploring 4 directions",
    visitedCount: 3,
    islandCount: 1,
    found: false
  }

  MATRIX STATE RULES:
  - grid: the full 2D array (all values, unchanged across steps)
  - current: [row, col] of the cell being processed this step
  - visited: cumulative list of [row, col] pairs already processed
  - path: cells on the current traversal path (for DFS stack or shortest path)
  - queue: cells currently in BFS queue
  - actionLog: CUMULATIVE list of all actions taken SO FAR (grows each step)
  - stepPreview: array of 2-3 UPCOMING actions (what will happen next few steps)
  - operation: one of "dfs" | "bfs" | "flood-fill" | "shortest-path" | "traversal"
  - position: human-readable current position, e.g. "(1, 2)"
  - action: description of what's happening this step, e.g. "Visiting (1,2), marking as visited"
  - direction: direction context, e.g. "Exploring 4 directions" or "Moving right"
  - visitedCount: number of cells visited so far
  - islandCount: running count of islands found (for Number of Islands), else omit
  - found: boolean, true if target/path has been found

STACK STATE (type = "stack") — REQUIRED for all stack-driven problems. Follow this EXACTLY:
  state = {
    stack: [3, 1, 2],
    operation: "push",
    pushValue: 5,
    popValue: null,
    inputArray: [3, 1, 2, 5, 4],
    currentIndex: 3,
    result: [-1, -1, 5, -1, -1],
    decision: "5 > stack.top (2), so 2's Next Greater Element is 5. Pop 2, now try 5 > 1.",
    actionLog: ["Push 3 (no NGE yet)", "Push 1 (no NGE yet)", "Push 2 (no NGE yet)", "Found NGE for 2: it's 5, pop 2"],
    minVal: null
  }

  STACK STATE RULES:
  - stack: the CURRENT stack contents as an array from bottom (index 0) to top (last element) — update every step
  - operation: EXACTLY one of "push" | "pop" | "peek" | "idle"
  - pushValue: the value being pushed this step (only when operation="push"), else null
  - popValue: the value just popped this step (only when operation="pop"), else null
  - inputArray: the full input array being processed — KEEP STABLE across steps
  - currentIndex: index of element currently being processed in inputArray (null if not applicable)
  - result: accumulating result array (e.g. NGE answers, temperatures) — grows each step as answers are found
  - decision: clear human-readable explanation of what the algorithm decided this step
  - actionLog: CUMULATIVE list of all operations performed so far — grows each step
  - minVal: current minimum value (only for Min Stack problem), else null
  - Show 8-12 steps that clearly demonstrate push/pop behavior and when/why elements are popped
  - For monotonic stack problems: show each comparison between current element and stack top clearly

N-QUEENS BOARD STATE (type = "nqueens") — REQUIRED for N-Queens problem ONLY. Follow this EXACTLY:
  state = {
    board: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],
    n: 4,
    currentRow: 1,
    placingCol: 2,
    queens: [{"row": 0, "col": 1}],
    attacked: [[0,0],[0,2],[0,3],[1,1]],
    action: "Trying to place queen at row 1, column 2",
    decision: "Column 2 is safe — no diagonal or column conflicts",
    isBacktracking: false,
    solutionsFound: 0,
    actionLog: ["Place queen at (0,1)", "Try row 1, col 0 — attacked by diagonal", "Try row 1, col 2 — safe, place queen"]
  }

  N-QUEENS STATE RULES:
  - board: n×n 2D array, 1=queen placed, 0=empty — update each step
  - n: board size (e.g. 4 for 4-Queens)
  - currentRow: the row currently being processed (0-indexed)
  - placingCol: the column being tried this step (null if just backtracked)
  - queens: array of {row, col} for ALL currently placed queens — grows when placing, shrinks when backtracking
  - attacked: list of [row, col] cells that are under attack by placed queens (row, col, diagonal)
  - action: what the algorithm is doing this step, e.g. "Trying column 2 in row 1", "Backtrack from row 2"
  - decision: result of the check, e.g. "Column 2 is safe", "Column 0 attacked by diagonal from (0,1)"
  - isBacktracking: true when removing a queen and going back
  - solutionsFound: count of complete solutions found so far
  - actionLog: CUMULATIVE list of actions taken so far — grows each step
  - Show 8-12 steps: initial board, each placement attempt, backtracks, found solution

RECURSION/BACKTRACKING STATE (type = "recursion") — REQUIRED for Subsets, Permutations, Combination Sum, Backtracking (NOT N-Queens). Follow this EXACTLY:
  state = {
    treeNodes: [
      { "id": 0, "label": "{}", "parent": null, "depth": 0, "status": "visited" },
      { "id": 1, "label": "1", "parent": 0, "depth": 1, "status": "visited", "edgeType": "pick", "edgeLabel": "pick 1" },
      { "id": 2, "label": "2", "parent": 0, "depth": 1, "status": "pending", "edgeType": "skip", "edgeLabel": "skip 1" },
      { "id": 3, "label": "1,2", "parent": 1, "depth": 2, "status": "active", "edgeType": "pick", "edgeLabel": "pick 2" }
    ],
    callStack: [
      { "call": "solve(0, [])", "status": "done" },
      { "call": "solve(1, [1])", "status": "active" },
      { "call": "solve(2, [1,2])", "status": "returning" }
    ],
    activeNodeId: 3,
    currentIndex: 2,
    currentTemp: "[1, 2]",
    decision: "Pick 3",
    problemLabel: "Subsets of [1,2,3]"
  }

  RECURSION STATE RULES:
  - treeNodes: ALL nodes in the recursion tree so far (grows each step as new calls are made)
  - Each node: id (integer), label (string showing current state/subset/temp), parent (id or null for root), depth (integer), status, edgeType, edgeLabel
  - status values: "active" (currently executing), "visiting" (on path), "returning" (backtracking), "visited" (completed), "result" (found a result), "pending" (not yet reached)
  - edgeType: "pick" (green arrow), "skip" (red arrow), "backtrack" (orange arrow), "default" (gray)
  - edgeLabel: short label on the edge, e.g. "pick 2", "skip 3", "backtrack"
  - callStack: CURRENT call stack from bottom to top — grows and shrinks as recursion goes deeper/returns
  - callStack[i].status: "done" (returned), "active" (current), "returning" (about to return), "pending"
  - activeNodeId: id of the node currently being executed
  - currentIndex: current index/position in the recursion
  - currentTemp: human-readable string of current temp array/state, e.g. "[1, 2]" or "Q . . ."
  - decision: what the algorithm is doing at this node, e.g. "Pick 3", "Skip 3", "Place Queen at (1,2)", "Backtrack"
  - problemLabel: short description like "Subsets of [1,2,3]" or "Permutations of [1,2,3]" or "N-Queens n=4"
  - Show the tree GROWING step by step — add new nodes each step as the recursion goes deeper
  - Show BACKTRACKING by changing a node's status from "active" to "returning", then removing it from callStack

- highlight should be an array of INTEGER indices (for arrays) or integer node IDs (for linked lists, trees, recursion) or string IDs (for graphs)

Return ONLY valid JSON, no markdown, no explanation outside JSON.`;

// ─── CODE PROMPT (dedicated call — generates clean, LeetCode-ready code only) ───
const CODE_PROMPT = `You are an expert competitive programmer. Given a DSA problem, generate ONLY clean LeetCode-style code.

Return JSON with exactly this shape:
{
  "code": {
    "cpp": "string — optimal C++ solution function only",
    "java": "string — optimal Java solution function only"
  },
  "brute_force_code": {
    "cpp": "string — naive C++ solution function only",
    "java": "string — naive Java solution function only"
  }
}

OPTIMAL CODE rules ("code"):
- The SINGLE BEST solution that passes all LeetCode test cases within time limits
- Think: what would a top-rated competitive programmer submit?
- Examples: Two Sum → single-pass hash map; Number of Islands → DFS sinking cells to '0'; 4Sum → sort + two-pointer reduction; Merge Intervals → sort + merge scan
- SHORT and CLEAN — 10-25 lines, minimal comments
- NEVER over-engineer: no lambdas for simple operations, no verbose data structures that do the same job a simpler type does
- Must pass within LeetCode time limits (O(n log n) or better where achievable)

BRUTE FORCE rules ("brute_force_code"):
- Naive, beginner-readable approach — typically nested loops or plain recursion
- DIFFERENT algorithm from optimal (e.g. O(n³) nested loops vs O(n²) two-pointer)
- Simple enough that a student sees the logic immediately

BOTH:
- LeetCode function-only: just function signature + implementation body
- NO main(), NO cin/cout, NO System.out, NO class wrapper for Java
- NO "intentionally inefficient" or "brute idea" comments — just clean code
- Minimal comments: 1-2 short inline notes max

Return ONLY valid JSON. No markdown, no backtick fences, no explanation.`;

router.post("/dsa/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { problem, customInput } = parsed.data;

  const analysisMessage = customInput
    ? `Problem: ${problem}\n\nCustom test case input: ${customInput}\n\nAnalyze this problem and use the custom input to generate visualization steps.`
    : `Problem: ${problem}\n\nAnalyze this problem and generate visualization steps using a representative example.`;

  const codeMessage = `Problem: ${problem}\n\nGenerate the optimal and brute force code solutions.`;

  try {
    // Run both calls in parallel — analysis (steps + explanations) and code generation
    const [analysisCompletion, codeCompletion] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: analysisMessage },
        ],
        response_format: { type: "json_object" },
      }),
      openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 2048,
        messages: [
          { role: "system", content: CODE_PROMPT },
          { role: "user", content: codeMessage },
        ],
        response_format: { type: "json_object" },
      }),
    ]);

    const rawAnalysis = analysisCompletion.choices[0]?.message?.content;
    const rawCode = codeCompletion.choices[0]?.message?.content;

    if (!rawAnalysis || !rawCode) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    let analysisData: any;
    let codeData: any;
    try {
      analysisData = JSON.parse(rawAnalysis);
      codeData = JSON.parse(rawCode);
    } catch {
      req.log.error({ rawAnalysis, rawCode }, "Failed to parse AI JSON response");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    const {
      pattern,
      difficulty,
      brute_force,
      optimal,
      steps,
      time_complexity,
      space_complexity,
      brute_force_time_complexity,
      brute_force_space_complexity,
    } = analysisData;

    const code = codeData.code ?? null;
    const brute_force_code = codeData.brute_force_code ?? null;

    if (!pattern || !difficulty || !brute_force || !optimal || !code || !steps) {
      req.log.error({ analysisData, codeData }, "Missing required fields in AI response");
      res.status(500).json({ error: "Incomplete AI response" });
      return;
    }

    const [saved] = await db
      .insert(analysesTable)
      .values({
        problem,
        pattern,
        difficulty,
        brute_force,
        optimal,
        code,
        steps,
      })
      .returning();

    res.json({
      id: saved.id,
      problem: saved.problem,
      pattern: saved.pattern,
      difficulty: saved.difficulty,
      brute_force: saved.brute_force,
      optimal: saved.optimal,
      code: saved.code,
      steps: saved.steps,
      createdAt: saved.createdAt.toISOString(),
      // New fields — returned directly from AI, not yet persisted in DB
      brute_force_code: brute_force_code ?? null,
      time_complexity: time_complexity ?? null,
      space_complexity: space_complexity ?? null,
      brute_force_time_complexity: brute_force_time_complexity ?? null,
      brute_force_space_complexity: brute_force_space_complexity ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error analyzing problem");
    res.status(500).json({ error: "Failed to analyze problem" });
  }
});

router.get("/dsa/history", async (req, res): Promise<void> => {
  const items = await db
    .select({
      id: analysesTable.id,
      problem: analysesTable.problem,
      pattern: analysesTable.pattern,
      difficulty: analysesTable.difficulty,
      createdAt: analysesTable.createdAt,
    })
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(50);

  res.json(
    items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }))
  );
});

router.get("/dsa/history/:id", async (req, res): Promise<void> => {
  const params = GetAnalysisByIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json({
    id: item.id,
    problem: item.problem,
    pattern: item.pattern,
    difficulty: item.difficulty,
    brute_force: item.brute_force,
    optimal: item.optimal,
    code: item.code,
    steps: item.steps,
    createdAt: item.createdAt.toISOString(),
  });
});

router.delete("/dsa/history/:id", async (req, res): Promise<void> => {
  const params = DeleteAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(analysesTable)
    .where(eq(analysesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/dsa/patterns", async (req, res): Promise<void> => {
  const results = await db
    .select({
      pattern: analysesTable.pattern,
      count: sql<number>`count(*)::int`,
    })
    .from(analysesTable)
    .groupBy(analysesTable.pattern)
    .orderBy(desc(sql`count(*)`));

  res.json(results);
});

export default router;

"""
BPR.REHAB - Ollama Code Review (Python)
READ-ONLY: generates report, changes nothing, zero cloud tokens
"""
import json, time, os, sys, urllib.request

PROJECT = r"c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space"
REPORT = os.path.join(PROJECT, "scripts", "review-report.md")
OLLAMA = "http://localhost:11434/api/chat"
MODEL = "qwen3-coder:30b"

FILES = [
    "middleware.ts",
    "lib/auth-options.ts",
    "lib/get-effective-user.ts",
    "components/body-assessment/body-metrics-tab.tsx",
    "app/dashboard/body-assessments/page.tsx",
    "app/admin/body-assessments/page.tsx",
]

SYSTEM = """You are a senior code reviewer for a Next.js clinical system (bpr.rehab).
Review the code and report ONLY:
1. BUGS (with approximate line numbers)
2. SECURITY issues
3. CRITICAL performance problems
4. Rating X/10
Be concise - max 20 lines per file. Skip style opinions. Respond in English."""

os.chdir(PROJECT)

# Write report header
with open(REPORT, "w", encoding="utf-8") as f:
    f.write(f"# BPR.REHAB - Code Review Report\n")
    f.write(f"- **Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write(f"- **Reviewer:** Ollama {MODEL} (local, offline)\n")
    f.write(f"- **Mode:** READ-ONLY (no changes applied)\n\n")

print("\n============================================")
print("  Ollama Code Review")
print(f"  Model: {MODEL}")
print("============================================\n")

total_start = time.time()

for i, filepath in enumerate(FILES):
    num = f"[{i+1}/{len(FILES)}]"
    
    if not os.path.exists(filepath):
        print(f"  {num} SKIP {filepath} (not found)")
        continue
    
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
    
    line_count = len(lines)
    
    # Truncate large files: first 300 + last 100 lines
    if line_count > 400:
        head = "".join(lines[:300])
        tail = "".join(lines[-100:])
        code = head + f"\n// ... TRUNCATED ({line_count} total lines) ...\n" + tail
        trunc = f" (truncated {line_count}->400)"
    else:
        code = "".join(lines)
        trunc = ""
    
    print(f"  {num} {filepath} ({line_count} lines{trunc}) ...", end="", flush=True)
    
    start = time.time()
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Review this file: {filepath}\n\n```typescript\n{code}\n```"}
        ],
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 700
        }
    }
    
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(OLLAMA, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=600) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            review = result.get("message", {}).get("content", "No response")
    except Exception as e:
        review = f"ERROR: {e}"
    
    elapsed = int(time.time() - start)
    print(f" done ({elapsed}s)")
    
    with open(REPORT, "a", encoding="utf-8") as f:
        f.write(f"\n---\n## {filepath}\n")
        f.write(f"- **Lines:** {line_count} | **Time:** {elapsed}s\n\n")
        f.write(f"{review}\n\n")

total = int(time.time() - total_start)

with open(REPORT, "a", encoding="utf-8") as f:
    f.write(f"\n---\n## Summary\n")
    f.write(f"- **Total time:** {total}s\n")
    f.write(f"- **Files reviewed:** {len(FILES)}\n")
    f.write(f"- **Zero cloud tokens used**\n")

print(f"\n=== Done! ({total}s) ===")
print(f"Report: scripts\\review-report.md")

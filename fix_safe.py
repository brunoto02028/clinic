import re, os

base = '/root/clinic'
skip = {'node_modules', '.next', '.git'}

def fix_file(fpath):
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    changed = False
    new_lines = []
    for line in lines:
        orig = line
        # Remove framer-motion import lines entirely
        if re.match(r"^\s*import\s+.*from\s+['\"]framer-motion['\"]\s*;?\s*$", line):
            line = ''
            changed = True
        else:
            # Replace <motion.TAG attrs> where the whole tag is on one line
            # Pattern: <motion.word followed by anything then > at end of tag (not crossing lines)
            line = re.sub(r'<motion\.([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>',
                          lambda m: f'<{m.group(1)}>', line)
            # Replace </motion.TAG>
            line = re.sub(r'</motion\.([a-zA-Z][a-zA-Z0-9]*)>', r'</\1>', line)
            # Remove AnimatePresence tags (single line)
            line = re.sub(r'<AnimatePresence[^>]*>', '', line)
            line = re.sub(r'</AnimatePresence>', '', line)
            if line != orig:
                changed = True
        new_lines.append(line)

    if changed:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        return True
    return False

fixed = []
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        fpath = os.path.join(root, fname)
        if fix_file(fpath):
            fixed.append(fpath)

print(f"Fixed {len(fixed)} files")

# Verify
print("\n=== Remaining framer-motion imports ===")
found = False
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            c = f.read()
        if 'framer-motion' in c:
            print(f"  STILL HAS: {fpath}")
            found = True
if not found:
    print("  NONE - all clean!")

# Check for remaining motion. usage (could be multiline tags not fixed)
print("\n=== Files with remaining motion. usage ===")
found2 = False
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            if 'motion.' in line and 'framer' not in line:
                print(f"  {fpath}:{i}: {line.rstrip()}")
                found2 = True
if not found2:
    print("  NONE - all clean!")

import re, os

base = '/root/clinic'
skip = {'node_modules', '.next', '.git'}

for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            c = f.read()
        if 'framer-motion' not in c and 'motion.' not in c:
            continue
        orig = c
        # Remove all framer-motion imports
        c = re.sub(r"^import\s+.*?from\s+['\"]framer-motion['\"]\s*;?\s*\n", '', c, flags=re.MULTILINE)
        # Replace all motion.X opening tags (multiline safe)
        c = re.sub(r'<motion\.[a-zA-Z0-9]+(?:\s[^>]*)?>',  '<div>', c, flags=re.DOTALL)
        # Replace all motion.X closing tags
        c = re.sub(r'</motion\.[a-zA-Z0-9]+>', '</div>', c)
        # Remove AnimatePresence
        c = re.sub(r'<AnimatePresence[^>]*>', '', c)
        c = re.sub(r'</AnimatePresence>', '', c)
        if c != orig:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(c)
            remaining = c.count('framer-motion')
            print(f"Fixed: {fpath} (framer-motion refs left: {remaining})")

# Final verification
print("\n=== Files still with framer-motion ===")
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

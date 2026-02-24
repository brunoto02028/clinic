import re, os

base = '/root/clinic'
skip = {'node_modules', '.next', '.git'}

def fix_content(c):
    # Remove framer-motion imports
    c = re.sub(r'^[ \t]*import\s+.*?from\s+["\']framer-motion["\']\s*;?\s*\n', '', c, flags=re.MULTILINE)

    # Replace multiline <motion.TAG ...attrs...> with <div>
    # Strategy: find <motion. then consume until the matching > that closes the opening tag
    # We need to handle nested < > inside attribute values (e.g. JSX expressions)
    # Simple approach: find <motion.WORD, then find the next > that is NOT inside {}
    result = []
    i = 0
    while i < len(c):
        # Look for <motion.
        m = re.search(r'<motion\.([a-zA-Z][a-zA-Z0-9]*)', c[i:])
        if not m:
            result.append(c[i:])
            break
        
        start = i + m.start()
        result.append(c[i:start])
        
        tag_name = m.group(1)
        # Now find the closing > of this opening tag
        # Skip past <motion.TAG
        pos = start + len(m.group(0))
        
        # Scan forward to find the closing > of the opening tag
        # Track brace depth to skip JSX expressions like onClick={() => ...}
        brace_depth = 0
        found_close = False
        while pos < len(c):
            ch = c[pos]
            if ch == '{':
                brace_depth += 1
            elif ch == '}':
                brace_depth -= 1
            elif ch == '>' and brace_depth == 0:
                # Check if self-closing />
                if pos > 0 and c[pos-1] == '/':
                    result.append(f'<{tag_name} />')
                else:
                    result.append(f'<{tag_name}>')
                pos += 1
                found_close = True
                break
            pos += 1
        
        if not found_close:
            # Couldn't find close, output as-is
            result.append(c[start:pos])
        
        i = pos
    
    c = ''.join(result)
    
    # Replace closing tags </motion.TAG> -> </TAG>
    c = re.sub(r'</motion\.([a-zA-Z][a-zA-Z0-9]*)>', r'</\1>', c)
    
    # Remove AnimatePresence
    c = re.sub(r'<AnimatePresence[^>]*>', '', c)
    c = re.sub(r'</AnimatePresence>', '', c)
    
    return c

fixed = []
errors = []

for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                orig = f.read()
        except Exception as e:
            errors.append(f"Read {fpath}: {e}")
            continue
        
        if 'framer-motion' not in orig and 'motion.' not in orig:
            continue
        
        try:
            fixed_content = fix_content(orig)
        except Exception as e:
            errors.append(f"Fix {fpath}: {e}")
            continue
        
        if fixed_content != orig:
            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                fixed.append(fpath)
            except Exception as e:
                errors.append(f"Write {fpath}: {e}")

print(f"Fixed {len(fixed)} files")
if errors:
    print(f"Errors: {errors}")

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

print("\n=== Remaining motion. tags ===")
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
            if re.search(r'</?motion\.', line):
                print(f"  {fpath}:{i}: {line.rstrip()[:80]}")
                found2 = True
if not found2:
    print("  NONE - all clean!")

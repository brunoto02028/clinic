import re, os

base = r'c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space'
skip = {'node_modules', '.next', '.git'}

def fix_content(c):
    # Remove framer-motion imports
    c = re.sub(r'^[ \t]*import\s+.*?from\s+["\']framer-motion["\']\s*;?\s*\n', '', c, flags=re.MULTILINE)

    # Replace multiline <motion.TAG ...attrs...> with <TAG>
    result = []
    i = 0
    while i < len(c):
        m = re.search(r'<motion\.([a-zA-Z][a-zA-Z0-9]*)', c[i:])
        if not m:
            result.append(c[i:])
            break
        
        start = i + m.start()
        result.append(c[i:start])
        tag_name = m.group(1)
        pos = start + len(m.group(0))
        
        brace_depth = 0
        found_close = False
        while pos < len(c):
            ch = c[pos]
            if ch == '{':
                brace_depth += 1
            elif ch == '}':
                brace_depth -= 1
            elif ch == '>' and brace_depth == 0:
                if pos > 0 and c[pos-1] == '/':
                    result.append(f'<{tag_name} />')
                else:
                    result.append(f'<{tag_name}>')
                pos += 1
                found_close = True
                break
            pos += 1
        
        if not found_close:
            result.append(c[start:pos])
        i = pos
    
    c = ''.join(result)
    c = re.sub(r'</motion\.([a-zA-Z][a-zA-Z0-9]*)>', r'</\1>', c)
    c = re.sub(r'<AnimatePresence[^>]*>', '', c)
    c = re.sub(r'</AnimatePresence>', '', c)
    
    return c

fixed = []
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                orig = f.read()
        except:
            continue
        
        if 'framer-motion' not in orig and 'motion.' not in orig:
            continue
        
        new_content = fix_content(orig)
        if new_content != orig:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            fixed.append(fpath)

print(f"Fixed {len(fixed)} files:")
for f in fixed:
    print(f"  {f}")

# Verify
print("\nRemaining framer-motion imports:")
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

print("\nRemaining motion. tags:")
found2 = False
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        for li, line in enumerate(lines, 1):
            if re.search(r'</?motion\.', line):
                print(f"  {fpath}:{li}: {line.rstrip()[:80]}")
                found2 = True
if not found2:
    print("  NONE - all clean!")

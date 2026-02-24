import re
import os

base = '/root/clinic'
extensions = ('.tsx', '.ts')
skip_dirs = {'node_modules', '.next', '.git'}

fixed = []
errors = []

for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fname in files:
        if not fname.endswith(extensions):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            errors.append(f"Read error {fpath}: {e}")
            continue

        if 'framer-motion' not in content:
            continue

        original = content

        # Remove import line(s) for framer-motion
        content = re.sub(r'^import\s+\{[^}]*\}\s+from\s+["\']framer-motion["\'];\s*\n', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\*\s+as\s+\w+\s+from\s+["\']framer-motion["\'];\s*\n', '', content, flags=re.MULTILINE)

        # Replace <motion.div ...multiline attrs...> with <div>
        content = re.sub(r'<motion\.div\b[^>]*>', '<div>', content, flags=re.DOTALL)
        # Replace <motion.span ...> with <span>
        content = re.sub(r'<motion\.span\b[^>]*>', '<span>', content, flags=re.DOTALL)
        # Replace <motion.section ...> with <section>
        content = re.sub(r'<motion\.section\b[^>]*>', '<section>', content, flags=re.DOTALL)
        # Replace <motion.p ...> with <p>
        content = re.sub(r'<motion\.p\b[^>]*>', '<p>', content, flags=re.DOTALL)
        # Replace <motion.h1/h2/h3 ...> 
        content = re.sub(r'<motion\.(h[1-6])\b[^>]*>', r'<\1>', content, flags=re.DOTALL)
        # Replace <motion.ul/li/a/button ...>
        content = re.sub(r'<motion\.(ul|li|a|button|form|header|footer|nav|article|aside|main)\b[^>]*>', r'<\1>', content, flags=re.DOTALL)
        # Replace </motion.X> closing tags
        content = re.sub(r'</motion\.\w+>', lambda m: '</' + m.group(0).split('.')[1], content)

        # Remove AnimatePresence wrapper (keep children)
        content = re.sub(r'<AnimatePresence[^>]*>', '', content)
        content = re.sub(r'</AnimatePresence>', '', content)

        # Remove useAnimation, useInView, useMotionValue etc calls that are now unused
        # (just remove the import, leave usage — won't crash without import since motion is gone)

        if content != original:
            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(content)
                remaining = content.count('motion')
                fixed.append(f"{fpath} (remaining motion refs: {remaining})")
            except Exception as e:
                errors.append(f"Write error {fpath}: {e}")

print(f"\nFixed {len(fixed)} files:")
for f in fixed:
    print(f"  {f}")

if errors:
    print(f"\nErrors ({len(errors)}):")
    for e in errors:
        print(f"  {e}")

# Final check
print("\nFiles still with framer-motion import:")
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fname in files:
        if not fname.endswith(extensions):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                c = f.read()
            if 'framer-motion' in c:
                print(f"  STILL HAS: {fpath}")
        except:
            pass
print("Done.")

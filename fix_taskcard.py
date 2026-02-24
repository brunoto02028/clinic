import re

files = [
    '/root/clinic/components/ui/task-card.tsx',
]
for fpath in files:
    with open(fpath, 'r') as f:
        c = f.read()
    c = re.sub(r"^import\s+\{[^}]*\}\s+from\s+['\"]framer-motion['\"]\;\s*\n", '', c, flags=re.MULTILINE)
    c = re.sub(r'<motion\.\w+\b[^>]*>', '<div>', c, flags=re.DOTALL)
    c = re.sub(r'</motion\.\w+>', '</div>', c)
    with open(fpath, 'w') as f:
        f.write(c)
    print(fpath, 'motion refs:', c.count('motion'))

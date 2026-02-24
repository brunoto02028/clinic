import re

with open('/root/clinic/components/landing-page.tsx', 'r') as f:
    content = f.read()

# Remove framer-motion import
content = re.sub(r"import \{ motion \} from ['\"]framer-motion['\"];\n", '', content)

# Replace <motion.div ...attributes... > with <div> (handles multiline attributes)
content = re.sub(r'<motion\.div\b[^>]*>', '<div>', content, flags=re.DOTALL)

# Replace </motion.div> with </div>
content = content.replace('</motion.div>', '</div>')

with open('/root/clinic/components/landing-page.tsx', 'w') as f:
    f.write(content)

# Verify
remaining = content.count('motion')
print(f'Remaining motion references: {remaining}')
if remaining > 0:
    for i, line in enumerate(content.split('\n'), 1):
        if 'motion' in line:
            print(f'  Line {i}: {line[:100]}')

f = 'src/components/LynoraLinkFeed.jsx'
with open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

changed = 0
for i, line in enumerate(lines):
    if 'className="lynora-grid"' in line and 'lynora-feed-container' not in line:
        lines[i] = line.replace('className="lynora-grid"', 'className="lynora-grid lynora-feed-container"')
        changed += 1

with open(f, 'w', encoding='utf-8') as fh:
    fh.writelines(lines)

print(f'changed {changed} lines')

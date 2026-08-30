f = 'src/components/LynoraLinkFeed.jsx'
with open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

replacements = {
    'padding: "84px 20px 60px"': '',
}

changed = 0
for i, line in enumerate(lines):
    if 'padding: "84px 20px 60px"' in line and 'lynora-feed-container' not in line:
        # Remove the padding and add the class
        lines[i] = line.replace('padding: "84px 20px 60px", ', '').replace('padding: "84px 20px 60px"', '')
        if 'className=' in lines[i]:
            lines[i] = lines[i].replace('className="lynora-grid"', 'className="lynora-grid lynora-feed-container"')
        else:
            # Insert className before the closing >
            lines[i] = lines[i].replace('>', ' className="lynora-feed-container">', 1)
        changed += 1

with open(f, 'w', encoding='utf-8') as fh:
    fh.writelines(lines)

print(f'changed {changed} lines')

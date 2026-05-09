import os

path = r"c:\Users\hp\Downloads\Agent Skills\tabcraft\src\components\TabViewer.jsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'key={col.id || `fallback-${index}`}' in line:
        indent = line[:line.find('key=')]
        new_lines.append(line)
        new_lines.append(f"{indent}data-col-index={{index}}\n")
    else:
        new_lines.append(line)

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

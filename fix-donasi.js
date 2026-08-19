import re
with open('supabase-data.js', 'rb') as f:
    content = f.read()

# Find and replace the conditional donasi query
# Old: isAdmin ? sb.from("donasi")... : Promise.resolve({ data: [], error: null })
# New: sb.from("donasi")... (always load)

old_pattern = rb'(isAdmin\s*\n\t\t\t\t\?\s*sb\.from\("donasi"\)\.select\("\*"\)\.order\("created_at",\{ascending:false\}\)\.limit\(50\))\s*\n\t\t\t\t:\s*Promise\.resolve\(\{\s*data:\s*\[\],\s*error:\s*null\s*\}\)'

if re.search(old_pattern, content):
    new_text = rb'\1'
    content = re.sub(old_pattern, new_text, content)
    with open('supabase-data.js', 'wb') as f:
        f.write(content)
    print('Fixed: donasi now loads for all users')
else:
    print('Pattern not found, trying alternative...')
    # Try simpler replacement
    content = content.replace(
        b'isAdmin\n\t\t\t\t? sb.from("donasi").select("*").order("created_at",{ascending:false}).limit(50)\n\t\t\t\t: Promise.resolve({ data: [], error: null })',
        b'sb.from("donasi").select("*").order("created_at",{ascending:false}).limit(50)'
    )
    with open('supabase-data.js', 'wb') as f:
        f.write(content)
    print('Fixed using alternative method')

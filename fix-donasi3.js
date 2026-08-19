import re
with open('supabase-data.js', 'rb') as f:
    content = f.read()

# Find and replace the donasi query part
# The pattern uses tabs for indentation
old = b'isAdmin\n\t\t\t\t? sb.from("donasi").select("*").order("created_at",{ascending:false}).limit(50)\n\t\t\t\t: Promise.resolve({ data: [], error: null })'
new = b'sb.from("donasi").select("*").order("created_at",{ascending:false}).limit(50)'

if old in content:
    content = content.replace(old, new)
    with open('supabase-data.js', 'wb') as f:
        f.write(content)
    print('SUCCESS: Donasi now loads for all users')
else:
    print('FAILED: Pattern not found')
    # Try to find what we have
    idx = content.find(b'"donasi"')
    if idx > 0:
        print(f'Found donasi at {idx}')
        print(repr(content[idx-80:idx+200]))

import re
with open('supabase-data.js', 'rb') as f:
    content = f.read()

# Find the exact pattern around donasi query
# We need to replace the entire conditional
old = b'isAdmin\n\t\t\t\t? sb.from("donasi").select("*").order("created_at",{ascending:false}).limit(50)\n\t\t\t\t: Promise.resolve({ data: [], error: null }),'
new = b'sb.from("donasi").select("*").order("created_at",{ascending:false}).limit(50),'

if old in content:
    content = content.replace(old, new)
    with open('supabase-data.js', 'wb') as f:
        f.write(content)
    print('SUCCESS: Replaced donasi conditional')
else:
    print('FAILED: Pattern not found')
    # Debug: show what we have around that area
    idx = content.find(b'donasi').select
    if idx > 0:
        print(f'Found at {idx}:')
        print(content[idx-50:idx+200])

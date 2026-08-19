import re
with open('supabase-data.js', 'rb') as f:
    content = f.read()

# Replace the medals line (handles UTF-8 encoded emojis or ?? corruption)
pattern = rb'var medals = \[.*?\];'
match = re.search(pattern, content)
if match:
    print(f'Found: {match.group()}')
    new_line = b'var medals = ["1","2","3"];'
    content = content[:match.start()] + new_line + content[match.end():]
    with open('supabase-data.js', 'wb') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Pattern not found')

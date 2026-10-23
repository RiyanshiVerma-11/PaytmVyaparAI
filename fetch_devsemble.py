import urllib.request
import json
import re

# Let's inspect Devsemble API endpoints
# Devsemble usually has endpoints like /api/hackathons/... or /api/v1/...
slug = "Paytm Build for India AI Hackathon – Delhi -by-paytm"
encoded_slug = urllib.parse.quote(slug)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

test_urls = [
    f"https://devsemble.com/api/hackathons/by-slug/{encoded_slug}",
    f"https://devsemble.com/api/hackathons/{encoded_slug}",
    f"https://devsemble.com/api/hackathon/{encoded_slug}",
    f"https://devsemble.com/api/hackathons/slug/{encoded_slug}",
    "https://devsemble.com/api/hackathons",
]

for u in test_urls:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read().decode('utf-8')
            print(f"SUCCESS: {u} (len: {len(data)})")
            with open("api_dump.json", "w", encoding="utf-8") as f:
                f.write(data)
            break
    except Exception as e:
        print(f"Failed {u}: {e}")

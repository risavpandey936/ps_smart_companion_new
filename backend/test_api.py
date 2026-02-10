import requests
import json
import os

url = "http://localhost:8000/api/chat"
headers = {"Content-Type": "application/json"}
data = {
    "query": "clean drawer",
    "condition_context": "general"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

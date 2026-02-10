import requests
import json

base_url = "http://localhost:8000/api"

def test_auth():
    print("--- 🧪 Testing Authentication Flow ---")
    
    # 1. Register a test user
    print("\n1. Registering user...")
    reg_data = {"username": "testuser_auth", "password": "password123"}
    try:
        response = requests.post(f"{base_url}/register", json=reg_data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Registration failed: {e}")

    # 2. Login
    print("\n2. Logging in...")
    login_data = {"username": "testuser_auth", "password": "password123"}
    try:
        response = requests.post(f"{base_url}/login", data=login_data)
        print(f"Status: {response.status_code}")
        res_json = response.json()
        token = res_json.get("access_token")
        print(f"Token Received: {token[:15]}...")
        
        # 3. Test Protected Endpoint
        print("\n3. Testing Protected Chat Endpoint...")
        headers = {"Authorization": f"Bearer {token}"}
        chat_data = {"query": "Hello", "condition_context": "general"}
        response = requests.post(f"{base_url}/chat", json=chat_data, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json().get('response')[:50]}...")
        
        return True
    except Exception as e:
        print(f"Login or Chat failed: {e}")
        return False

if __name__ == "__main__":
    test_auth()

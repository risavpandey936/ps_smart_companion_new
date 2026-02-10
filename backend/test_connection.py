import urllib.request
import json

def test_backend():
    """Test if backend is running and responding"""
    try:
        # Test root endpoint
        print("Testing backend root endpoint...")
        with urllib.request.urlopen('http://localhost:8000/') as response:
            data = json.loads(response.read().decode())
            print(f"✓ Backend is running: {data}")
            return True
    except Exception as e:
        print(f"✗ Backend connection failed: {e}")
        return False

def test_chat_endpoint():
    """Test the chat endpoint"""
    try:
        print("\nTesting /api/chat endpoint...")
        data = json.dumps({
            "query": "Hello, can you help me?",
            "condition_context": "general"
        }).encode('utf-8')
        
        req = urllib.request.Request(
            'http://localhost:8000/api/chat',
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            print(f"✓ Chat endpoint working!")
            print(f"  Response: {result.get('response', '')[:100]}...")
            return True
    except Exception as e:
        print(f"✗ Chat endpoint failed: {e}")
        return False

def test_breakdown_endpoint():
    """Test the breakdown-task endpoint"""
    try:
        print("\nTesting /api/breakdown-task endpoint...")
        data = json.dumps({
            "task_description": "Clean my room"
        }).encode('utf-8')
        
        req = urllib.request.Request(
            'http://localhost:8000/api/breakdown-task',
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            print(f"✓ Breakdown endpoint working!")
            print(f"  Steps returned: {len(result.get('steps', []))} steps")
            if result.get('steps'):
                print(f"  First step: {result['steps'][0]}")
            return True
    except Exception as e:
        print(f"✗ Breakdown endpoint failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("BACKEND CONNECTION TEST")
    print("=" * 60)
    
    backend_ok = test_backend()
    if backend_ok:
        chat_ok = test_chat_endpoint()
        breakdown_ok = test_breakdown_endpoint()
        
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Backend Running: {'✓' if backend_ok else '✗'}")
        print(f"Chat Endpoint: {'✓' if chat_ok else '✗'}")
        print(f"Breakdown Endpoint: {'✓' if breakdown_ok else '✗'}")
        print("=" * 60)
    else:
        print("\n⚠ Backend is not running. Please start it with: python main.py")

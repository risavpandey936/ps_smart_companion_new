import urllib.request
import json

def test_chat_detailed():
    """Test the chat endpoint with detailed error reporting"""
    try:
        print("Testing /api/chat endpoint with detailed error reporting...")
        print("-" * 60)
        
        data = json.dumps({
            "query": "Hello, can you help me organize my day?",
            "condition_context": "general"
        }).encode('utf-8')
        
        req = urllib.request.Request(
            'http://localhost:8000/api/chat',
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        print("Sending request to backend...")
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            print("\n✅ SUCCESS! Chat endpoint is working!")
            print("-" * 60)
            print(f"AI Response:\n{result.get('response', 'No response')}")
            print("-" * 60)
            return True
            
    except urllib.error.HTTPError as e:
        print(f"\n❌ HTTP Error {e.code}: {e.reason}")
        try:
            error_body = e.read().decode()
            print(f"Error details: {error_body}")
        except:
            pass
        return False
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")
        return False

def test_breakdown_detailed():
    """Test the breakdown-task endpoint with detailed error reporting"""
    try:
        print("\n\nTesting /api/breakdown-task endpoint...")
        print("-" * 60)
        
        data = json.dumps({
            "task_description": "Clean and organize my bedroom"
        }).encode('utf-8')
        
        req = urllib.request.Request(
            'http://localhost:8000/api/breakdown-task',
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        print("Sending request to backend...")
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            print("\n✅ SUCCESS! Breakdown endpoint is working!")
            print("-" * 60)
            steps = result.get('steps', [])
            print(f"Task broken down into {len(steps)} steps:")
            for i, step in enumerate(steps, 1):
                print(f"  {i}. {step}")
            print("-" * 60)
            return True
            
    except urllib.error.HTTPError as e:
        print(f"\n❌ HTTP Error {e.code}: {e.reason}")
        try:
            error_body = e.read().decode()
            print(f"Error details: {error_body}")
        except:
            pass
        return False
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("DETAILED API ENDPOINT TEST")
    print("=" * 60)
    print()
    
    # Test backend is running
    try:
        with urllib.request.urlopen('http://localhost:8000/') as response:
            data = json.loads(response.read().decode())
            print(f"✅ Backend is running: {data.get('message')}")
            print()
    except Exception as e:
        print(f"❌ Backend is not running: {e}")
        print("Please start the backend with: uvicorn main:app --reload")
        exit(1)
    
    # Test endpoints
    chat_ok = test_chat_detailed()
    breakdown_ok = test_breakdown_detailed()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Chat Endpoint:      {'✅ WORKING' if chat_ok else '❌ FAILED'}")
    print(f"Breakdown Endpoint: {'✅ WORKING' if breakdown_ok else '❌ FAILED'}")
    print("=" * 60)
    
    if chat_ok and breakdown_ok:
        print("\n🎉 All tests passed! Your application is fully functional!")
        print("\n📱 You can now open the frontend at: http://localhost:5173/")
    else:
        print("\n⚠️  Some tests failed. Please check the error messages above.")
        print("Common issues:")
        print("  - Invalid or expired Groq API key")
        print("  - Network connectivity issues")
        print("  - Backend not properly configured")

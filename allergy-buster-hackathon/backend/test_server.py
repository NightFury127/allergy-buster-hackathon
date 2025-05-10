import requests
import time
import sys

def wait_for_server(url="http://localhost:8000", max_retries=5, delay=2):
    """Wait for the server to become available."""
    for i in range(max_retries):
        try:
            response = requests.get(f"{url}/api/chatbot/test-env/")
            if response.status_code == 200:
                print("Server is running!")
                return True
        except requests.exceptions.ConnectionError:
            print(f"Waiting for server to start... (attempt {i+1}/{max_retries})")
            time.sleep(delay)
    return False

def test_server_health():
    """Test the server's health endpoints."""
    base_url = "http://localhost:8000"
    
    # Test environment endpoint
    try:
        response = requests.get(f"{base_url}/api/chatbot/test-env/")
        print("\nTesting environment endpoint:")
        print("-" * 50)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Response:")
            print(f"Debug mode: {data.get('debug')}")
            print(f"Secret key set: {data.get('secret_key_set')}")
            print(f"Model loaded: {data.get('model_loaded')}")
    except Exception as e:
        print(f"Error testing environment endpoint: {str(e)}")
        return False

    # Test chat endpoint
    try:
        response = requests.post(
            f"{base_url}/api/chatbot/chat/",
            json={"message": "Hello"},
            headers={"Content-Type": "application/json"}
        )
        print("\nTesting chat endpoint:")
        print("-" * 50)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Response:")
            print(f"Status: {data.get('status')}")
            print(f"Reply: {data.get('reply')}")
    except Exception as e:
        print(f"Error testing chat endpoint: {str(e)}")
        return False

    return True

if __name__ == "__main__":
    print("Testing server status...")
    if wait_for_server():
        if test_server_health():
            print("\nAll tests passed! Server is running correctly.")
            sys.exit(0)
        else:
            print("\nSome tests failed. Please check the server logs.")
            sys.exit(1)
    else:
        print("\nServer failed to start. Please check the server logs.")
        sys.exit(1) 
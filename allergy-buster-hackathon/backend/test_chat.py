import requests
import json
import time

def test_chat(message="What are the symptoms of peanut allergy?"):
    """Test the chat endpoint with a sample message."""
    url = "http://localhost:8000/api/chatbot/chat/"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "message": message
    }
    
    try:
        print(f"\nTesting chat with message: {message}")
        print("-" * 50)
        
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Response:")
            print(f"Status: {result.get('status')}")
            print(f"Reply: {result.get('reply')}")
            print(f"Chat ID: {result.get('chat_id')}")
        else:
            print(f"Error Response: {json.dumps(response.json(), indent=2)}")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is it running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def test_empty_message():
    """Test the chat endpoint with an empty message."""
    test_chat("")

def test_invalid_json():
    """Test the chat endpoint with invalid JSON data."""
    url = "http://localhost:8000/api/chatbot/chat/"
    headers = {
        "Content-Type": "application/json"
    }
    data = "invalid json"
    
    try:
        print("\nTesting with invalid JSON data")
        print("-" * 50)
        
        response = requests.post(url, headers=headers, data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(2)
    
    # Run tests
    test_chat()
    test_empty_message()
    test_invalid_json() 
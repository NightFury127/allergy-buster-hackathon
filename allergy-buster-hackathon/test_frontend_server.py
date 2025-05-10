import requests
import sys

def test_frontend_server():
    """Test if the frontend server is running on port 8080."""
    try:
        response = requests.get("http://localhost:8080")
        print(f"Frontend server status: {response.status_code}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("Frontend server is not running on port 8080")
        return False

def test_backend_server():
    """Test if the backend server is running on port 8000."""
    try:
        response = requests.get("http://localhost:8000/api/chatbot/test-env/")
        print(f"Backend server status: {response.status_code}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("Backend server is not running on port 8000")
        return False

if __name__ == "__main__":
    frontend_running = test_frontend_server()
    backend_running = test_backend_server()
    
    if frontend_running and backend_running:
        print("Both servers are running correctly")
        sys.exit(0)
    else:
        print("Server check failed")
        sys.exit(1)

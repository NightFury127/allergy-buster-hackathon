import os
import requests
import json

def test_django_env():
    """Test the Django environment variables and API connection."""
    print("Testing Django environment variables:")
    print("-" * 30)
    
    # Test environment variables
    print(f"DEBUG: {os.getenv('DEBUG', 'Not set')}")
    print(f"SECRET_KEY: {'✓ Set' if os.getenv('SECRET_KEY') else '✗ Not set'}")
    print(f"Django DEBUG mode: {'✓ Enabled' if os.getenv('DEBUG') == 'True' else '✗ Disabled'}")
    
    # Test API connection
    try:
        response = requests.get("http://localhost:8000/api/chatbot/test-env/")
        if response.status_code == 200:
            data = response.json()
            print("\nAPI Test Results:")
            print(f"Model loaded: {'✓ Yes' if data.get('model_loaded') else '✗ No'}")
            print(f"Debug mode: {'✓ Enabled' if data.get('django_debug') else '✗ Disabled'}")
        else:
            print("\n✗ API test failed with status code:", response.status_code)
    except requests.exceptions.ConnectionError:
        print("\n✗ Could not connect to the API. Is the server running?")

if __name__ == "__main__":
    test_django_env() 
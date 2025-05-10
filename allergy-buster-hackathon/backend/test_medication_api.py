import requests
import json

def test_medication_api():
    """Test the medication API endpoint with a sample medication."""
    url = "http://localhost:8000/api/chatbot/medication/"
    
    # Test with a common allergy medication
    params = {
        "name": "Cetirizine"
    }
    
    try:
        print(f"\nTesting medication API with: {params['name']}")
        print("-" * 50)
        
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Response:")
            print(json.dumps(result, indent=2))
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_medication_api()
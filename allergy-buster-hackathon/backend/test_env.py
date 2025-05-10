import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test environment variables
print("Testing environment variables:")
print("-" * 30)

# Test OPENAI_API_KEY
openai_key = os.getenv("OPENAI_API_KEY")
print(f"OPENAI_API_KEY: {'✓ Set' if openai_key else '✗ Not set'}")

# Test DEBUG
debug = os.getenv("DEBUG")
print(f"DEBUG: {debug}")

# Test SECRET_KEY
secret_key = os.getenv("SECRET_KEY")
print(f"SECRET_KEY: {'✓ Set' if secret_key else '✗ Not set'}")

# Test if we can access the OpenAI API
if openai_key:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        print("\nTesting OpenAI API connection...")
        # Try to make a simple API call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        print("✓ OpenAI API connection successful!")
    except Exception as e:
        print(f"✗ OpenAI API connection failed: {str(e)}")
else:
    print("\nSkipping OpenAI API test - API key not set") 
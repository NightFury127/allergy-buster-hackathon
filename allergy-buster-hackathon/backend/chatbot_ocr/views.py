# Chat and OCR views
import os
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import ChatMessage, OCRScan
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer
import pytesseract
from PIL import Image
import io
import torch
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import ChatMessageSerializer
import requests

# Global variables for model and generator
model = None
generator = None

# Load Mistral AI API key from APIKeys.txt
with open(os.path.join(os.path.dirname(__file__), '..', 'core_api', 'APIKeys.txt'), 'r') as f:
    mistral_api_key = f.read().strip().split(':')[1].strip()

def initialize_model():
    """Initialize the Hugging Face model and generator."""
    global model, generator
    if model is None:
        try:
            model_name = "facebook/blenderbot-400M-distill"
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForCausalLM.from_pretrained(model_name)
            generator = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                max_length=100,
                num_return_sequences=1,
                temperature=0.7
            )
            return True
        except Exception as e:
            print(f"Error initializing model: {str(e)}")
            return False
    return True

@csrf_exempt
@require_http_methods(["GET"])
def test_env(request):
    """Test endpoint to verify environment variables."""
    model_loaded = initialize_model()
    return JsonResponse({
        'debug': os.getenv("DEBUG"),
        'secret_key_set': bool(os.getenv("SECRET_KEY")),
        'django_debug': os.getenv("DEBUG") == "True",
        'model_loaded': model_loaded
    })

@api_view(['POST'])
def chat_api(request):
    user_message = request.data.get('message', '')
    if not user_message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Call Mistral AI API for chat completions
    headers = {
        'Authorization': f'Bearer {mistral_api_key}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': 'mistral-small',  # Specify the model to use
        'messages': [{'role': 'user', 'content': user_message}],
        'max_tokens': 100
    }
    response = requests.post('https://api.mistral.ai/v1/chat/completions', headers=headers, json=data)
    
    if response.status_code == 200:
        ai_response = response.json().get('choices', [{}])[0].get('message', {}).get('content', 'No response from AI')
    else:
        ai_response = 'Error: Could not get response from Mistral AI'
    
    # Save the chat message
    chat_message = ChatMessage.objects.create(
        user=request.user,
        message=user_message,
        response=ai_response
    )
    serializer = ChatMessageSerializer(chat_message)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@csrf_exempt
@require_http_methods(["POST"])
def ocr_api(request):
    """Handle OCR scan requests using pytesseract."""
    try:
        # Check if an image file is uploaded
        if 'image' not in request.FILES:
            return JsonResponse({
                'status': 'error',
                'message': 'No image file provided'
            }, status=400)
        
        image_file = request.FILES['image']
        image = Image.open(io.BytesIO(image_file.read()))
        
        # Extract text using pytesseract
        raw_text = pytesseract.image_to_string(image)
        
        # Save the OCR scan
        scan = OCRScan.objects.create(
            raw_text=raw_text,
            detected_medicines=None  # Will be populated when OCR is implemented
        )
        
        return JsonResponse({
            'status': 'success',
            'scan_id': scan.id,
            'detected_medicines': None
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=400)
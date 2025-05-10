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

# Global variables for model and generator
model = None
generator = None

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

@csrf_exempt
@require_http_methods(["POST"])
def chat_api(request):
    """Handle chat interactions using Hugging Face's model."""
    try:
        if not initialize_model():
            return JsonResponse({
                'status': 'error',
                'message': 'Failed to initialize the AI model'
            }, status=500)

        data = json.loads(request.body)
        user_message = data.get('message', '')
        
        if not user_message:
            return JsonResponse({
                'status': 'error',
                'message': 'No message provided'
            }, status=400)
        
        # Generate response using the model
        response = generator(user_message)[0]['generated_text']
        
        # Save the chat interaction
        chat = ChatMessage.objects.create(
            user_message=user_message,
            ai_reply=response
        )
        
        return JsonResponse({
            'status': 'success',
            'reply': response,
            'chat_id': chat.id
        })
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

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
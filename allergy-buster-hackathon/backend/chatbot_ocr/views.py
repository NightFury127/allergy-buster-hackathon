# Chat and OCR views
import os
import json
import re
import traceback
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import ChatMessage, OCRScan
import pytesseract
from PIL import Image, ImageEnhance
import io
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import ChatMessageSerializer
import requests

# Load API keys from APIKeys.txt
api_keys = {}
try:
    with open(os.path.join(os.path.dirname(__file__), '..', 'core_api', 'APIKeys.txt'), 'r') as f:
        for line in f:
            if ':' in line:
                key, value = line.split(':', 1)
                api_keys[key.strip()] = value.strip()
except Exception as e:
    print(f"Error loading API keys: {str(e)}")

mistral_api_key = api_keys.get('MistralAPIKey', '')
gemini_api_key = api_keys.get('GeminiAPIKey', '')

def initialize_model():
    """Check if API keys are available."""
    if mistral_api_key or gemini_api_key:
        return True
    return False

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
@csrf_exempt
def chat_api(request):
    print("Chat API called with:", request.data)
    user_message = request.data.get('message', '')
    if not user_message:
        print("Error: Message is required")
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if we should use Gemini or fallback to Mistral
    use_gemini = gemini_api_key and gemini_api_key != "YOUR_GEMINI_API_KEY_HERE"
    print(f"Using Gemini: {use_gemini}")

    try:
        if use_gemini:
            # Call Google Gemini API
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
            headers = {
                "Content-Type": "application/json"
            }

            # Add the API key as a query parameter
            url = f"{url}?key={gemini_api_key}"

            # Prepare the prompt with allergy-specific context
            prompt = f"""You are an AI assistant specialized in allergy information.
            Provide helpful, accurate information about allergies, symptoms, treatments, and precautions.

            User question: {user_message}"""

            data = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 800,
                    "topP": 0.95
                }
            }

            response = requests.post(url, headers=headers, json=data)

            if response.status_code == 200:
                response_data = response.json()
                ai_response = response_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'No response from Gemini')
            else:
                # Fallback to Mistral if Gemini fails
                ai_response = call_mistral_api(user_message)
        else:
            # Use Mistral as fallback
            ai_response = call_mistral_api(user_message)

        # Save the chat message
        chat_message = ChatMessage.objects.create(
            user_message=user_message,
            ai_reply=ai_response
        )

        return Response({
            'status': 'success',
            'reply': ai_response,
            'chat_id': chat_message.id,
            'model_used': 'gemini' if use_gemini else 'mistral'
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def call_mistral_api(user_message):
    """Helper function to call Mistral AI API"""
    headers = {
        'Authorization': f'Bearer {mistral_api_key}',
        'Content-Type': 'application/json'
    }
    data = {
        'model': 'mistral-small',
        'messages': [{'role': 'user', 'content': user_message}],
        'max_tokens': 100
    }

    try:
        response = requests.post('https://api.mistral.ai/v1/chat/completions', headers=headers, json=data)

        if response.status_code == 200:
            return response.json().get('choices', [{}])[0].get('message', {}).get('content', 'No response from AI')
        else:
            return 'Error: Could not get response from Mistral AI'
    except Exception as e:
        return f'Error: {str(e)}'

def call_gemini_api(prompt, temperature=0.7, max_tokens=800):
    """Helper function to call Google Gemini API"""
    if not gemini_api_key or gemini_api_key == "YOUR_GEMINI_API_KEY_HERE":
        return call_mistral_api(prompt)

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    headers = {
        "Content-Type": "application/json"
    }

    # Add the API key as a query parameter
    url = f"{url}?key={gemini_api_key}"

    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "topP": 0.95
        }
    }

    try:
        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 200:
            response_data = response.json()
            return response_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'No response from Gemini')
        else:
            # Fallback to Mistral if Gemini fails
            return call_mistral_api(prompt)
    except Exception as e:
        return f'Error: {str(e)}'

@api_view(['POST'])
@csrf_exempt
def ocr_api(request):
    """
    Handle OCR scan requests with advanced image processing and text recognition.
    Similar to Google Lens, this API extracts text from images with high accuracy
    and provides detailed analysis of the content.
    """
    try:
        # Check if an image file is uploaded
        if 'image' not in request.FILES:
            return Response({
                'status': 'error',
                'message': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES['image']
        image = Image.open(io.BytesIO(image_file.read()))

        # Step 1: Image preprocessing for better OCR results
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')

        # Increase contrast using PIL's ImageEnhance
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)  # Increase contrast

        # Resize image if too small
        if image.width < 1000 or image.height < 1000:
            ratio = max(1000 / image.width, 1000 / image.height)
            new_size = (int(image.width * ratio), int(image.height * ratio))
            # Use BICUBIC instead of LANCZOS for compatibility
            image = image.resize(new_size, Image.BICUBIC)

        # Step 2: Advanced OCR with custom configuration
        custom_config = r'--oem 3 --psm 6 -l eng'  # OCR Engine Mode 3 = Legacy + LSTM, Page Segmentation Mode 6 = Assume a single uniform block of text
        raw_text = pytesseract.image_to_string(image, config=custom_config)

        # Step 3: Extract structured information
        # Get bounding boxes for words to understand layout
        boxes = pytesseract.image_to_data(image, config=custom_config, output_type=pytesseract.Output.DICT)

        # Extract ingredients section if present
        ingredients_text = ""
        raw_text_lower = raw_text.lower()

        print(f"Raw OCR text: {raw_text}")

        # Look for common ingredient section headers
        ingredient_headers = ['ingredients:', 'ingredients list:', 'contains:', 'ingredient:']
        for header in ingredient_headers:
            if header in raw_text_lower:
                print(f"Found ingredient header: {header}")
                # Extract text after the header
                start_idx = raw_text_lower.find(header) + len(header)
                # Find the next section header or end of text
                next_headers = ['directions:', 'instructions:', 'nutrition facts:', 'warnings:', 'allergen information:']
                end_idx = len(raw_text)
                for next_header in next_headers:
                    if next_header in raw_text_lower[start_idx:]:
                        temp_idx = raw_text_lower[start_idx:].find(next_header) + start_idx
                        if temp_idx < end_idx:
                            end_idx = temp_idx
                            print(f"Found next header: {next_header} at position {temp_idx}")

                ingredients_text = raw_text[start_idx:end_idx].strip()
                print(f"Extracted ingredients text: {ingredients_text}")
                break

        # If no ingredients section found, use the whole text
        if not ingredients_text:
            print("No specific ingredients section found, using whole text")
            ingredients_text = raw_text

        # Step 4: Enhanced allergen detection
        # Common allergens with variations and related terms
        allergen_dict = {
            'peanut': ['peanut', 'peanuts', 'arachis', 'goober', 'groundnut'],
            'tree nut': ['tree nut', 'tree nuts', 'almond', 'hazelnut', 'walnut', 'cashew', 'pistachio', 'pecan', 'brazil nut', 'macadamia'],
            'milk': ['milk', 'dairy', 'lactose', 'whey', 'casein', 'butter', 'cream', 'cheese', 'yogurt'],
            'egg': ['egg', 'eggs', 'albumin', 'ovalbumin', 'lysozyme', 'globulin'],
            'fish': ['fish', 'cod', 'salmon', 'tuna', 'tilapia', 'pollock', 'bass', 'catfish'],
            'shellfish': ['shellfish', 'crustacean', 'shrimp', 'crab', 'lobster', 'prawn', 'crayfish'],
            'wheat': ['wheat', 'gluten', 'flour', 'bread', 'pasta', 'semolina', 'durum', 'bulgur'],
            'soy': ['soy', 'soya', 'soybean', 'tofu', 'edamame', 'miso', 'tempeh'],
            'sesame': ['sesame', 'tahini', 'benne', 'gingelly'],
            'mustard': ['mustard', 'mustard seed'],
            'sulfite': ['sulfite', 'sulphite', 'metabisulfite', 'metabisulphite'],
            'celery': ['celery', 'celeriac'],
            'lupin': ['lupin', 'lupine'],
            'mollusc': ['mollusc', 'mollusk', 'oyster', 'mussel', 'clam', 'scallop', 'squid', 'octopus']
        }

        # Detect allergens in the text
        detected_allergens = []
        ingredients_lower = ingredients_text.lower()

        for allergen, variations in allergen_dict.items():
            for variation in variations:
                # Check for whole word matches to avoid false positives
                if re.search(r'\b' + variation + r'\b', ingredients_lower):
                    if allergen not in detected_allergens:
                        detected_allergens.append(allergen)
                    break

        # Step 5: Use Gemini API to analyze the ingredients if available
        ai_analysis = None
        if gemini_api_key and gemini_api_key != "YOUR_GEMINI_API_KEY_HERE":
            # Use ingredients_text if available, otherwise use raw_text
            text_to_analyze = ingredients_text if ingredients_text else raw_text

            if text_to_analyze:
                prompt = f"""You are an expert in analyzing food and medication ingredients for allergens worldwide.

                Analyze the following text and identify any potential allergens or concerning ingredients:

                {text_to_analyze}

                Please provide:
                1. A comprehensive list of identified allergens based on global allergen databases
                2. Any hidden allergens that might be present under different names or as derivatives
                3. Cross-reactivity information (e.g., if someone allergic to birch pollen might react to certain fruits)
                4. A brief explanation of why these ingredients might cause allergic reactions
                5. Severity level for each allergen (low, medium, high)

                Consider the top 14 major allergens recognized worldwide:
                - Cereals containing gluten
                - Crustaceans
                - Eggs
                - Fish
                - Peanuts
                - Soybeans
                - Milk (including lactose)
                - Nuts (almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamia)
                - Celery
                - Mustard
                - Sesame seeds
                - Sulphur dioxide and sulphites
                - Lupin
                - Molluscs

                Also consider other common allergens like:
                - Various fruits (especially those with cross-reactivity to pollen)
                - Vegetables
                - Spices
                - Food additives and preservatives
                - Medications and their inactive ingredients

                Format your response in a structured way with clear sections.
                """

                try:
                    ai_analysis = call_gemini_api(prompt, temperature=0.2, max_tokens=1000)
                except Exception as e:
                    print(f"Error calling Gemini API: {str(e)}")
                    ai_analysis = None

        # Step 6: Extract medication names if present
        medication_names = []

        # Common medication suffixes and patterns
        med_patterns = [
            r'\b\w+(?:cillin|mycin)\b',  # antibiotics
            r'\b\w+(?:dronate|dipine|sartan|pril|statin|olol|oxetine|azepam|codone)\b',  # common drug suffixes
            r'\b(?:acetaminophen|ibuprofen|aspirin|loratadine|cetirizine|fexofenadine|diphenhydramine)\b',  # common OTC drugs
            r'\b(?:mg|mcg|IU)\b'  # dosage indicators that might be near medication names
        ]

        for pattern in med_patterns:
            matches = re.finditer(pattern, raw_text_lower)
            for match in matches:
                # Get the word and some context
                start_pos = max(0, match.start() - 20)
                end_pos = min(len(raw_text_lower), match.end() + 20)
                context = raw_text_lower[start_pos:end_pos]

                # Extract the medication name
                med_name = match.group(0)
                if med_name not in medication_names:
                    medication_names.append(med_name)

        # Save the OCR scan
        scan = OCRScan.objects.create(
            raw_text=raw_text,
            detected_medicines={
                'allergens': detected_allergens,
                'medications': medication_names,
                'ingredients_text': ingredients_text
            }
        )

        # Prepare the response
        response_data = {
            'status': 'success',
            'scan_id': scan.id,
            'raw_text': raw_text,
            'ingredients_text': ingredients_text,
            'detected_allergens': detected_allergens,
            'detected_medications': medication_names,
        }

        if ai_analysis:
            response_data['ai_analysis'] = ai_analysis

        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_400_BAD_REQUEST)

# Add this new function for medication API
@api_view(['GET'])
def medication_api(request):
    """
    Query medication information from an external API.

    Query parameters:
    - name: Medication name to search for
    - ingredient: Active ingredient to search for
    """
    print("Medication API called with:", request.GET)
    medication_name = request.GET.get('name', '')
    ingredient = request.GET.get('ingredient', '')

    if not medication_name and not ingredient:
        print("Error: No medication name or ingredient provided")
        return Response(
            {'error': 'Please provide either a medication name or ingredient'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # RxNorm API (free, provided by NIH)
    # Documentation: https://rxnav.nlm.nih.gov/RxNormAPIs.html
    base_url = "https://rxnav.nlm.nih.gov/REST/rxcui"

    try:
        # First, get the RxCUI (RxNorm Concept Unique Identifier)
        if medication_name:
            search_param = {'name': medication_name}
        else:
            search_param = {'name': ingredient}

        rxcui_response = requests.get(f"{base_url}.json", params=search_param)

        if rxcui_response.status_code != 200:
            return Response(
                {'error': 'Failed to connect to medication database'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        rxcui_data = rxcui_response.json()

        # Check if we got any results
        if 'idGroup' not in rxcui_data or not rxcui_data['idGroup'].get('rxnormId'):
            return Response(
                {'results': [], 'message': 'No medications found'},
                status=status.HTTP_200_OK
            )

        # Get the first RxCUI
        rxcui = rxcui_data['idGroup']['rxnormId'][0]

        # Now get detailed information using the RxCUI
        details_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/allrelated.json"
        details_response = requests.get(details_url)

        if details_response.status_code != 200:
            return Response(
                {'error': 'Failed to retrieve medication details'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        details_data = details_response.json()

        # Format the response
        medication_info = {
            'name': medication_name or ingredient,
            'rxcui': rxcui,
            'related_medications': [],
            'ingredients': [],
            'drug_classes': []
        }

        # Extract relevant information
        if 'allRelatedGroup' in details_data and 'conceptGroup' in details_data['allRelatedGroup']:
            for group in details_data['allRelatedGroup']['conceptGroup']:
                if group.get('tty') == 'IN' and 'conceptProperties' in group:  # Ingredients
                    medication_info['ingredients'] = [
                        {'name': prop.get('name'), 'rxcui': prop.get('rxcui')}
                        for prop in group['conceptProperties']
                    ]
                elif group.get('tty') == 'BN' and 'conceptProperties' in group:  # Brand names
                    medication_info['related_medications'] = [
                        {'name': prop.get('name'), 'rxcui': prop.get('rxcui')}
                        for prop in group['conceptProperties']
                    ]
                elif group.get('tty') == 'EPC' and 'conceptProperties' in group:  # Drug classes
                    medication_info['drug_classes'] = [
                        prop.get('name') for prop in group['conceptProperties']
                    ]

        return Response({'results': [medication_info]}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Error querying medication database: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@csrf_exempt
def diagnose_symptoms(request):
    """
    Diagnose allergy symptoms using Gemini AI.

    Request body:
    - symptoms: String describing the symptoms
    - age: Optional integer for patient age
    - gender: Optional string for patient gender
    - medical_history: Optional string with relevant medical history
    """
    print("Symptom Diagnosis API called with:", request.data)
    symptoms = request.data.get('symptoms', '')
    age = request.data.get('age', 'Not specified')
    gender = request.data.get('gender', 'Not specified')
    medical_history = request.data.get('medical_history', 'None provided')

    if not symptoms:
        return Response({
            'status': 'error',
            'message': 'Symptoms description is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Create a detailed prompt for the AI
    prompt = f"""You are an expert allergist and immunologist.
    Based on the following information, provide a detailed analysis of possible allergic conditions.

    Patient Information:
    - Age: {age}
    - Gender: {gender}
    - Medical History: {medical_history}

    Symptoms: {symptoms}

    Please provide:
    1. Possible allergic conditions that match these symptoms (list the most likely first)
    2. Recommended next steps (e.g., tests, specialist consultation)
    3. Immediate relief suggestions
    4. Precautions to take

    Format your response in a structured way with clear headings.
    Include a disclaimer that this is not a medical diagnosis and the patient should consult a healthcare professional.
    """

    try:
        # Call Gemini API for diagnosis
        ai_response = call_gemini_api(prompt, temperature=0.3, max_tokens=1000)

        # Parse the response to extract key information
        # This is a simplified version - in a real app, you'd want to parse the response more carefully
        possible_conditions = []
        next_steps = []
        relief_suggestions = []
        precautions = []

        # Very basic parsing - in a real app, you'd use more sophisticated NLP
        lines = ai_response.split('\n')
        current_section = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if "possible" in line.lower() and "condition" in line.lower():
                current_section = "conditions"
                continue
            elif "next step" in line.lower() or "recommend" in line.lower():
                current_section = "next_steps"
                continue
            elif "relief" in line.lower():
                current_section = "relief"
                continue
            elif "precaution" in line.lower():
                current_section = "precautions"
                continue

            if current_section == "conditions" and line.startswith("-"):
                possible_conditions.append(line.lstrip("- "))
            elif current_section == "next_steps" and line.startswith("-"):
                next_steps.append(line.lstrip("- "))
            elif current_section == "relief" and line.startswith("-"):
                relief_suggestions.append(line.lstrip("- "))
            elif current_section == "precautions" and line.startswith("-"):
                precautions.append(line.lstrip("- "))

        return Response({
            'status': 'success',
            'full_analysis': ai_response,
            'possible_conditions': possible_conditions[:5],  # Limit to top 5
            'next_steps': next_steps,
            'relief_suggestions': relief_suggestions,
            'precautions': precautions,
            'disclaimer': 'This is not a medical diagnosis. Please consult a healthcare professional.'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@csrf_exempt
def dietary_suggestions(request):
    """
    Provide dietary suggestions for allergy management using Gemini AI.

    Request body:
    - allergies: List of allergies
    - preferences: Optional dietary preferences
    - restrictions: Optional additional dietary restrictions
    """
    allergies = request.data.get('allergies', [])
    preferences = request.data.get('preferences', 'None specified')
    restrictions = request.data.get('restrictions', 'None specified')

    if not allergies:
        return Response({
            'status': 'error',
            'message': 'At least one allergy must be specified'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Convert allergies list to string
    if isinstance(allergies, list):
        allergies_str = ', '.join(allergies)
    else:
        allergies_str = str(allergies)

    # Create a detailed prompt for the AI
    prompt = f"""You are a nutritionist specializing in allergy-friendly diets.
    Provide detailed dietary suggestions for someone with the following allergies:

    Allergies: {allergies_str}
    Dietary Preferences: {preferences}
    Additional Restrictions: {restrictions}

    Please provide:
    1. Foods to avoid (specific ingredients to watch for)
    2. Safe alternatives for common allergenic foods
    3. 3-day meal plan with breakfast, lunch, dinner, and snacks
    4. Shopping list with allergy-safe brands when applicable
    5. Tips for eating out safely

    Format your response in a structured way with clear headings.
    """

    try:
        # Call Gemini API for dietary suggestions
        ai_response = call_gemini_api(prompt, temperature=0.4, max_tokens=1200)

        # Parse the response to extract key information
        foods_to_avoid = []
        safe_alternatives = []
        meal_plan = []
        shopping_list = []
        eating_out_tips = []

        # Basic parsing - in a real app, you'd use more sophisticated NLP
        lines = ai_response.split('\n')
        current_section = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if "avoid" in line.lower() or "watch" in line.lower():
                current_section = "avoid"
                continue
            elif "alternative" in line.lower() or "substitute" in line.lower():
                current_section = "alternatives"
                continue
            elif "meal plan" in line.lower() or "day" in line.lower() and "breakfast" in line.lower():
                current_section = "meal_plan"
                continue
            elif "shopping" in line.lower() or "grocery" in line.lower():
                current_section = "shopping"
                continue
            elif "eating out" in line.lower() or "restaurant" in line.lower():
                current_section = "eating_out"
                continue

            if current_section == "avoid" and line.startswith("-"):
                foods_to_avoid.append(line.lstrip("- "))
            elif current_section == "alternatives" and line.startswith("-"):
                safe_alternatives.append(line.lstrip("- "))
            elif current_section == "meal_plan" and line.startswith("-"):
                meal_plan.append(line.lstrip("- "))
            elif current_section == "shopping" and line.startswith("-"):
                shopping_list.append(line.lstrip("- "))
            elif current_section == "eating_out" and line.startswith("-"):
                eating_out_tips.append(line.lstrip("- "))

        return Response({
            'status': 'success',
            'full_suggestions': ai_response,
            'foods_to_avoid': foods_to_avoid,
            'safe_alternatives': safe_alternatives,
            'meal_plan': meal_plan,
            'shopping_list': shopping_list,
            'eating_out_tips': eating_out_tips
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def allergy_alerts(request):
    """
    Get local allergy alerts based on location.

    Query parameters:
    - latitude: User's latitude
    - longitude: User's longitude
    - allergies: Comma-separated list of user's allergies
    """
    print("Allergy Alerts API called with:", request.GET)
    latitude = request.GET.get('latitude')
    longitude = request.GET.get('longitude')
    allergies = request.GET.get('allergies', '').split(',')

    # Remove empty strings and whitespace
    allergies = [a.strip() for a in allergies if a.strip()]
    print("Processed allergies:", allergies)

    if not latitude or not longitude:
        print("Error: Latitude and longitude are required")
        return Response({
            'status': 'error',
            'message': 'Latitude and longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # In a real app, you would call a weather/pollen API here
        # For this demo, we'll simulate the response

        # Get current date for seasonal context
        from datetime import datetime
        current_month = datetime.now().month

        # Seasonal allergy mapping (simplified)
        seasonal_mapping = {
            # Winter (Dec-Feb)
            12: ['dust mites', 'mold', 'pet dander'],
            1: ['dust mites', 'mold', 'pet dander'],
            2: ['dust mites', 'mold', 'pet dander'],

            # Spring (Mar-May)
            3: ['tree pollen', 'mold'],
            4: ['tree pollen', 'grass pollen'],
            5: ['tree pollen', 'grass pollen'],

            # Summer (Jun-Aug)
            6: ['grass pollen', 'weed pollen', 'insect stings'],
            7: ['grass pollen', 'weed pollen', 'insect stings'],
            8: ['ragweed', 'weed pollen', 'insect stings'],

            # Fall (Sep-Nov)
            9: ['ragweed', 'weed pollen', 'mold'],
            10: ['ragweed', 'mold', 'dust mites'],
            11: ['mold', 'dust mites']
        }

        # Get seasonal allergens for current month
        seasonal_allergens = seasonal_mapping.get(current_month, [])

        # Generate alerts based on user's allergies and seasonal allergens
        alerts = []

        # Check for pollen alerts
        if any(a in ['pollen', 'tree pollen', 'grass pollen', 'weed pollen', 'ragweed'] for a in allergies):
            if any(p in seasonal_allergens for p in ['tree pollen', 'grass pollen', 'weed pollen', 'ragweed']):
                alerts.append({
                    'type': 'pollen',
                    'severity': 'high',
                    'description': 'High pollen levels in your area. Consider limiting outdoor activities.',
                    'recommendations': [
                        'Keep windows closed',
                        'Use air purifiers',
                        'Shower after being outdoors',
                        'Take allergy medication before symptoms start'
                    ]
                })

        # Check for mold alerts
        if 'mold' in allergies and 'mold' in seasonal_allergens:
            alerts.append({
                'type': 'mold',
                'severity': 'moderate',
                'description': 'Moderate mold levels due to recent weather conditions.',
                'recommendations': [
                    'Use dehumidifiers',
                    'Clean damp areas regularly',
                    'Use mold-killing products in bathrooms',
                    'Ensure good ventilation'
                ]
            })

        # Check for dust mite alerts
        if 'dust' in allergies and 'dust mites' in seasonal_allergens:
            alerts.append({
                'type': 'dust_mites',
                'severity': 'moderate',
                'description': 'Indoor heating can increase dust mite activity.',
                'recommendations': [
                    'Use allergen-proof bed covers',
                    'Wash bedding in hot water weekly',
                    'Keep humidity below 50%',
                    'Vacuum with a HEPA filter'
                ]
            })

        # Check for pet dander alerts (always relevant if allergic)
        if 'pet' in allergies or 'dander' in allergies:
            alerts.append({
                'type': 'pet_dander',
                'severity': 'varies',
                'description': 'Pet dander allergies can be worse in winter when more time is spent indoors.',
                'recommendations': [
                    'Keep pets out of bedrooms',
                    'Bathe pets weekly',
                    'Use HEPA air purifiers',
                    'Clean floors and furniture regularly'
                ]
            })

        # Add general seasonal information
        season_names = {
            12: 'Winter', 1: 'Winter', 2: 'Winter',
            3: 'Spring', 4: 'Spring', 5: 'Spring',
            6: 'Summer', 7: 'Summer', 8: 'Summer',
            9: 'Fall', 10: 'Fall', 11: 'Fall'
        }

        current_season = season_names.get(current_month)

        return Response({
            'status': 'success',
            'location': {
                'latitude': latitude,
                'longitude': longitude,
                'city': 'Your City',  # In a real app, you would use reverse geocoding
                'region': 'Your Region'
            },
            'current_date': datetime.now().strftime('%Y-%m-%d'),
            'season': current_season,
            'seasonal_allergens': seasonal_allergens,
            'alerts': alerts,
            'general_info': f"{current_season} is typically a season when {', '.join(seasonal_allergens)} are common allergens."
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def nearby_doctors(request):
    """
    Find nearby doctors specializing in allergies.

    Query parameters:
    - latitude: User's latitude
    - longitude: User's longitude
    - distance: Search radius in miles (default: 10)
    - specialty: Type of doctor (default: allergist)
    """
    latitude = request.GET.get('latitude')
    longitude = request.GET.get('longitude')
    distance = request.GET.get('distance', '10')
    specialty = request.GET.get('specialty', 'allergist')

    if not latitude or not longitude:
        return Response({
            'status': 'error',
            'message': 'Latitude and longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # In a real app, you would call a doctor directory API or database
        # For this demo, we'll simulate the response with mock data

        # Mock data for nearby doctors
        doctors = [
            {
                'id': 1,
                'name': 'Dr. Jane Smith',
                'specialty': 'Allergist / Immunologist',
                'address': '123 Main St, New York, NY 10001',
                'phone': '(212) 555-1234',
                'distance': '1.2 miles',
                'rating': 4.8,
                'reviews_count': 56,
                'accepting_new_patients': True,
                'insurance_accepted': ['Aetna', 'Blue Cross', 'Cigna', 'UnitedHealthcare'],
                'languages': ['English', 'Spanish'],
                'next_available': '2023-06-20'
            },
            {
                'id': 2,
                'name': 'Dr. Michael Johnson',
                'specialty': 'Allergist / Immunologist',
                'address': '456 Park Ave, New York, NY 10022',
                'phone': '(212) 555-5678',
                'distance': '2.5 miles',
                'rating': 4.6,
                'reviews_count': 42,
                'accepting_new_patients': True,
                'insurance_accepted': ['Aetna', 'Cigna', 'Medicare'],
                'languages': ['English'],
                'next_available': '2023-06-18'
            },
            {
                'id': 3,
                'name': 'Dr. Sarah Williams',
                'specialty': 'Pediatric Allergist',
                'address': '789 Broadway, New York, NY 10003',
                'phone': '(212) 555-9012',
                'distance': '3.1 miles',
                'rating': 4.9,
                'reviews_count': 78,
                'accepting_new_patients': False,
                'insurance_accepted': ['Blue Cross', 'UnitedHealthcare', 'Medicaid'],
                'languages': ['English', 'French'],
                'next_available': '2023-07-05'
            }
        ]

        # Mock data for hospitals
        hospitals = [
            {
                'id': 1,
                'name': 'City General Hospital',
                'address': '100 Hospital Blvd, New York, NY 10001',
                'phone': '(212) 555-2000',
                'distance': '1.8 miles',
                'emergency': True,
                'allergy_dept': True,
                'rating': 4.2,
                'insurance_accepted': ['Most major insurances']
            },
            {
                'id': 2,
                'name': 'University Medical Center',
                'address': '200 College Ave, New York, NY 10016',
                'phone': '(212) 555-3000',
                'distance': '4.2 miles',
                'emergency': True,
                'allergy_dept': True,
                'rating': 4.7,
                'insurance_accepted': ['Most major insurances']
            }
        ]

        return Response({
            'status': 'success',
            'location': {
                'latitude': latitude,
                'longitude': longitude,
                'city': 'New York',  # In a real app, you would use reverse geocoding
                'region': 'NY'
            },
            'search_params': {
                'distance': distance,
                'specialty': specialty
            },
            'doctors': doctors,
            'hospitals': hospitals,
            'total_results': len(doctors) + len(hospitals)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def drug_interactions(request):
    """
    Check for interactions between medications.

    Query parameters:
    - med1: First medication name
    - med2: Second medication name
    """
    med1 = request.GET.get('med1', '')
    med2 = request.GET.get('med2', '')

    if not med1 or not med2:
        return Response({
            'status': 'error',
            'message': 'Please provide both medications to check for interactions'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # First, get RxCUIs for both medications
        rxcuis = []
        for med_name in [med1, med2]:
            search_param = {'name': med_name}
            rxcui_response = requests.get("https://rxnav.nlm.nih.gov/REST/rxcui.json", params=search_param)

            if rxcui_response.status_code != 200:
                continue

            rxcui_data = rxcui_response.json()

            if 'idGroup' in rxcui_data and rxcui_data['idGroup'].get('rxnormId'):
                rxcuis.append(rxcui_data['idGroup']['rxnormId'][0])

        # If we couldn't find RxCUIs for both medications, use Gemini AI
        if len(rxcuis) < 2:
            return get_interactions_from_gemini(med1, med2)

        # Check for interactions using the RxNav API
        interaction_url = f"https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis={'+'.join(rxcuis)}"
        interaction_response = requests.get(interaction_url)

        if interaction_response.status_code != 200:
            return get_interactions_from_gemini(med1, med2)

        interaction_data = interaction_response.json()

        # Parse the interaction data
        interactions = []
        if 'fullInteractionTypeGroup' in interaction_data:
            for group in interaction_data['fullInteractionTypeGroup']:
                if 'fullInteractionType' in group:
                    for interaction_type in group['fullInteractionType']:
                        if 'interactionPair' in interaction_type:
                            for pair in interaction_type['interactionPair']:
                                interactions.append({
                                    'description': pair.get('description', 'No description available'),
                                    'severity': 'moderate',  # Default severity
                                    'source': group.get('sourceName', 'RxNav')
                                })

        # If no interactions found from RxNav, use Gemini AI as backup
        if not interactions:
            return get_interactions_from_gemini(med1, med2)

        return Response({
            'status': 'success',
            'medications': {
                'med1': med1,
                'med2': med2
            },
            'has_interactions': len(interactions) > 0,
            'interactions': interactions
        }, status=status.HTTP_200_OK)

    except Exception as e:
        # Fallback to Gemini AI if there's an error
        return get_interactions_from_gemini(med1, med2)

def get_interactions_from_gemini(med1, med2):
    """Helper function to get drug interactions using Gemini AI"""
    if not gemini_api_key or gemini_api_key == "YOUR_GEMINI_API_KEY_HERE":
        # Return a simulated response if Gemini is not available
        return Response({
            'status': 'success',
            'medications': {
                'med1': med1,
                'med2': med2
            },
            'has_interactions': med1.lower() == 'cetirizine' and med2.lower() == 'diphenhydramine' or
                               med2.lower() == 'cetirizine' and med1.lower() == 'diphenhydramine',
            'interactions': [
                {
                    'description': 'These medications may cause increased drowsiness when taken together.',
                    'severity': 'moderate',
                    'source': 'Simulated data'
                }
            ] if (med1.lower() == 'cetirizine' and med2.lower() == 'diphenhydramine' or
                  med2.lower() == 'cetirizine' and med1.lower() == 'diphenhydramine') else []
        }, status=status.HTTP_200_OK)

    # Prepare the prompt for Gemini
    prompt = f"""You are a pharmacist with expertise in drug interactions.

    Please analyze the potential interactions between these two medications:
    1. {med1}
    2. {med2}

    Provide the following information:
    1. Whether there are any known interactions between these medications
    2. A description of each interaction (if any)
    3. The severity of each interaction (mild, moderate, severe)
    4. Recommendations for patients taking both medications

    Format your response as structured data that can be easily parsed.
    """

    try:
        # Call Gemini API
        ai_response = call_gemini_api(prompt, temperature=0.2, max_tokens=800)

        # Parse the AI response to extract interaction information
        has_interactions = "no interaction" not in ai_response.lower() and "no known interaction" not in ai_response.lower()

        # Extract severity from the response
        severity = "moderate"  # Default
        if "severe" in ai_response.lower() or "high" in ai_response.lower():
            severity = "severe"
        elif "mild" in ai_response.lower() or "low" in ai_response.lower():
            severity = "mild"

        # Extract description
        description = ai_response
        if len(description) > 500:
            # Truncate long descriptions
            description = description[:500] + "..."

        return Response({
            'status': 'success',
            'medications': {
                'med1': med1,
                'med2': med2
            },
            'has_interactions': has_interactions,
            'interactions': [
                {
                    'description': description,
                    'severity': severity,
                    'source': 'Gemini AI'
                }
            ] if has_interactions else []
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Error checking drug interactions: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
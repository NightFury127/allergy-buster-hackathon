# Chat and OCR URLs
from django.urls import path
from . import views

urlpatterns = [
    path('test-env/', views.test_env, name='test_env'),  # GET /api/chatbot/test-env/
    path('chat/', views.chat_api, name='chat_api'),      # POST /api/chatbot/chat/
    path('ocr/', views.ocr_api, name='ocr_api'),         # POST /api/chatbot/ocr/
    path('medication/', views.medication_api, name='medication_api'),  # GET /api/chatbot/medication/
    path('diagnose/', views.diagnose_symptoms, name='diagnose_symptoms'),  # POST /api/chatbot/diagnose/
    path('dietary-suggestions/', views.dietary_suggestions, name='dietary_suggestions'),  # POST /api/chatbot/dietary-suggestions/
    path('allergy-alerts/', views.allergy_alerts, name='allergy_alerts'),  # GET /api/chatbot/allergy-alerts/
    path('nearby-doctors/', views.nearby_doctors, name='nearby_doctors'),  # GET /api/chatbot/nearby-doctors/
    path('drug-interactions/', views.drug_interactions, name='drug_interactions'),  # GET /api/chatbot/drug-interactions/
]
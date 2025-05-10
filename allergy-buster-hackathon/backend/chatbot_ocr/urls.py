# Chat and OCR URLs
from django.urls import path
from . import views

urlpatterns = [
    path('test-env/', views.test_env, name='test_env'),  # GET /api/chatbot/test-env/
    path('chat/', views.chat_api, name='chat_api'),      # POST /api/chat/
    path('ocr/', views.ocr_api, name='ocr_api'),         # POST /api/ocr/
]
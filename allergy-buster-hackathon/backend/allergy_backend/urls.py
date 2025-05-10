from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('core_api.urls')),
    path('api/chatbot/', include('chatbot_ocr.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
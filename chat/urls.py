# chat/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('', views.chat_home, name='chat_home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
    path('<str:room_name>/', views.room, name='room'),
    path('messages/<str:room_name>/', views.get_messages, name='get_messages'),

]
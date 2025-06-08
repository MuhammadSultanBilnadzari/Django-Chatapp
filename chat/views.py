# chat/views.py

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .models import Message, OnlineUser

def register_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        if User.objects.filter(username=username).exists():
            return render(request, 'chat/register.html', {'error': 'Username already exists'})
        user = User.objects.create_user(username=username, password=password)
        OnlineUser.objects.create(user=user)
        login(request, user)
        return redirect('chat_home')
    return render(request, 'chat/register.html')

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            OnlineUser.objects.update_or_create(user=user, defaults={'is_online': True})
            return redirect('chat_home')
        return render(request, 'chat/login.html', {'error': 'Invalid credentials'})
    return render(request, 'chat/login.html')

def logout_view(request):
    if request.user.is_authenticated:
        OnlineUser.objects.filter(user=request.user).update(is_online=False)
        logout(request)
    return redirect('login')

@login_required
def chat_home(request):
    return redirect('room', room_name='home')

@login_required
def room(request, room_name):
    messages = Message.objects.filter(room=room_name).order_by('timestamp')
    users = OnlineUser.objects.filter(is_online=True)
    return render(request, 'chat/room.html', {
        'room_name': room_name,
        'messages': messages,
        'users': users,
    })

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.username = self.scope['user'].username if self.scope['user'].is_authenticated else 'Anonymous'

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        # Broadcast stop_typing on disconnect
        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'typing_status',
            'typing': False,
            'username': self.username
        })

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message')
        username = data.get('username', self.username)  # fallback pakai self.username
        image = data.get('image')
        typing = data.get('typing')
        action = data.get('action')
        command = data.get('command')

        if message:
            # Simpan pesan di DB dengan room yang benar
            await self.save_message(username, message, self.room_name)

            # Kirim ke grup pesan baru
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'chat_message',
                'message': message,
                'username': username
            })

        elif image:
            # Broadcast gambar (base64)
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'image_message',
                'image': image,
                'username': username
            })

        elif typing is not None:
            # Broadcast status mengetik
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'typing_status',
                'typing': typing,
                'username': username
            })

        elif action == 'clear_messages' or command == 'delete_all_messages':
            await self.clear_messages(self.room_name)
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'delete_all_messages',
                'username': username
            })

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username']
        }))

    async def image_message(self, event):
        await self.send(text_data=json.dumps({
            'image': event['image'],
            'username': event['username']
        }))

    async def typing_status(self, event):
        await self.send(text_data=json.dumps({
            'typing': event['typing'],
            'username': event['username']
        }))

    async def delete_all_messages(self, event):
        await self.send(text_data=json.dumps({
            'delete_all': True,
            'username': event['username']
        }))

    @database_sync_to_async
    def save_message(self, username, message, room):
        user = User.objects.filter(username=username).first()
        if user:
            Message.objects.create(user=user, content=message, room=room)

    @database_sync_to_async
    def clear_messages(self, room):
        Message.objects.filter(room=room).delete()

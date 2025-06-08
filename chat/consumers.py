import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)

        if 'typing' in data:
            # Handle typing indicator
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'username': data['username'],
                    'typing': data['typing']
                }
            )
        elif 'message' in data:
            # Handle normal message
            message = data['message']
            username = data['username']

            await self.save_message(username, self.room_name, message)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': username
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'username': event['username'],
        }))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            'typing': event['typing'],
            'username': event['username'],
        }))

    @database_sync_to_async
    def save_message(self, username, room, message):
        from django.contrib.auth.models import User  # lazy import
        from .models import Message  # lazy import

        user = User.objects.get(username=username)
        Message.objects.create(user=user, room=room, content=message)

import datetime

class Conversation:
    def __init__(self, user_message: str, bot_response: str):
        self.user_message = user_message
        self.bot_response = bot_response
        self.timestamp = datetime.datetime.now()

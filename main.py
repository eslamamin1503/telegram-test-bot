import os
import time
import requests

TOKEN = os.environ["BOT_TOKEN"]
API = "https://api.telegram.org/bot" + TOKEN

JOKES = [
    "مرة مبرمج راح الدكتور، قاله: عندي bug في المعدة. قاله: جرب تطفي وتشغل.",
    "ليه المبرمج بيحب الضلمة؟ عشان النور بيطلع الـ bugs!",
    "قالوا لروبوت: احكيلي نكتة. قال: 01001000 01000001 01001000 01000001",
]

def send(chat_id, text):
    requests.post(API + "/sendMessage", json={"chat_id": chat_id, "text": text})

def main():
    offset = 0
    joke_i = 0
    print("Bot is running...", flush=True)
    while True:
        try:
            r = requests.get(API + "/getUpdates", params={"offset": offset, "timeout": 30}, timeout=40)
            for u in r.json().get("result", []):
                offset = u["update_id"] + 1
                m = u.get("message") or {}
                text = (m.get("text") or "").strip()
                chat = (m.get("chat") or {}).get("id")
                if not chat or not text:
                    continue
                low = text.lower()
                if low.startswith("/start"):
                    send(chat, "أهلاً بيك! 👋 أنا بوت تجريبي شغال على Replit.\nابعتلي أي رسالة وأكررهالك، أو جرب /joke أو /ping")
                elif low.startswith("/ping"):
                    send(chat, "pong 🏓")
                elif low.startswith("/joke"):
                    send(chat, JOKES[joke_i % len(JOKES)])
                    joke_i += 1
                else:
                    send(chat, "قلت: " + text)
        except Exception as e:
            print("error:", e, flush=True)
            time.sleep(3)

if __name__ == "__main__":
    main()

import sys
import json
import asyncio
import base64
try:
    import edge_tts
except ImportError:
    print(json.dumps({"success": False, "error": "edge-tts module not found. Try pip install edge-tts"}))
    sys.exit(1)

async def generate_speech(text: str, voice: str):
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    # Convert to base64
    base64_audio = base64.b64encode(audio_data).decode('utf-8')
    return base64_audio

if __name__ == "__main__":
    try:
        # Prevent Windows console encoding issues
        sys.stdin.reconfigure(encoding='utf-8')
        sys.stdout.reconfigure(encoding='utf-8')

        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"success": False, "error": "Empty input"}))
            sys.exit(1)
            
        payload = json.loads(input_data)
        text = payload.get("text", "")
        # Giọng nữ: vi-VN-HoaiMyNeural, Giọng nam: vi-VN-NamMinhNeural
        voice = payload.get("voice", "vi-VN-HoaiMyNeural") 
        
        base64_audio = asyncio.run(generate_speech(text, voice))
        
        print(json.dumps({
            "success": True,
            "audio_base64": base64_audio
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

import sys
import json
import base64
import numpy as np
import io

try:
    import librosa
    from fastdtw import fastdtw
    from scipy.spatial.distance import euclidean
    import soundfile as sf
except ImportError:
    print(json.dumps({"error": "Missing python dependencies. Run: pip install librosa fastdtw soundfile numpy"}))
    sys.exit(1)

def base64_to_audio(base64_string):
    """ Decode base64 audio and load via soundfile/librosa """
    # Xóa prefix 'data:audio/webm;base64,' nếu có
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    audio_data = base64.b64decode(base64_string)
    
    # Đọc audio buffer qua soundfile
    with io.BytesIO(audio_data) as f:
        y, sr = sf.read(f)
        
    # Chuyển về mono nếu là stereo
    if len(y.shape) > 1:
        y = np.mean(y, axis=1)
        
    # Resample về chuẩn 16000Hz để dễ so sánh MFCC
    if sr != 16000:
        y = librosa.resample(y, orig_sr=sr, target_sr=16000)
    
    return y, 16000

def extract_mfcc(y, sr):
    # Trích xuất 13 MFCCs
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    # Scale chuẩn hóa
    mfcc_scaled = (mfcc - np.mean(mfcc, axis=1, keepdims=True)) / (np.std(mfcc, axis=1, keepdims=True) + 1e-8)
    return mfcc_scaled.T # shape: (time_steps, n_mfcc)

def main():
    # Đọc đầu vào từ stdin dưới dạng JSON
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input provided"}))
            sys.exit(1)
            
        payload = json.loads(input_data)
        base_audio = payload.get("baseAudio")
        user_audio = payload.get("userAudio")
        
        if not base_audio or not user_audio:
            print(json.dumps({"success": False, "error": "Missing baseAudio or userAudio in JSON payload"}))
            sys.exit(1)
        
        y_base, sr_base = base64_to_audio(base_audio)
        y_user, sr_user = base64_to_audio(user_audio)
        
        mfcc_base = extract_mfcc(y_base, sr_base)
        mfcc_user = extract_mfcc(y_user, sr_user)
        
        # Chạy thuật toán fastdtw
        distance, path = fastdtw(mfcc_base, mfcc_user, dist=euclidean)
        
        normalized_distance = distance / len(path)
        
        # Tùy chỉnh threshold (Cần tinh chỉnh khi test thực tế)
        score = max(0, min(100, 100 - (normalized_distance * 1.5))) 
        
        result = {
            "success": True,
            "dtw_distance": float(normalized_distance),
            "acoustic_score": float(score)
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()

import cv2
import sys
import os

# --- 1. SETUP PATHS ---
script_dir = os.path.dirname(os.path.abspath(__file__))
trainer_path = os.path.join(script_dir, 'trainer', 'trainer.yml')

# --- 2. LOAD AI MODEL ---
if not os.path.exists(trainer_path):
    print("NO_MODEL_FOUND")
    sys.exit()

recognizer = cv2.face.LBPHFaceRecognizer_create()
recognizer.read(trainer_path)

face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def check_for_duplicate(image_path):
    if not os.path.exists(image_path):
        return

    img = cv2.imread(image_path)
    if img is None:
        return

    # --- 3. THE 4-WAY SPIN ---
    rotations = [
        (0, None),
        (90, cv2.ROTATE_90_CLOCKWISE),
        (270, cv2.ROTATE_90_COUNTERCLOCKWISE),
        (180, cv2.ROTATE_180)
    ]

    best_confidence = 1000 
    best_match_id = -1

    for angle, code in rotations:
        if angle == 0:
            current_img = img
        else:
            current_img = cv2.rotate(img, code)

        gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
        
        faces = face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))

        for (x, y, w, h) in faces:
            id, confidence = recognizer.predict(gray[y:y+h, x:x+w])

            # --- THE FIX: INCREASED THRESHOLD TO 85 ---
            # 50 was too strict (only blocked perfect matches).
            # 85 is stricter for the user (blocks anyone who looks similar).
            if confidence < 85: 
                if confidence < best_confidence:
                    best_confidence = confidence
                    best_match_id = id

    if best_match_id != -1:
        # Debug: Print the confidence score so we know how close it was
        print(f"DUPLICATE_FOUND:{best_match_id} (Score: {round(best_confidence)})")
    else:
        print("NO_DUPLICATE")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR_ARGS")
    else:
        check_for_duplicate(sys.argv[1])
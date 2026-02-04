import cv2
import sys
import os
import mysql.connector

# --- 1. DATABASE CONNECTION ---
# We need this to turn "ID 6" back into "Patrick G. Miralion"
def get_visitor_name_by_id(visitor_id):
    try:
        conn = mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password="",
            database="visecure_db"
        )
        cursor = conn.cursor()
        query = "SELECT FullName FROM visitors WHERE VisitorID = %s"
        cursor.execute(query, (visitor_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0] # Return the Name
    except Exception as e:
        # If DB fails, print error so PHP sees it
        print(f"DB_ERROR: {e}")
    
    return None

# --- 2. SETUP PATHS ---
script_dir = os.path.dirname(os.path.abspath(__file__))
trainer_path = os.path.join(script_dir, 'trainer', 'trainer.yml')

# --- 3. LOAD AI MODEL ---
if not os.path.exists(trainer_path):
    print("ERROR: Trainer file not found. Run 02_face_training.py first.")
    sys.exit()

recognizer = cv2.face.LBPHFaceRecognizer_create()
recognizer.read(trainer_path)

# Use the forgiving Haar Cascade
face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def recognize_user(image_path):
    if not os.path.exists(image_path):
        print("ERROR: Image file not found")
        return

    # Read Image
    img = cv2.imread(image_path)
    if img is None:
        print("ERROR: Could not read image")
        return

    # --- 4. THE 4-WAY SPIN (Auto-Rotate) ---
    rotations = [
        (0, None),
        (90, cv2.ROTATE_90_CLOCKWISE),
        (270, cv2.ROTATE_90_COUNTERCLOCKWISE),
        (180, cv2.ROTATE_180)
    ]

    best_confidence = 1000  # Start high (Lower is better for LBPH)
    best_match_id = -1

    for angle, code in rotations:
        if angle == 0:
            current_img = img
        else:
            current_img = cv2.rotate(img, code)

        gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
        
        # Detect Face (Forgiving Mode)
        faces = face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30))

        for (x, y, w, h) in faces:
            # Ask the AI: "Who is this?"
            id, confidence = recognizer.predict(gray[y:y+h, x:x+w])

            # LBPH Confidence: 
            # < 50: Super Confident
            # < 80: Good Match
            # > 100: No Match
            if confidence < 85: 
                # If this rotation gave a better match, save it
                if confidence < best_confidence:
                    best_confidence = confidence
                    best_match_id = id

    # --- 5. FINAL RESULT ---
    if best_match_id != -1:
        # We found a face ID. Now get the name.
        name = get_visitor_name_by_id(best_match_id)
        if name:
            print(f"MATCH:{name}")
        else:
            # ID exists in trainer but not in DB (Rare)
            print("UNKNOWN")
    else:
        print("NO_FACE_DETECTED")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR_NO_FILE")
    else:
        recognize_user(sys.argv[1])
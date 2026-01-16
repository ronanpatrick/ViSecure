import os
import sys

# --- SILENT MODE ---
os.environ["PYTHONWARNINGS"] = "ignore"
sys.stderr = open(os.devnull, 'w')
# -------------------

import json
import cv2
import face_recognition
import pickle

# --- FIX: USE ABSOLUTE PATHS ---
# Get the folder where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Force it to look for the brain file in that specific folder
ENCODINGS_FILE = os.path.join(BASE_DIR, "encodings.pickle")

def verify_face(image_path):
    # Validation
    if not os.path.exists(image_path):
        return {"success": False, "message": "Image file not found at " + image_path}
    
    if not os.path.exists(ENCODINGS_FILE):
        return {"success": False, "message": "Brain file missing at " + ENCODINGS_FILE}

    try:
        data = pickle.loads(open(ENCODINGS_FILE, "rb").read())
    except:
        return {"success": False, "message": "Brain file corrupt"}

    image = cv2.imread(image_path)
    if image is None:
        return {"success": False, "message": "Cannot read image"}

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Detect
    boxes = face_recognition.face_locations(rgb, model="hog")
    if not boxes:
        rgb = cv2.rotate(rgb, cv2.ROTATE_90_CLOCKWISE)
        boxes = face_recognition.face_locations(rgb, model="hog")

    if not boxes:
        return {"success": False, "message": "No face detected"}

    # Recognize
    encodings = face_recognition.face_encodings(rgb, boxes)
    name = "Unknown"
    
    matches = face_recognition.compare_faces(data["encodings"], encodings[0], tolerance=0.5)

    if True in matches:
        matchedIdxs = [i for (i, b) in enumerate(matches) if b]
        counts = {}
        for i in matchedIdxs:
            name = data["names"][i]
            counts[name] = counts.get(name, 0) + 1
        name = max(counts, key=counts.get)
        
        return {"success": True, "name": name, "message": f"Welcome, {name}"}
    
    return {"success": False, "message": "Face not recognized"}

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"success": False, "message": "No image path provided"}))
        else:
            result = verify_face(sys.argv[1])
            print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "message": "System Error"}))
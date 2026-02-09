import cv2
import sys
import os
import json

# 1. SETUP PATHS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
trainer_path = os.path.join(BASE_DIR, 'trainer.yml')
names_path = os.path.join(BASE_DIR, 'names.json')

# 2. CHECK ARGS
if len(sys.argv) < 2:
    print("ERROR: No image path provided")
    sys.exit(1)

image_path = sys.argv[1]

# 3. LOAD MODEL
if not os.path.exists(trainer_path):
    print("UNKNOWN: Model not trained yet")
    sys.exit(0)

recognizer = cv2.face.LBPHFaceRecognizer_create()
try:
    recognizer.read(trainer_path)
except:
    print("UNKNOWN: Model file corrupted")
    sys.exit(0)

# 4. LOAD NAMES MAPPING
names = {}
if os.path.exists(names_path):
    with open(names_path, 'r') as f:
        # Convert keys back to integers because JSON stores keys as strings
        data = json.load(f)
        names = {int(k): v for k, v in data.items()}

# 5. PREPARE IMAGE
faceCascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
img = cv2.imread(image_path)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

faces = faceCascade.detectMultiScale(
    gray,
    scaleFactor=1.1,
    minNeighbors=5,
    minSize=(30, 30)
)

if len(faces) == 0:
    print("NO_FACE_DETECTED")
    sys.exit(0)

# 6. RECOGNIZE
for(x,y,w,h) in faces:
    id, confidence = recognizer.predict(gray[y:y+h,x:x+w])

    # LBPH Confidence: Lower is better. < 50 is a very good match. < 100 is acceptable.
    if confidence < 85: 
        folder_name = names.get(id, "Unknown")
        # OUTPUT FORMAT: "MATCH:15_Doe_John"
        print(f"MATCH:{folder_name}")
        sys.exit(0) # Stop after first match
    else:
        print("UNKNOWN")
        sys.exit(0)
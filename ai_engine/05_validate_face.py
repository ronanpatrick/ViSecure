import sys
import os

# 1. Silence warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

import cv2
import face_recognition

def validate_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        return False
    
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Step 1: Find Face Boxes (The easy check)
    boxes = face_recognition.face_locations(rgb_image, model='hog')
    
    if len(boxes) == 0:
        return False

    # Step 2: STRICT CHECK - Find Facial Features (Eyes, Nose, Lips) 👁️👄
    # A wall might pass Step 1, but it will fail Step 2.
    landmarks = face_recognition.face_landmarks(rgb_image, boxes)
    
    # If we found landmarks for at least one face, it's a real person.
    return len(landmarks) > 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR_NO_FILE")
        sys.exit()

    image_path = sys.argv[1]
    
    if validate_image(image_path):
        print("DETECTED_FACE")
    else:
        print("NO_FACE")
import sys
import os
import cv2

# 1. SETUP: Use the Standard "Forgiving" Detector
# (This is the same one used in 01_face_dataset.py)
casc_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_detector = cv2.CascadeClassifier(casc_path)

def validate_and_fix_image(image_path):
    # Read the image
    original_image = cv2.imread(image_path)
    if original_image is None:
        print("DEBUG: Image not found or empty.")
        return False
    
    # Define the 4 rotations to try
    rotations = [
        (0, None),                                  # Original
        (90, cv2.ROTATE_90_CLOCKWISE),              # Sideways Right
        (270, cv2.ROTATE_90_COUNTERCLOCKWISE),      # Sideways Left
        (180, cv2.ROTATE_180)                       # Upside Down
    ]

    print(f"DEBUG: Checking {image_path}...")

    for angle, rotate_code in rotations:
        # 1. Apply Rotation
        if angle == 0:
            current_img = original_image
        else:
            current_img = cv2.rotate(original_image, rotate_code)

        # 2. Convert to Grayscale (Haar Cascade works best in Gray)
        gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
        
        # 3. Detect Face
        # scaleFactor=1.1 (Standard)
        # minNeighbors=3 (Lowered from 5 to 3 to be more forgiving in dark)
        faces = face_detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=3, 
            minSize=(30, 30)
        )

        if len(faces) > 0:
            # --- SUCCESS! We found a face ---
            print(f"DEBUG: Found face at rotation {angle}°")

            # CRITICAL: Overwrite the file with the upright version
            if angle != 0:
                cv2.imwrite(image_path, current_img)
                print("DEBUG: Saved rotated image.")
                
            return True

    # If we tried all 4 angles and found nothing
    print("DEBUG: No face found in any rotation.")
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR_NO_FILE")
        sys.exit()

    image_path = sys.argv[1]
    
    if validate_and_fix_image(image_path):
        print("DETECTED_FACE")
    else:
        print("NO_FACE")
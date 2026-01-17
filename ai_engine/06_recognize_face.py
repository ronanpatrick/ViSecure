import warnings
# Silence all warnings so they don't break the PHP integration
warnings.filterwarnings("ignore")

import sys
import os
import cv2
import face_recognition
import glob

# Silence warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

def recognize_user(input_image_path, dataset_path):
    # 1. Load the input image (The webcam photo)
    try:
        unknown_image = face_recognition.load_image_file(input_image_path)
    except Exception:
        return "ERROR_LOADING_IMAGE"

    # --- THE FIX: Add 'number_of_times_to_upsample=2' ---
    # This acts like a magnifying glass. 1 is default. 2 is better for webcams.
    unknown_face_locations = face_recognition.face_locations(unknown_image, number_of_times_to_upsample=2, model="hog")
    
    if len(unknown_face_locations) == 0:
        return "NO_FACE_DETECTED"
    
    try:
        unknown_encoding = face_recognition.face_encodings(unknown_image, unknown_face_locations)[0]
    except IndexError:
        return "ENCODING_ERROR"

    # 2. Iterate through "dataset" folders
    if not os.path.exists(dataset_path):
        return "NO_DATASET"

    users = [f.name for f in os.scandir(dataset_path) if f.is_dir()]
    
    for user_name in users:
        user_folder = os.path.join(dataset_path, user_name)
        
        # --- NEW LOGIC: Check ALL images in the folder, not just the first one ---
        reference_images = glob.glob(os.path.join(user_folder, "*.jpg"))
        
        for ref_img_path in reference_images:
            try:
                known_image = face_recognition.load_image_file(ref_img_path)
                known_encodings = face_recognition.face_encodings(known_image)
                
                if len(known_encodings) > 0:
                    known_encoding = known_encodings[0]
                    
                    # Compare with TOLERANCE 0.6 (Standard)
                    # Lower number = Stricter. 0.6 is the recommended default.
                    results = face_recognition.compare_faces([known_encoding], unknown_encoding, tolerance=0.7)
                    
                    if results[0]:
                        return f"MATCH:{user_name}"
            except Exception:
                continue # Skip bad images

    return "UNKNOWN"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR_ARGS")
        sys.exit()

    img_path = sys.argv[1]
    # HARDCODED PATH for safety - Update if needed!
    dataset_dir = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\dataset"
    
    result = recognize_user(img_path, dataset_dir)
    print(result)
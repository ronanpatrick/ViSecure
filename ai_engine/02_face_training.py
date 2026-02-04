import cv2
import numpy as np
from PIL import Image
import os
import mysql.connector

# --- DATABASE CONNECTION ---
# We need this to translate "Patrick G. Miralion" -> ID 6
def get_db_connection():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="",
        database="visecure_db"
    )

def get_visitor_id_by_name(fullname):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Fetch the ID for the given name
        query = "SELECT VisitorID FROM visitors WHERE FullName = %s"
        cursor.execute(query, (fullname,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0] # Return the ID (e.g., 6)
    except Exception as e:
        print(f"[DB Error] {e}")
    
    return None

# --- SMART PATHS ---
script_dir = os.path.dirname(os.path.abspath(__file__))
dataset_path = os.path.join(script_dir, 'dataset')
trainer_folder = os.path.join(script_dir, 'trainer')
trainer_file = os.path.join(trainer_folder, 'trainer.yml')

recognizer = cv2.face.LBPHFaceRecognizer_create()
detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def getImagesAndLabels(path):
    if not os.path.exists(path):
        print(f"\n[CRITICAL ERROR] Could not find dataset folder at: {path}")
        exit()

    # Get all items in the folder (These are likely User Folders now)
    items = os.listdir(path)
    faceSamples = []
    ids = []
    
    print(f"[INFO] Scanning dataset at: {path}")

    valid_count = 0

    for item_name in items:
        item_path = os.path.join(path, item_name)

        # 1. CHECK IF IT IS A FOLDER (e.g., "Patrick G. Miralion")
        if os.path.isdir(item_path):
            folder_name = item_name # This is the Full Name
            
            # 2. ASK DATABASE FOR THE ID
            visitor_id = get_visitor_id_by_name(folder_name)
            
            if visitor_id is None:
                print(f"[SKIP] Could not find DB record for folder: '{folder_name}'")
                continue
            
            print(f"[PROCESSING] User: {folder_name} -> ID: {visitor_id}")

            # 3. PROCESS IMAGES INSIDE THE FOLDER
            image_files = [f for f in os.listdir(item_path) if f.lower().endswith(('.jpg', '.png'))]
            
            for image_file in image_files:
                image_full_path = os.path.join(item_path, image_file)
                
                try:
                    PIL_img = Image.open(image_full_path).convert('L') # Grayscale
                    img_numpy = np.array(PIL_img,'uint8')
                    
                    faces = detector.detectMultiScale(img_numpy)

                    for (x,y,w,h) in faces:
                        faceSamples.append(img_numpy[y:y+h,x:x+w])
                        ids.append(visitor_id)
                        valid_count += 1
                        
                except Exception as e:
                    print(f"[ERROR] Bad image: {image_file}")

        # 4. SUPPORT OLD FILE FORMAT (User.1.1.jpg) - Just in case
        elif os.path.isfile(item_path):
             # (Existing logic for flat files can go here if needed, but we focus on folders now)
             pass

    return faceSamples, ids, valid_count

print ("\n [INFO] Training faces from Backend Folders...")

faces, ids, count = getImagesAndLabels(dataset_path)

if count == 0:
    print("\n [ERROR] No faces found!")
    print(" Tip: Did you register via the Web App? Folders should be in 'ai_engine/dataset'.")
    exit()

recognizer.train(faces, np.array(ids))

if not os.path.exists(trainer_folder):
    os.makedirs(trainer_folder)

recognizer.write(trainer_file) 

print(f"\n [SUCCESS] {len(np.unique(ids))} visitors trained.")
print(f" [INFO] Total images: {count}")
print(f" [INFO] Model saved to: {trainer_file}")
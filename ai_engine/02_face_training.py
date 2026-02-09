import cv2
import numpy as np
from PIL import Image
import os
import json

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dataset_path = os.path.join(BASE_DIR, 'dataset')
trainer_path = os.path.join(BASE_DIR, 'trainer.yml')
names_path = os.path.join(BASE_DIR, 'names.json')

recognizer = cv2.face.LBPHFaceRecognizer_create()
detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def getImagesAndLabels(path):
    imagePaths = []
    faceSamples = []
    ids = []
    names = {}

    # Check if dataset exists
    if not os.path.exists(path):
        print("ERROR: Dataset folder not found!")
        return [], [], {}

    # Iterate through all user folders (e.g., "15_Doe_John")
    for folderName in os.listdir(path):
        folderPath = os.path.join(path, folderName)
        
        # Skip files, only check directories
        if not os.path.isdir(folderPath):
            continue

        # EXTRACT ID: "15_Doe_John" -> 15
        try:
            # Split by '_' and take the first part
            id_str = folderName.split('_')[0]
            id = int(id_str)
            names[id] = folderName # Map ID 15 to "15_Doe_John"
        except ValueError:
            print(f"[WARNING] Skipping folder '{folderName}' - No ID found at start.")
            continue

        # Get all images in this folder
        for imageFile in os.listdir(folderPath):
            if imageFile.endswith(".jpg") or imageFile.endswith(".png"):
                fullPath = os.path.join(folderPath, imageFile)
                PIL_img = Image.open(fullPath).convert('L') # Convert to grayscale
                img_numpy = np.array(PIL_img, 'uint8')

                # Detect face again to be sure
                faces = detector.detectMultiScale(img_numpy)
                for (x, y, w, h) in faces:
                    faceSamples.append(img_numpy[y:y+h, x:x+w])
                    ids.append(id)

    return faceSamples, ids, names

print("\n[INFO] Training faces. It will take a few seconds. Wait ...")
faces, ids, names_dict = getImagesAndLabels(dataset_path)

if len(ids) > 0:
    recognizer.train(faces, np.array(ids))
    recognizer.write(trainer_path)
    
    # Save the ID->Name mapping for the recognizer to use later
    with open(names_path, 'w') as f:
        json.dump(names_dict, f)

    print(f"\n[SUCCESS] {len(np.unique(ids))} faces trained. Exiting Program")
else:
    print("\n[ERROR] No faces found to train.")
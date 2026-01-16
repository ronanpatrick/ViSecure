import cv2
import face_recognition
import pickle
import os

# Path to the dataset of face images
dataset_path = "dataset"
encodings_file = "encodings.pickle"

# Initialize lists
known_encodings = []
known_names = []

# Ensure dataset exists
if not os.path.exists(dataset_path):
    print(f"[ERROR] Dataset folder '{dataset_path}' not found!")
    exit()

print("[INFO] Quantifying faces...")

# Loop over the image paths in the dataset directory
image_paths = [os.path.join(dataset_path, f) for f in os.listdir(dataset_path) if f.endswith(('.jpg', '.png'))]

if len(image_paths) == 0:
    print("[ERROR] No images found in 'dataset' folder. Run 01_face_dataset.py first.")
    exit()

for (i, image_path) in enumerate(image_paths):
    print(f"[INFO] Processing image {i + 1}/{len(image_paths)}")
    
    # Extract the person's name from the filename
    # Assumes format: User.Name.Count.jpg
    filename = os.path.basename(image_path)
    try:
        name = filename.split(".")[1]
    except IndexError:
        print(f"[SKIP] Filename '{filename}' format incorrect. Expected: User.Name.Num.jpg")
        continue

    # Load the image and convert it from BGR (OpenCV) to RGB (dlib)
    image = cv2.imread(image_path)
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Detect the (x, y)-coordinates of the bounding boxes corresponding to each face
    boxes = face_recognition.face_locations(rgb, model="hog")

    # Compute the facial embedding for the face
    encodings = face_recognition.face_encodings(rgb, boxes)

    # Loop over the encodings
    for encoding in encodings:
        known_encodings.append(encoding)
        known_names.append(name)

# Dump the facial encodings + names to disk
print("[INFO] Serializing encodings...")
data = {"encodings": known_encodings, "names": known_names}
f = open(encodings_file, "wb")
f.write(pickle.dumps(data))
f.close()

print("[INFO] Training Complete! 'encodings.pickle' created.")
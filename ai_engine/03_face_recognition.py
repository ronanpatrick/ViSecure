import cv2
import numpy as np
import os
import mysql.connector 

# --- DATABASE SETUP ---
def get_user_name_from_db(user_id):
    """
    Connects to MySQL to find the name belonging to the ID.
    """
    try:
        conn = mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password="",
            database="visecure_db"
        )
        cursor = conn.cursor()
        
        # We assume the table is named 'users' (Standard Laravel)
        query = "SELECT name FROM users WHERE id = %s"
        cursor.execute(query, (user_id,))
        
        result = cursor.fetchone()
        conn.close() # Close connection to save resources
        
        if result:
            return result[0] # Return the name
        else:
            return "Unknown"
            
    except mysql.connector.Error as err:
        print(f"[DB Error] {err}")
        return "Error"

# --- RECOGNIZER SETUP ---
recognizer = cv2.face.LBPHFaceRecognizer_create()

# Check if trainer exists
if not os.path.exists('trainer/trainer.yml'):
    print("[ERROR] Please run 02_face_training.py first!")
    exit()

recognizer.read('trainer/trainer.yml')
cascadePath = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
faceCascade = cv2.CascadeClassifier(cascadePath)

font = cv2.FONT_HERSHEY_SIMPLEX

# Start Camera
cam = cv2.VideoCapture(0)
cam.set(3, 640) 
cam.set(4, 480) 

# Define min window size
minW = 0.1*cam.get(3)
minH = 0.1*cam.get(4)

# LOCAL MEMORY (Cache)
# This prevents us from querying the DB 30 times a second
names_cache = {} 

print("\n [INFO] System Active. Looking for faces...")

while True:
    ret, img = cam.read()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    faces = faceCascade.detectMultiScale( 
        gray,
        scaleFactor = 1.2,
        minNeighbors = 5,
        minSize = (int(minW), int(minH)),
       )

    for(x,y,w,h) in faces:
        cv2.rectangle(img, (x,y), (x+w,y+h), (0,255,0), 2)
        
        # Recognize the face
        id, confidence = recognizer.predict(gray[y:y+h,x:x+w])

        # If confidence is less than 100, it's a match
        if (confidence < 100):
            # Check if we already looked up this ID
            if id not in names_cache:
                found_name = get_user_name_from_db(id)
                names_cache[id] = found_name # Save to cache
            
            name = names_cache[id]
            confidence_text = "  {0}%".format(round(100 - confidence))
        else:
            name = "Unknown"
            confidence_text = "  {0}%".format(round(100 - confidence))
        
        cv2.putText(img, str(name), (x+5,y-5), font, 1, (255,255,255), 2)
        cv2.putText(img, str(confidence_text), (x+5,y+h-5), font, 1, (255,255,0), 1)  

    cv2.imshow('ViSecure Recognition', img) 

    k = cv2.waitKey(10) & 0xff 
    if k == 27: 
        break

print("\n [INFO] Exiting Program")
cam.release()
cv2.destroyAllWindows()
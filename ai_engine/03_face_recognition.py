import cv2
import numpy as np
import os
import mysql.connector
import datetime
import time

# --- DATABASE SETTINGS ---
DB_CONFIG = {
    'host': "127.0.0.1",
    'user': "root",
    'password': "",
    'database': "visecure_db" 
}

# --- COOLDOWN SYSTEM ---
# Format: { visitor_id : timestamp_of_last_log }
log_cooldowns = {}
COOLDOWN_SECONDS = 60 

def get_visitor_info(visitor_id):
    """ Fetch Name AND Status from Database """
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Query for Name AND Status
        query = "SELECT FullName, Status FROM visitors WHERE VisitorID = %s"
        cursor.execute(query, (visitor_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            # Return (Name, Status) - Default to 'Active' if null
            status = result[1] if result[1] else 'Active'
            return result[0], status
        return "Unknown", "Active"
    except Exception as e:
        print(f"[DB Reading Error] {e}")
        return "Error", "Active"

def log_visit_to_db(visitor_id):
    """ Insert a new record into visit_logs """
    current_time = time.time()
    
    # 1. Check Cooldown
    if visitor_id in log_cooldowns:
        last_time = log_cooldowns[visitor_id]
        if current_time - last_time < COOLDOWN_SECONDS:
            return 

    # 2. Insert Log
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        sql = """INSERT INTO visit_logs (VisitorID, PurposeOfVisit) 
                 VALUES (%s, %s)"""
        val = (visitor_id, "Face Recognition Entry")
        
        cursor.execute(sql, val)
        conn.commit()
        conn.close()
        
        log_cooldowns[visitor_id] = current_time
        print(f"\n [SUCCESS] Visit Logged for ID {visitor_id}!")
        
    except mysql.connector.Error as err:
        print(f"\n [DB Writing Error] {err}")

# --- MAIN RECOGNITION LOOP ---
recognizer = cv2.face.LBPHFaceRecognizer_create()

# Get the folder where this script is running
script_dir = os.path.dirname(os.path.abspath(__file__))
trainer_path = os.path.join(script_dir, 'trainer', 'trainer.yml')

try:
    recognizer.read(trainer_path)
except cv2.error:
    print(f"\n[ERROR] Could not find trainer file at: {trainer_path}")
    print("Tip: Did you run '02_face_training.py' to generate it yet?")
    exit()

faceCascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
font = cv2.FONT_HERSHEY_SIMPLEX

cam = cv2.VideoCapture(0)
cam.set(3, 640)
cam.set(4, 480)
minW = 0.1 * cam.get(3)
minH = 0.1 * cam.get(4)

names_cache = {}

print("\n [INFO] ViSecure Eye Active. Press 'ESC' to quit.")

while True:
    ret, img = cam.read()
    if not ret: break
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = faceCascade.detectMultiScale(gray, 1.2, 5, minSize=(int(minW), int(minH)))

    for(x,y,w,h) in faces:
        cv2.rectangle(img, (x,y), (x+w,y+h), (0,255,0), 2)
        id, confidence = recognizer.predict(gray[y:y+h,x:x+w])

        if (confidence < 100):
            # 1. Get Name AND Status
            if id not in names_cache:
                names_cache[id] = get_visitor_info(id)
            
            name, status = names_cache[id]
            
            # 2. CHECK STATUS (The Enforcer Logic)
            if status == 'Banned':
                display_name = "ACCESS DENIED"
                color = (0, 0, 255) # RED Text
                # We DO NOT log the visit
            else:
                display_name = name
                color = (255, 255, 255) # White Text
                
                if name != "Unknown" and name != "Error":
                    log_visit_to_db(id)

            conf_text = "  {0}%".format(round(100 - confidence))
        else:
            display_name = "Unknown"
            color = (255, 255, 255)
            conf_text = "  {0}%".format(round(100 - confidence))
        
        cv2.putText(img, str(display_name), (x+5,y-5), font, 1, color, 2)
        cv2.putText(img, str(conf_text), (x+5,y+h-5), font, 1, (255,255,0), 1)  

    cv2.imshow('ViSecure Recognition', img) 
    
    if cv2.waitKey(10) & 0xff == 27: 
        break

cam.release()
cv2.destroyAllWindows()
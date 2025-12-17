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
    'database': "visecure_db" # Verify this matches your .env
}

# --- COOLDOWN SYSTEM ---
# This prevents spamming the database with 100 logs per minute
# Format: { visitor_id : timestamp_of_last_log }
log_cooldowns = {}
COOLDOWN_SECONDS = 60  # Wait 60 seconds before logging the same person again

def get_visitor_name(visitor_id):
    """ Fetch Visitor Name from Database """
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # NOTE: We are now querying the VISITORS table, not USERS
        # Make sure your visitors table has a column 'First_Name' or 'Name'
        # Adjust 'First_Name' below to match your actual column name
        query = "SELECT FullName FROM visitors WHERE VisitorID = %s"
        cursor.execute(query, (visitor_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0]
        return "Unknown"
    except Exception as e:
        print(f"[DB Reading Error] {e}")
        return "Error"

def log_visit_to_db(visitor_id):
    """ Insert a new record into visit_logs """
    # 1. Check Cooldown
    current_time = time.time()
    if visitor_id in log_cooldowns:
        last_time = log_cooldowns[visitor_id]
        if current_time - last_time < COOLDOWN_SECONDS:
            return # Too soon, skip logging

    # 2. Insert Log
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # We only insert VisitorID. 
        # EntryTimestamp is automatic. Status defaults to Active.
        sql = """INSERT INTO visit_logs (VisitorID, PurposeOfVisit) 
                 VALUES (%s, %s)"""
        val = (visitor_id, "Face Recognition Entry")
        
        cursor.execute(sql, val)
        conn.commit()
        conn.close()
        
        # Update cooldown
        log_cooldowns[visitor_id] = current_time
        print(f"\n [SUCCESS] Visit Logged for ID {visitor_id}!")
        
    except mysql.connector.Error as err:
        print(f"\n [DB Writing Error] {err}")
        print("Tip: Does VisitorID exist in the 'visitors' table?")

# --- MAIN RECOGNITION LOOP ---
recognizer = cv2.face.LBPHFaceRecognizer_create()
recognizer.read('trainer/trainer.yml')

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
            # 1. Get Name (and Cache it)
            if id not in names_cache:
                names_cache[id] = get_visitor_name(id)
            name = names_cache[id]
            
            # 2. LOG THE VISIT (The Magic Step)
            # Only log if we successfully found a name (ID exists)
            if name != "Unknown" and name != "Error":
                log_visit_to_db(id)

            conf_text = "  {0}%".format(round(100 - confidence))
        else:
            name = "Unknown"
            conf_text = "  {0}%".format(round(100 - confidence))
        
        cv2.putText(img, str(name), (x+5,y-5), font, 1, (255,255,255), 2)
        cv2.putText(img, str(conf_text), (x+5,y+h-5), font, 1, (255,255,0), 1)  

    cv2.imshow('ViSecure Recognition', img) 
    
    if cv2.waitKey(10) & 0xff == 27: 
        break

cam.release()
cv2.destroyAllWindows()
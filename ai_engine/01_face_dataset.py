import cv2
import os

# Check if dataset folder exists
if not os.path.exists('dataset'):
    os.makedirs('dataset')

cam = cv2.VideoCapture(0)
cam.set(3, 640) 
cam.set(4, 480) 

face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

face_id = input('\n enter user id (e.g., 1) and press <return> ==>  ')

print("\n [INFO] Initializing face capture. Look at the camera and wait ...")
count = 0

while(True):
    ret, img = cam.read()
    if not ret:
        print("Failed to capture image")
        break
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_detector.detectMultiScale(gray, 1.3, 5)

    for (x,y,w,h) in faces:
        cv2.rectangle(img, (x,y), (x+w,y+h), (255,0,0), 2)     
        count += 1
        
        # Save the captured image
        cv2.imwrite("dataset/User." + str(face_id) + '.' + str(count) + ".jpg", gray[y:y+h,x:x+w])

    # --- FIX IS HERE: This line is now OUTSIDE the 'for' loop ---
    cv2.imshow('image', img)

    k = cv2.waitKey(100) & 0xff
    if k == 27: # Press 'ESC' to quit
        break
    elif count >= 30: # Stop after 30 photos
         break

print("\n [INFO] Exiting Program and cleanup stuff")
cam.release()
cv2.destroyAllWindows()
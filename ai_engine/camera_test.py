import cv2

# 1. Load the pre-trained face detection model (Haar Cascade)
# This file usually comes with OpenCV automatically
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

video_capture = cv2.VideoCapture(0)

print("Face Detector Active! Press 'q' to quit.")

while True:
    # 2. Capture frame-by-frame
    ret, frame = video_capture.read()
    if not ret:
        break

    # 3. Convert to grayscale (AI detects faces better in black & white)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 4. Detect faces
    # scaleFactor=1.1 means reduce image size by 10% each pass to find big and small faces
    # minNeighbors=5 means how many "confirmations" we need to call it a face
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    # 5. Draw a rectangle around every face found
    for (x, y, w, h) in faces:
        # (x, y) is top-left corner, (w, h) is width and height
        # (0, 255, 0) is Green color, 2 is thickness
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

    # 6. Display the resulting frame
    cv2.imshow('ViSecure Face Detector', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

video_capture.release()
cv2.destroyAllWindows()
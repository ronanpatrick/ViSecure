# ViSecure: Biometric Visitor Management System

## Latest Features (Feb 9 Update)
* **Split Name Architecture:** Database now stores `FirstName`, `MiddleInitial`, and `Surname` separately for better analytics.
* **Smart Folder Structure:** Face datasets now use ID-based naming (`15_Doe_John`) to prevent duplicates and handle identical names.
* **Smart Camera Loading:** Fixed the "refresh bug" — the camera now automatically waits for the AI model to initialize before scanning.

## Setup for Developers

### 1. Clone the Repo
```bash
git clone [https://github.com/ronanpatrick/ViSecure.git](https://github.com/ronanpatrick/ViSecure.git)
cd ViSecure

cd backend
composer install
cp .env.example .env
# Edit .env: Set DB_DATABASE, AI_PYTHON_PATH, and AI_ENGINE_PATH
php artisan key:generate
php artisan storage:link
php artisan migrate

cd ../frontend
npm install

cd ../
pip install -r ai_engine/requirements.txt

cd backend
php artisan serve --host=0.0.0.0 --port=8000

cd frontend
npm run dev -- --host

python ai_engine/02_face_training.py
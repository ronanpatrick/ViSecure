# ViSecure: Biometric Visitor Management System

## Latest Features (Feb 8 Update)
* **Auto-Compression:** Automatically resizes high-res phone photos (10MB → 50KB) to prevent server crashes.
* **Mobile Optimized:** Fixed "Payload Too Large" errors; works smoothly on 4G/5G mobile data.
* **Live-Only Security:** Disabled file uploads to force live camera capture (Anti-Spoofing).
* **Smart AI:** Uses OpenCV LBPH + Haar Cascades for low-light recognition.
* **Privacy First:** Biometric datasets are local-only (not on GitHub).

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
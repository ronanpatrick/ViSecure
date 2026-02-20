from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import random
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

app = Flask(__name__)

# ==========================================
# 🧠 1. TRAFFIC PREDICTION MODEL (Regression)
# ==========================================
from sklearn.ensemble import RandomForestRegressor
import pandas as pd
import numpy as np
from datetime import datetime

@app.route('/predict-traffic', methods=['POST'])
def predict_traffic():
    try:
        data = request.json.get('history', [])
        if not data: return jsonify({"prediction": [0] * 24})

        df = pd.DataFrame(data)
        df['dt'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['dt'].dt.hour
        df['date'] = df['dt'].dt.date
        df['day_of_week'] = df['dt'].dt.dayofweek

        # 🧠 THE UPGRADE: Exponential Time Decay (Recency Bias)
        # Calculate how many days ago each visit happened
        today = pd.Timestamp.now().normalize()
        df['days_ago'] = (today - df['dt'].dt.normalize()).dt.days.clip(lower=0)
        
        # Apply a decay factor (0.95 means every day it gets 5% less important)
        decay_factor = 0.95
        df['weight'] = decay_factor ** df['days_ago']

        # ==========================================
        # STAGE 1: ML VOLUME PREDICTION
        # ==========================================
        # Group by date to see total daily traffic and the weight for that day
        daily_totals = df.groupby(['date', 'day_of_week']).agg(
            total=('hour', 'size'),
            day_weight=('weight', 'mean')
        ).reset_index()
        
        if len(daily_totals) < 3:
            predicted_volume = len(df) / max(len(daily_totals), 1)
        else:
            rf = RandomForestRegressor(n_estimators=50, random_state=42)
            
            # 🧠 UPGRADE: Tell the AI to prioritize the heavier (more recent) days
            rf.fit(
                daily_totals[['day_of_week']], 
                daily_totals['total'], 
                sample_weight=daily_totals['day_weight']
            )
            
            today_dow = datetime.today().weekday()
            predicted_volume = rf.predict(pd.DataFrame({'day_of_week': [today_dow]}))[0]

        # ==========================================
        # STAGE 2: SHAPE DISTRIBUTION
        # ==========================================
        # 🧠 UPGRADE: Instead of counting raw visits, we sum their WEIGHTS
        hourly_weights = df.groupby('hour')['weight'].sum()
        total_weight = df['weight'].sum()
        
        prediction = [0] * 24
        for hour, weight_sum in hourly_weights.items():
            # Probability is now weighted (recent patterns shift the curve more)
            probability = weight_sum / total_weight
            allocated_visitors = probability * predicted_volume
            
            prediction[hour] = int(np.ceil(allocated_visitors))

        return jsonify({"prediction": prediction})

    except Exception as e:
        print(f"❌ ML Error: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================
# 🧠 2. NLP PURPOSE CLASSIFIER (Naive Bayes)
# ==========================================

def train_nlp_model():
    """Generates synthetic data and trains the NLP model on startup."""
    print("⏳ Generating Synthetic NLP Dataset...")
    
    # ✅ VALID TEMPLATES
    valid_actions = ["submit", "claim", "process", "consult", "pay", "visit", "inquire", "request", "pick up", "drop off", "attend", "sign", "check"]
    valid_nouns = ["grades", "clearance", "documents", "schedule", "tuition", "allowance", "id", "prospectus", "requirements", "application", "transcript", "form", "permit"]
    valid_people = ["dean", "registrar", "nurse", "accountant", "prof", "instructor", "admin", "secretary", "security head", "counselor"]
    valid_places = ["library", "clinic", "registrar office", "cashier", "hr", "faculty room", "lab", "gym", "auditorium"]

    data = [] # <--- THIS WAS THE VARIABLE NAME

    # Generate 500 VALID examples (Label 0)
    for _ in range(500):
        data.append((f"{random.choice(valid_actions)} {random.choice(valid_nouns)}", 0))
        data.append((f"visit {random.choice(valid_people)}", 0))
        data.append((f"going to {random.choice(valid_places)}", 0))
        data.append((f"{random.choice(['inquiry', 'meeting', 'consultation'])} about {random.choice(valid_nouns)}", 0))

    # ❌ SUSPICIOUS TEMPLATES (Label 1)
    suspicious_phrases = [
        "stuff", "idk", "none", "trip", "wala", "tambay", "gimik", "secret", "personal",
        "just looking", "waiting", "standby", "loitering", "meet friend", "chilling",
        "passing by", "rest", "cr", "n/a", "unknown", "...", "no reason", "gala", "luh", "ewan",
        # 👇 ADD THESE EXACTLY AS YOU TYPE THEM
        "test", "test lang", "try", "demo", "sample", "visiting", "just visiting" 
    ]
    suspicious_modifiers = ["lang", "only", "just", "sa loob", "dyan lang", "po", "daw"]

    # Generate 500 SUSPICIOUS examples
    for _ in range(500):
        base = random.choice(suspicious_phrases)
        data.append((base, 1))
        data.append((f"{base} {random.choice(suspicious_modifiers)}", 1))
        data.append((f"just {base}", 1))

    # Train Model
    # 👇 FIXED: Changed 'nlp_data' to 'data'
    texts = [item[0] for item in data]
    labels = [item[1] for item in data]
    
    model = make_pipeline(CountVectorizer(), MultinomialNB())
    model.fit(texts, labels)
    
    print(f"✅ NLP Model Trained on {len(data)} examples!")
    return model

# Train immediately on server start
nlp_model = train_nlp_model()

@app.route('/check-purpose', methods=['POST'])
def check_purpose():
    try:
        purpose = request.json.get('purpose', '').lower()
        
        if not purpose:
            return jsonify({"is_suspicious": False, "confidence": 0})

        # Predict (0 = Valid, 1 = Suspicious)
        prediction = nlp_model.predict([purpose])[0]
        
        # Get Confidence Score
        proba = nlp_model.predict_proba([purpose])[0][prediction]
        
        # 🕵️‍♂️ DEBUG PRINT: Show us what happened!
        status = "🔴 SUSPICIOUS" if prediction == 1 else "🟢 SAFE"
        print(f"🧐 ANALYZING: '{purpose}'")
        print(f"   ↳ RESULT: {status} (Confidence: {round(proba * 100, 2)}%)")

        return jsonify({
            "purpose": purpose,
            "is_suspicious": bool(prediction == 1),
            "confidence": round(proba * 100, 2)
        })

    except Exception as e:
        print(f"❌ NLP Error: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================
# 🚀 SERVER STARTUP
# ==========================================
if __name__ == '__main__':
    print("🚀 AI Engine Server is running on port 5000")
    app.run(port=5000, debug=True)
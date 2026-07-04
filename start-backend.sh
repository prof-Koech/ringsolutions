#!/bin/bash
set -e
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "Creating virtualenv..."
  python3 -m venv venv
fi

source venv/bin/activate

# Install deps if needed
pip install -q flask flask-cors flask-jwt-extended flask-sqlalchemy flask-migrate flask-mail \
  python-dotenv psycopg2-binary celery redis phonenumbers pandas openpyxl requests \
  africastalking bcrypt werkzeug gunicorn

# Init DB and run dev setup
python3 dev_setup.py

# Start Flask
echo ""
echo "Starting RingSolutions API on http://localhost:5000"
FLASK_ENV=development python3 -m flask run --host=0.0.0.0 --port=5000

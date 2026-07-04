FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    gcc g++ libpq-dev \
    libpango-1.0-0 libpangoft2-1.0-0 \
    libffi-dev libcairo2 libgdk-pixbuf2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "wsgi:app", "--bind", "0.0.0.0:5000", "--workers", "4"]

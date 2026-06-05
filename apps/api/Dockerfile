FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV APP_ENV=production
ENV STORAGE_ROOT=/data/storage
ENV DATABASE_URL=sqlite:////data/speakcut.db
ENV SUBTITLE_FONT_PATH=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

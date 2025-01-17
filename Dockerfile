# Base image
FROM python:3.10-slim

# Set work directory
WORKDIR /greenamber

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the app code
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Start the application with PM2
CMD ["pm2-runtime", "start", "uvicorn", "--", "main:app", "--host", "0.0.0.0", "--port", "8000"]
# AllergyBuster

A comprehensive allergy management system that helps users track, manage, and understand their allergies.

## Features

- AI-powered chat assistance for allergy-related queries
- OCR-based medication scanning
- Symptom tracking and analysis
- Seasonal allergy alerts
- Medication reminders
- Doctor connectivity

## Quick Start

### Windows Users

1. Double-click `run.bat` in the root directory
   - This will automatically:
     - Set up the virtual environment
     - Install dependencies
     - Run migrations
     - Start the server
     - Run tests

### Manual Setup

#### Prerequisites

1. Python 3.11 or higher
2. Tesseract OCR installed on your system
3. Git (for cloning the repository)

#### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd allergy-buster-hackathon/backend
   ```

2. Create and activate a virtual environment:

   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/Mac
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   pip install -r ../../requirements.txt
   ```

4. Create a `.env` file in the backend directory with:

   ```
   DEBUG=True
   SECRET_KEY=your_secret_key_here
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
   DATABASE_URL=sqlite:///db.sqlite3
   ```

5. Run migrations:

   ```bash
   python manage.py migrate
   ```

6. Start the development server:

   ```bash
   python manage.py runserver
   ```

7. Test the server:
   ```bash
   python test_server.py
   python test_medication_api.py
   ```

#### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd allergy-buster-hackathon/frontend
   ```

2. Open `index.html` in your web browser or serve it using a local server.

## API Endpoints

- Chat API: `POST /api/chatbot/chat/`
- OCR API: `POST /api/chatbot/ocr/`
- Medication API: `GET /api/chatbot/medication/?name={medication_name}`
- Test API: `GET /api/chatbot/test-env/`

## Troubleshooting

1. **Server won't start**

   - Make sure you're in the correct directory (`allergy-buster-hackathon/backend`)
   - Check if port 8000 is available
   - Verify Python and virtual environment are properly set up

2. **Model loading issues**

   - Ensure you have enough disk space (model is ~730MB)
   - Check your internet connection
   - Verify Python environment has all required packages

3. **Connection refused errors**
   - Make sure the server is running
   - Check if you're using the correct URL (http://localhost:8000)
   - Verify no firewall is blocking the connection

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

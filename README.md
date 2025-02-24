# 3D Space Todo App

A futuristic 3D to-do list application that presents tasks as interactive 3D objects floating in space. Built with Flask, Three.js, and Matter.js.

## Features

- 3D visualization of tasks with floating cubes in space
- Physics-based interactions between tasks
- Voice input for task creation
- Ambient space sounds and effects
- AI-powered task prioritization
- Futuristic UI with neon effects
- Task completion animations
- Responsive 3D environment that reacts to mouse movement

## Prerequisites

- Python 3.7+
- Modern web browser with WebGL support

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 3d-space-todo
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the Flask development server:
```bash
python app.py
```

2. Open your web browser and navigate to:
```
http://localhost:5000
```

## Deployment

This application is configured for deployment on Vercel. To deploy:

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

## Usage

- Add tasks using the form on the right side
- Click the microphone button to use voice input
- Hover over tasks to see them glow and zoom
- Click on tasks to view details
- Complete tasks to see them disappear with an animation
- Toggle ambient sound with the audio button
- Clear all tasks with the clear button

## Technical Details

- Frontend: Three.js for 3D rendering, Matter.js for physics
- Backend: Flask for API and serving
- Storage: In-memory storage (no database required)
- Audio: Web Audio API for sound effects
- Voice Input: Web Speech API
- Deployment: Vercel-ready configuration

## License

MIT License - feel free to use this project for any purpose.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 
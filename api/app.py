from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import json
import random
import datetime
from collections import defaultdict
from google.generativeai import GenerativeModel
import google.generativeai as genai
from dotenv import load_dotenv
import os
load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)

# In-memory storage
tasks = []
task_id_counter = 1

# Initialize Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = GenerativeModel(os.getenv('GEMINI_MODEL',"gemini-2.5-flash"))

# AI-based priority scoring (simple implementation)
def calculate_priority(task):
    priority = 0
    if task.get('deadline'):
        deadline = datetime.datetime.strptime(task['deadline'], '%Y-%m-%d')
        days_left = (deadline - datetime.datetime.now()).days
        if days_left < 3:
            priority += 3
        elif days_left < 7:
            priority += 2
        else:
            priority += 1
    
    if task.get('urgent', False):
        priority += 2
    
    return priority

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def add_task():
    global task_id_counter
    data = request.json
    
    new_task = {
        'id': task_id_counter,
        'title': data['title'],
        'description': data.get('description', ''),
        'deadline': data.get('deadline'),
        'urgent': data.get('urgent', False),
        'completed': False,
        'position': {
            'x': random.uniform(-10, 10),
            'y': random.uniform(-10, 10),
            'z': random.uniform(-5, 5)
        },
        'created_at': datetime.datetime.now().isoformat()
    }
    
    new_task['priority'] = calculate_priority(new_task)
    tasks.append(new_task)
    task_id_counter += 1
    
    return jsonify(new_task)

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    for task in tasks:
        if task['id'] == task_id:
            task.update(data)
            task['priority'] = calculate_priority(task)
            return jsonify(task)
    return jsonify({'error': 'Task not found'}), 404

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    global tasks
    tasks = [task for task in tasks if task['id'] != task_id]
    return jsonify({'success': True})

@app.route('/api/clear', methods=['POST'])
def clear_tasks():
    global tasks, task_id_counter
    tasks = []
    task_id_counter = 1
    return jsonify({'success': True})

@app.route('/api/suggest', methods=['POST'])
def suggest_subtasks():
    task_title = request.json.get('title', '')
    
    # Simple rule-based subtask suggestions
    suggestions = []
    if 'project' in task_title.lower():
        suggestions = [
            "Plan project timeline",
            "Create project documentation",
            "Set up project repository",
            "Schedule kick-off meeting"
        ]
    elif 'presentation' in task_title.lower():
        suggestions = [
            "Create outline",
            "Design slides",
            "Prepare speaking notes",
            "Practice presentation"
        ]
    
    return jsonify(suggestions)

@app.route('/api/generate-tasks', methods=['POST'])
def generate_tasks():
    description = request.json.get('description', '')
    today = datetime.date.today().strftime('%Y-%m-%d')
    
    # Prompt for Gemini
    prompt = f"""
    Based on this project/work description: "{description}"
    Generate a list of 3-5 or more if required tasks in JSON format. Each task should have:
    - title (string)
    - description (string)
    - deadline (YYYY-MM-DD, within next 14 days from {today})
    - urgent (boolean, based on task nature)
    
    Format example:
    [{{
        "title": "Task name",
        "description": "Detailed description",
        "deadline": "2024-03-20",
        "urgent": true
    }}]
    """
    
    try:
        response = model.generate_content(prompt)
        print(response.text)
        tasks = json.loads(response.text.replace("```json", "").replace("```", ""))
        return jsonify(tasks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    return '', 204  # Return no content instead of 404

if __name__ == '__main__':
    app.run(debug=True) 

from flask import Flask
from flask_cors import CORS
import subprocess
import datetime

app = Flask(__name__)
CORS(app)

def capture_via_subprocess(fileName):
    command = [
        "ffmpeg",
        "-y",
        "-f", "v4l2",
        "-video_size", "1920x1080",
        "-input_format", "mjpeg",
        "-i", "/dev/video0",
        "-vframes", "1",
        "-update", "1",
        "-q:v", "2",
        f"{fileName}"
    ]
    
    try:
        result = subprocess.run(
            command, 
            check=True,
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        print(f"Success: Image saved as '{fileName}'")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Subprocess failed with code {e.returncode}")
        print("FFmpeg Error Output:")
        print(e.stderr.decode('utf8'))
        return False

def copy_file_to_share(source_file, destination_path):
    command = [
        "cp",
        source_file,
        destination_path
    ]

    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✅ File copied successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error copying file (Exit Code {e.returncode}):")
        print(e.stderr)
        return False
    except FileNotFoundError:
        print("❌ Error: 'sudo' or 'cp' command not found.")
        return False

@app.route('/')
def index():
    #destination = "~/windows_shared/"
    destination = "./windows_shared/"
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    unique_filename = f"screenshot_{timestamp}.jpeg"
    
    capture_success = capture_via_subprocess(unique_filename)
    copy_success = copy_file_to_share(unique_filename, destination)
    
    if capture_success and copy_success:
        return 'Success'
    else:
        return 'Error occurred during capture or copy'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False) # Use your desired port
#   app.run(debug=True)

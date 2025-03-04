@echo off
echo Installing required dependencies...
call npm install node-fetch@2 form-data

echo Running whisper API test...
node test-whisper-api.js

echo Test completed.
pause 
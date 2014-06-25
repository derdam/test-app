#!/bin/bash
# Script accept password using read commnad for e-mail password passed in parameter to command 'node app.js'

echo Starting node app.js ..

# Prompt for password and read it silently from console, storing value in gmailPwd variable
read -s -p "Gmail account password: " gmailPwd
echo ""

# start node app.js with gmailPwd variable value as argument
node app.js $gmailPwd



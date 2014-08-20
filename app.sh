#!/bin/bash

# This script will decrypt a configuration file and start an app that needs it.
# Decryption process is kept outside the app, so that a credential is needed to start the app.

# the plain configuration file has been encrypted using the following command:
# openssl aes-256-cbc -salt -in config.json -out config.json.enc
# note: a password (strong!) will be prompted for encryption and decryption.
# this password is used later as the credential needed to start the app.


# create(or replace) pipe for configuration
rm -f app-config/config.json

mkfifo -m 600 app-config/config.json

# decrypt config file for app
node app2.js & openssl aes-256-cbc -d -in ./app-config/config.json.enc -out app-config/config.json

# start node app.js. The app will read ./app-config/config.json on startup. 







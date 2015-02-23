from os import environ
import shelve
from flask import Flask
from flask import render_template
from flask import request, redirect, url_for
from flask import make_response, current_app
import simplejson as json
import re
import csv
from datetime import timedelta
from functools import update_wrapper

app = Flask(__name__)
LOCAL_PORT = 5000
port = int(environ.get("FLASK_PORT", LOCAL_PORT))
NOTES_DB = "notes"
SETTINGS_DB = "settings"

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/getinit/<userid>', methods = ['GET'])
def get_init(userid):
	data = []
	csv_file = open('data/user14-edf.csv', 'rU')
	input_file = csv.DictReader(csv_file)
	for row in input_file:
		data.append(row)

	notes = get_notes(userid)
	settings = get_settings(userid)
	return json.dumps({ 'data': data, 'notes': notes, 'settings': settings })

@app.route('/getnotes/<userid>', methods = ['GET'])
def get_notes(userid):
	notes_list = []
	notes_db = shelve.open(NOTES_DB)
	if (len(notes_db) > 0):
		userid = int(userid.strip())
		for key in notes_db.keys():
			value = notes_db[key]
			if value["key"]["userid"] == userid:
				notes_list.append(value)
		notes_db.close()
		return json.dumps(notes_list)
	else:
		notes_db.close()
		return '[]'

@app.route('/addnote', methods = ['POST'])
def add_note():
	json = request.get_json()
	key = str(json['key'])
	value = str(json['value'])
	# TODO: validate to avoid XSS attacks
	# valid = re.match('^([0-9a-zA-Z''])+$', value) is not None
	valid = True
	if (valid):
		# Save note to database
		notes_db = shelve.open(NOTES_DB)
		notes_db[key] = json
		notes_db.close()
		userid = str(json["key"]["userid"])
		return get_notes(userid)
	else:
		return '[]'

@app.route('/getsettings/<userid>', methods = ['GET'])
def get_settings(userid):
	settings_db = shelve.open(SETTINGS_DB)
	if (len(settings_db) > 0):
		userid = int(userid.strip())
		settings_json = json.dumps(settings_db['anomaly'])
		settings_db.close()
		return settings_json
		
	else:
		notes_db.close()
		return '[]'

@app.route('/addsetting', methods = ['POST'])
def add_setting():
	high = request.form['hr-high']
	low = request.form['hr-low']
	valid = re.match('^([0-9])+$', high) is not None
	valid = valid and (re.match('^([0-9])+$', low) is not None)
	if (valid):
		settings_db = shelve.open(SETTINGS_DB)
		settings_db['anomaly'] = { 'high': high, 'low': low }
		settings_db.close()
	return redirect(url_for('index'))

if __name__ == '__main__':
	app.debug = True
	app.run(port=port)
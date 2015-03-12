from os import environ
import shelve
from flask import Flask
from flask import render_template
from flask import request, redirect, url_for
from flask import make_response, current_app
import simplejson as json
import re
import csv
import urllib2
from datetime import timedelta
from functools import update_wrapper
from api_requests import APIRequests

app = Flask(__name__)
LOCAL_PORT = 5000
port = int(environ.get("FLASK_PORT", LOCAL_PORT))

if (port != LOCAL_PORT):
	app.config['SERVER_NAME'] = 'http://people.ischool.berkeley.edu/~tmeyers/server'

# CONSTANTS
NOTES_DB = "notes"
SETTINGS_DB = "settings"
SETTINGS_ANOMALIES_KEY = "anomalies"
DUMMY_DATA = False

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/getinit', methods = ['POST'])
def get_init():
	patientid = request.form['userid']
	activities = []
	if not DUMMY_DATA:
		csv_file, activities = get_api_data(patientid)
	else:
		csv_file = open('data/user14-edf.csv', 'rU')
	
	data = []
	input_file = csv.DictReader(csv_file)
	for row in input_file:
		data.append(row)

	notes = get_notes(patientid)
	settings = get_settings(patientid)
	app_data = { 
			'data': data, 
			'notes': notes, 
			'settings': settings,
			'activities': activities
		}
	return json.dumps(app_data)

def get_api_data(patientid):
	SUBVERB_KEY = "subVerb"
	STARTTIME_KEY = "startTime"
	ENDTIME_KEY = "endTime"
	csv = ""
	activities = []
	
	rs = APIRequests("http://russet.ischool.berkeley.edu:8080/query")
	j = rs.get_patient(patientid)

	# If no subverb, then use that CSV.  If subverb, use for activity display.
	for item in j["items"]:
		if SUBVERB_KEY not in item:
			# No subverb associated with activity.  Display EDF data.
			url = item["object"]["url"]
			csv = urllib2.urlopen(url)
		else:
			activity = {}
			# Get subverb details
			activity[STARTTIME_KEY] = item[STARTTIME_KEY]
			activity[ENDTIME_KEY] = item[ENDTIME_KEY]
			activity[SUBVERB_KEY] = item[SUBVERB_KEY]
			activities.append(activity)
	return csv, activities

@app.route('/changeuser', methods = ['POST'])
def change_user():

	return redirect(url_for('index'))	


@app.route('/getnotes/<userid>', methods = ['GET'])
def get_notes(userid):
	notes_list = []
	notes_db = shelve.open(NOTES_DB)
	if (len(notes_db) > 0):
		userid = userid.strip()
		for key in notes_db.keys():
			value = notes_db[key]
			print value
			if value["key"]["userid"] == userid:
				notes_list.append(value)
		notes_db.close()
		print notes_list
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
	if (len(settings_db) > 0 and SETTINGS_ANOMALIES_KEY in settings_db):
		userid = userid.strip()
		settings_json = json.dumps(settings_db[SETTINGS_ANOMALIES_KEY])
		settings_db.close()
		return settings_json
	else:
		settings_db.close()
		return '[]'

@app.route('/addsetting', methods = ['POST'])
def add_setting():
	settings_db = shelve.open(SETTINGS_DB)
	json = {}
	for key in request.form:
		val = request.form[key]
		valid = re.match('^([0-9])+$', val) is not None
		valid = valid and (re.match('^([0-9])+$', val) is not None)
		if (valid):
			json[key] = val

	settings_db[SETTINGS_ANOMALIES_KEY] = json
	settings_db.close()
	return redirect(url_for('index'))	

if __name__ == '__main__':
	app.debug = True
	app.run(port=port)
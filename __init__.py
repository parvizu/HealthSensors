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
DUMMY_DATA = True
#DUMMY_DATA_URL = 'data/user14-edf.csv'
DUMMY_EDF_URL = 'study/basis_edf_u14.csv'
DUMMY_ACTIVITIES_URL = 'study/acts_clean_u14.csv'

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/getinit', methods = ['POST'])
def get_init():
	userid = request.form['userid']
	if not DUMMY_DATA:
		csv_file, activities = get_api_data(userid)
	else:
		csv_file, activities = get_dummy_data()
	
	data = []
	input_file = csv.DictReader(csv_file)
	for row in input_file:
		data.append(row)

	notes = get_notes(userid)
	settings = get_settings(userid)
	app_data = { 
			'data': data, 
			'notes': notes, 
			'settings': settings,
			'activities': activities
		}
	return json.dumps(app_data)

def get_dummy_data():
	csv_file = open(DUMMY_EDF_URL, 'rU')
	activities_file = open(DUMMY_ACTIVITIES_URL, 'rU')
	# endTime: "2014-06-17T18:52:00.000Z"
	# startTime: "2014-06-17T18:14:00.000Z"
	# subVerb: "http://siemens.com/schemas/activity#Cycling"
	activities = []
	input_file = csv.DictReader(activities_file)
	for row in input_file:
		activities.append(row)
	return csv_file, activities

def get_api_data(userid):
	SUBVERB_KEY = "subVerb"
	STARTTIME_KEY = "startTime"
	ENDTIME_KEY = "endTime"
	csv = ""
	activities = []
	
	rs = APIRequests("http://russet.ischool.berkeley.edu:8080/query")
	j = rs.get_patient(userid)
	print j

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
	settings_list = []	
	settings_db = shelve.open(SETTINGS_DB)
	if (len(settings_db) > 0):
		userid = userid.strip()
		for key in settings_db.keys():
			value = settings_db[key]
			if value["key"]["userid"] == userid:
				settings_list.append(value)
		settings_db.close()
		return json.dumps(settings_list)
	else:
		settings_db.close()
		return '[]'

def validate_numeric(value):
	return re.match('^([0-9])+$', value) is not None

@app.route('/addsetting', methods = ['POST'])
def add_setting():
	json = request.get_json()
	key = str(json['key'])
	LOW_KEY = 'low'
	HIGH_KEY = 'high'
	low = json['value'][LOW_KEY]
	high = json['value'][HIGH_KEY]
	valid = validate_numeric(low)
	valid = valid and validate_numeric(high)
	if (valid):
		settings_db = shelve.open(SETTINGS_DB)
		settings_db[key] = json
		settings_db.close()
		userid = str(json["key"]["userid"])
		print userid
		return get_settings(userid)
	else:
		return '[]'

if __name__ == '__main__':
	app.debug = True
	app.run(host='0.0.0.0', port=port)
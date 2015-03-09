import requests
import simplejson as json

class APIRequests:

	postURL = ""

	def __init__(self, pURL):
		self.postURL = pURL

	def test_patient_data(self):
		headers = self.get_post_headers()
		params = json.dumps(self.test_patient_json())
		return self.post(self.postURL, params, headers)

	def get_test_patient_json(self):
		return APIRequests.byteify(self.test_patient_data().json())

	@staticmethod
	def get_post_headers():
		return {'Content-Type': 'application/json', 'charset': 'UTF-8'}

	@staticmethod
	def post(url, params, headers):
		try:
			r = requests.post(url, data=params, headers=headers)
			return r
		except requests.exceptions.RequestException:
			print "fail"
			raise
		else:
			pass
		finally:
			pass
		return None

	@staticmethod
	def test_patient_json():
		return {"actor.id":{"$in":["http://example.org/TestPatient"]},"verb":{"$in":["add"]},"object.objectType":{"$in":["exerciseRecord"]}}

	@staticmethod
	def byteify(input):
		if isinstance(input, dict):
			return {APIRequests.byteify(key):APIRequests.byteify(value) for key,value in input.iteritems()}
		elif isinstance(input, list):
			return [APIRequests.byteify(element) for element in input]
		elif isinstance(input, unicode):
			return input.encode('utf-8')
		else:
			return input

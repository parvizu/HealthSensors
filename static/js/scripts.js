var mainData, cleanData;
var chartTypes = { "line": 1, "bar": 2, "other": 0 }
var fields = {
		'atemp': {
			'description': 'Air Temperature',
			'chartType': chartTypes.other,
			'required': false,
			'display': false,
			'anomalies': {
				'h': 100, // default
				'l': 0, // default
				'display': false
			}
		},
		'time': {
			'description': 'Time',
			'chartType': chartTypes.other,
			'required': true,
			'display': false,
			'anomalies': {
				'h': 100, // default
				'l': 0, // default
				'display': false
			}
		},
		'GSR': {
			'description': 'Galvanic Skin Response',
			'chartType': chartTypes.other,
			'required': false,
			'display': false,
			'anomalies': {
				'h': 100, // default
				'l': 0, // default
				'display': false
			}
		},
		'HR': {
			'description': 'Heartrate',
			'chartType': chartTypes.line,
			'required': false,
			'display': true,
			'anomalies': {
				'h': 80, // default
				'l': 55, // default
				'display': true
			}
		},
		'stemp': {
			'description': 'Skin Temperature',
			'chartType': chartTypes.other,
			'required': false,
			'display': false,
			'anomalies': {
				'h': 100, // default
				'l': 0, // default
				'display': false
			}
		},
		'steps': {
			'description': 'Steps',
			'chartType': chartTypes.bar,
			'required': false,
			'display': true,
			'anomalies': {
				'h': 100, // default
				'l': 0, // default
				'display': false
			}
		}
	};

var subVerbIcons = {
	'cycling': '/static/css/images/bicycle-icon.png',
	'http://siemens.com/schemas/activity#Cycling': '/static/css/images/bicycle-icon.png',
	'walking': '/static/css/images/walking-icon.png',
	'transport': '/static/css/images/transport-icon.png'
}


var fullWeekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var userConfiguration = {
	'week':{
		'start': 0,
		'days':[],
		'maxValue':0,
		'data': []
	},
	'mainParameters': {},
	'active':'',
	'startDate': 0
}

var mainParameters = {
	'dayView': {
		'weekday': 0,
		'date': '',
		'dayEpoch': 0
	},
	'gantt' : {
		'width': 700,
		'height': fieldsToDisplay().length * 45, //190,
		'anomalyThreshold': 10, // number of consecutive anomalous minutes that trigger anomaly color
		'interval': 120 // in minutes
	},
	'general': {
		'interval': 1//, //in minutes
		//'timeScale': function(x) {return 0;}

	}
}

var chartConfigurations = {
	'dayView': {
/*		'timeScale': {
			'width': 1000,
			'height': 65,
			'margin': {
				'left': 35,
				'top': 0,
				'right': 45,
				'bottom': 0
			}
		},
*/		'charts': {
			'width': 1000,
			'height': 25,
			'zoomHeight': 75,
			'margin': {
				'left': 35,
				'top': 20,
				'right': 30,
				'bottom': 5
			},
			'anomalyColor': '#FF0000'
		}
	}
};

function fieldsToDisplay() {
	// Make list of fields we want to display in the viz
	var keys = [];
	for (var k in fields) {
		if (fields[k].display) {
			keys.push(k);
		}
	}
	return keys;
}

function anomalyFieldsToDisplay() {
	var keys = [];
	for (var k in fields) {
		if (fields[k].anomalies.display) {
			keys.push(k);
		}
	}
	return keys;
}

function missingVal(val) {
	return (val === "" || val === "None")
}

function newObj(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function dateToEpoch(time) {
	var myDate = new Date(time);
	return myDate.getTime()/1000.0;
}
function epochToDate(epoch) {
	return new Date(epoch * 1000);
}
function getTimeLabel(d) {
	var hours = String(Math.floor(d/60));
	var mins = String(d % 60);
	if (mins.length == 1) {
		mins = "0" + mins;
	}
	return hours + ":" + mins;
}

function showLoadingView() {
	$("#loading").show();
	$("#gantt").hide();
	$("#settings").hide();
}

function hideLoadingView() {
	$("#loading").fadeOut("fast", function() {
		$("#gantt").fadeIn();
		$("#settings").fadeIn();
	});
}

function rewindFieldView() {
	removeFieldTags();
	$(".ganttSide .active").removeClass("active");
	$("#breakdownHeader h3").html("");
	$("#changeIntervalSection").hide();
}

function changeUser() {
	var patientName = $("#patientId :selected").text();
	$("#mainData h1").html(patientName);
	
	showLoadingView();
	rewindFieldView();

	userid = $("#patientId").val();
	loadUser(userid);
}

var userid;
var dbNotes;
var dbActivities;

$(document).ready( function() {
	userid = "http://example.org/johndoe"
	loadUser(userid);
});

function loadUser(id) {

	// Load stuff from database
	url = 'getinit';
	var request = $.ajax({
		method: "POST",
		url: url,
		data: { userid: id }
	})

	request.done(function(data) {
		// Init values loaded.
		initValues = JSON.parse(data);
		dbData = initValues['data'];
		dbActivities = initValues['activities'];
		dbNotes = JSON.parse(initValues['notes']);
		dbSettings = JSON.parse(initValues['settings']);

		// Assign database settings to app variables
		setSettings(dbSettings);
		
		// Initialize visualization
		mainData = loadData(dbData);
		initialize(mainData[0].epoch);

		// TEMPORARY Uses the change button to update the interval.
		$("#interval").change(function() {
			var interval = $("#interval").val();
			if ($.isNumeric(interval) &&interval >0 && interval <=60 && interval !== '') {
				changeInterval(interval);
			}
			//$("#interval").text("");
		})
	
	});

	request.fail(function() {
		alert("Failed to load user data");
	});
}

function setSettings(dbSettings) {

	anomalyFields =  anomalyFieldsToDisplay();

	$.each(dbSettings, function(index, setting) {
		field = setting.key.field;
		for (propertyKey in setting.value) {
			propertyValue = setting.value[propertyKey];
			if (propertyKey == "high") {
				fields[field].anomalies.h = parseFloat(propertyValue);
			} else {
				fields[field].anomalies.l = parseFloat(propertyValue);
			}
		}
	});

}

function initialize(start) {
	getWeekData(start);
	buildGantt();
	// The line below adds HTML tags for each field.
	// I don't like that we do this now as opposed when we actually fill
	// the tags with field content when a field is clicked.
	addFieldTags();
}

function addFieldTags() {
	$.each(fieldsToDisplay(), function(i, field) {
		d3.select('#fields')
				.append('div')
				.attr('id', field)
				.attr('class', "subsection");
	});
}

function removeFieldTags() {
	$.each(fieldsToDisplay(), function(i, field) {
		d3.select('#' + field).remove();
	});
}

function loadData(file) {
	var dataDict = [];
	$.each(file, function(i,obj) {
		epoch = dateToEpoch(obj['time'].trim());
		datum = {};
		for (var property in fields) {
    		if (obj.hasOwnProperty(property)) {
    			datum[property] = obj[property].trim();
		   	} else if (fields[property].required) {
		   		alert("EDF data missing required " + property + " property.")
		   		return null;
		   	}
		}
		datum['epoch'] = epoch;
		dataDict.push(datum);
	});
	return dataDict;
}

function cleanData(data) {
	var clean = {};
	for (var i = 0; i<= 1439 ; i++) {
		clean[i] = '';
	}

	var min;
	$.each(data,function(i,d) {
		min = (d.epoch%3600)/60;
		hour = new Date(d.date).getUTCHours()
		minday = (hour*60)+min;
		clean[minday] = d;
	});

	return clean;
}


// function buildMainTable() {
// 	var scan = mainData[0];
// 	var str = "<td>Mr. John Doe</td><td>"+scan['HR']+"</td><td>"+scan['skinTemp']+"</td><td>"+scan['HR']+"</td><td></td>"
// 	$("#mainTableBody").append()
// }

/*
	Function that constructs the main week chart Gantt style based on the information of the week for all the different measurements. 

	The data used is in userConfiguration.week.data
*/
function buildGantt() {

	var weekdayNames = [];
	$.each(userConfiguration.week.data, function(i,day) {
		weekdayNames.push(day[0]);
	})

	setGanttHeader(weekdayNames)

	$("#gantt .chartContent").html("");
	var svg = d3.select('#gantt .chartContent').append('svg')
				.attr({
					'width': mainParameters.gantt.width - 20,
					'height': mainParameters.gantt.height
				});

	// Adding the day headers
	svg.selectAll('text')
		.data(weekdayNames)
		.enter()
		.append('text')
			.text(function(d) {
				return getDateDay(d);
			})
			.attr({
				'class':'dayHeader',
				'fill': 'black',
				'font-family': 'Helvetica',
				'x': function(d,i) {
					return 2+(i*95)+41;
				},
				'y':'20',
				'weekday': function(d,i) {
					return i;
				}
			})
			.on({
				'click': function (d,i) {
					createDayCharts(i,d.epoch);
				}
			});


	//Adding the vertical lines that divide the days
	for (var i = 0; i<8; i++) {
		svg.append('line')
			.attr({
				'x1': 3+(i*95)+i,
				'x2': 3+(i*95)+i,
				'y1': 10,
				'y2': 280,
				'stroke-width': .5,
				'stroke': 'black'
			})
	}
	//Adding the horizontal line that separates the day name
	svg.append('line')
		.attr({
			'x1': 3,
			'x2': 675,
			'y1': 30,
			'y2': 30,
			'stroke-width': .5,
			'stroke': 'black'
		})

	var weekData = []
	weekData = weekData.concat.apply(weekData,userConfiguration.week.data);

	/*
		Inner function that will create and append to the Gantt Svg the group of block for each measurement
	*/
	function addMeasurementBlocks(field,y) {
		var values =[];
		if (fields[field].chartType == chartTypes.line) {			
			values = getNonNullMeasurement(weekData,mainParameters.gantt.interval,field);
		} else {
			values = getAggregateMeasurement(weekData,mainParameters.gantt.interval,field);
		}
		
		var blockWidth = Math.floor(mainParameters.gantt.width/(values.length)-1);
		if (blockWidth < 1) {
			alert("Error: Gantt block interval too small.");
		}
		if (values.length > 0) {
			gs = d3.select('div.ganttSide');
			if (gs.select('.' + field).empty()) {
				// Add measurement headers
				gs.append('div')
					.attr('class', 'measurement ' + field)
					.text(fields[field].description)
					.on("click", function() {
						// Activate menu item
						$(".measurement").removeClass("active");
						$(this).addClass("active");

						// Show measurement data (use set timeout to force above code to execute first)
						mname = $(this).attr("class").split(' ')[1];
						setTimeout(function() {
							showFieldWeek(mname);
						}, 1 );
					});
			}

			gs = d3.select('div#rightSideGantt');
			var fieldTag = field + '-settings';
			if (gs.select('.' + fieldTag).empty()) {
				gs = gs.append('div')
					.attr('class', 'measurement-container');

				var link = gs.append('a')
					.attr('href', '#')
					.attr('class', 'editSettings')
					.attr('onclick', 'openSettingsDialog(\"' + field + '\");')
					.html('<span class="' + fieldTag + ' measurement field-settings"></span>Edit Settings');
			}
				
			// Creating and appending the rectangles that will represent the x-hour blocks of time.
			svg.append('g')
				.attr('class',field)
				.selectAll('rect')
				.data(values)
				.enter()
				.append('rect')
				.attr({
					'width':blockWidth,
					'height':blockWidth,
					'x': function(d,i) {
						return 4+(i*blockWidth)+(i);
					},
					'y': 40+y,
					'fill': function(d) {
						fillVal = "#e9e9e9"; // 0
						if (d['value'] > 50) { // percent of interval that is nonnull values
							if (parseInt(d['anomalies']['maxConsecutive']) > mainParameters.gantt.anomalyThreshold) {
								// Anomalous block
								fillVal = "red";
							} else {
								// Regular block
								fillVal = "#777";
							}
						}
						return fillVal;
					},
					'value': function(d) {
						return d['value']
					}
				});

			values = [];
		}
	}

	$.each(fieldsToDisplay(), function(i,key) {
		addMeasurementBlocks(key, i*33);
	});

	hideLoadingView();
}

function getNonNullMeasurement(data, interval, field) {
	var count = 0, agg=0;
	var results = [];
	var minute;
	var measurements = 0;
	var anomalyOver = [];
	var anomalyUnder = [];
	var consecutiveAnomalies = 0;
	var maxConsecutiveAnomalies = 0;

	$.each(data, function(i, d) {
		minute = i + 1;
		count++;
		endOfInterval = (minute % interval == 0);
		if (!missingVal(d[field])) {
			var value = parseInt(d[field]);
			agg += value;
			measurements++;

			if (value > fields[field].anomalies.h) {
				anomalyOver.push(d);
				consecutiveAnomalies++;
			} else if (value < fields[field].anomalies.l) {
				anomalyUnder.push(d);
				consecutiveAnomalies++;
			}
			if ((value < fields[field].anomalies.h && 
				value > fields[field].anomalies.l && 
				consecutiveAnomalies > 1)) {
				// If there are 0 or 1 consecutive anomalies, we don't care
				// If there are two or more consecutive anomalies, we consider that a chain.  That chain is now broken.
				maxConsecutiveAnomalies = Math.max(consecutiveAnomalies, maxConsecutiveAnomalies);
				consecutiveAnomalies = 0;
			}

		}

		if (endOfInterval) {
			maxConsecutiveAnomalies = Math.max(consecutiveAnomalies, maxConsecutiveAnomalies);
			consecutiveAnomalies = 0;
		}

		if (endOfInterval) {
			var perc = 0;
			if (measurements > 0) {
				perc = (measurements / count) * 100;
			}
			var res = {
				'value': perc,
				'measurements': measurements,
				'anomalies': {
					'over': anomalyOver,
					'under': anomalyUnder,
					'maxConsecutive': maxConsecutiveAnomalies,
					'total': anomalyOver.length + anomalyUnder.length
				}
			}
			
			results.push(res);
			agg = 0;
			count = 0;
			measurements = 0;
			anomalyOver = [];
			anomalyUnder = [];
			maxConsecutiveAnomalies = 0;
			consecutiveAnomalies = 0;
		}
	});
	return results;
}
	
function getAggregateMeasurement(data,interval,field) {
	var agg =0;
	var results = []
	var minute;
	var measurements =0;
	var anomalyOver = [];
	var anomalyUnder = [];

	$.each(data,function(i,d) {
		minute = i+1;
		if (!missingVal(d[field])) {
			var value = parseInt(d[field]);
			agg += value;
			measurements++;
			if (fields[field].anomalies.display) {
				if (value > fields[field].anomalies.h) {
					anomalyOver.push(d);
				}
				else if (value < fields[field].anomalies.l) {
					anomalyUnder.push(d);
				}
			}
		}

		if (minute%interval == 0 ) {
			var res = {
				'value': agg,
				'measurements': measurements,
				'average': agg/measurements,
				'anomalies': {
					'over': anomalyOver,
					'under': anomalyUnder,
					'total': anomalyOver.length + anomalyUnder.length
				}
			}
			results.push(res);
			agg = 0;
			measurements= 0;
			anomalyOver= [];
			anomalyUnder = [];
		}
	})
	return results;
}



/*
	Function that creates the configuration file that is needed to create the different chart for each measurement. 
*/
function createConfigFile(data,target,id,field) {
	var configData = setConfigData(data, field);
	var startTime = data[0];

	return {
		target: target,
		id: id,
		className: field,
		margin: {
			'top': chartConfigurations.dayView.charts.margin.top,
			'right': chartConfigurations.dayView.charts.margin.right,
			'bottom': chartConfigurations.dayView.charts.margin.bottom,
			'left': chartConfigurations.dayView.charts.margin.left
		},
		day: getDateDay(startTime),
		date: new Date(startTime.time),
		epoch: startTime.epoch,
		width: chartConfigurations.dayView.charts.width,
		height: chartConfigurations.dayView.charts.height,
		data: configData.simple,
		interpolate: 'basis',
		xAxisData: '',
		yAxisData: '',
		anomalies: getDataAnomalies(configData.full, field)
	}
}

/*
	Function that processes the data for one day and then detects the moments when the heart rate was over or under the defined parameters.

	@returns Object that includes two arrays: One array of pairs of data values (beginning and end) of the moments above the normal range. Another array with the same structure but for moments under the normal range.
*/
function getDataAnomalies(data,field) {
	var temp = [];
	var high = false;
	var low = false;
	var prev;
	var anomalies = { high:[], low:[]};
	if (fields[field].anomalies.display) {
		$.each(data, function(i,d) {
			if (d[field] > fields[field].anomalies.h && !missingVal(d[field])) {
				if (low) {
					prev = data[i-1];
					prev['id'] = (i-1);
					temp.push(prev);
					anomalies.low.push(temp);
					temp = [];
					low = false;
				}

				if (!high) {
					d['id'] =i;
					temp.push(d);
					high = true;
				}
			}
			else {
				if (high) {
					if (temp[0].epoch != data[i-1].epoch) {
						prev = data[i-1];
						prev['id'] = (i-1);
						temp.push(prev);	
					}
					anomalies.high.push(temp);
					temp = [];
					high = false;
				}
			}
			
			if (d[field] < fields[field].anomalies.l && !missingVal(d[field])) {
				if (high) {
					prev = data[i-1];
					prev['id'] = (i-1);
					temp.push(prev);
					anomalies.high.push(temp);
					temp = [];
					high = false;
				}

				if (!low) {
					d['id'] =i;
					temp.push(d);
					low = true;
				}
			}
			else {
				if (low) {
					if (temp[0].epoch != data[i-1].epoch) {
						prev = data[i-1];
						prev['id'] = (i-1);
						temp.push(prev);
					}
					anomalies.low.push(temp);

					temp = [];
					low = false;
				}
			}

		});
	}
	return anomalies;
}

/*
	Simple function that analizes the date and returns the name of the day of the week.
*/ 
function getDateDay(date) {
	var weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	var d = new Date(date['time']);
	return weekdays[d.getDay()];
}

/*
	This function returns the data used to create the different charts but considering the interval defined as a parameter in the mainParameters.general.interval element.

	It also takes in consideration the type of chart that will be built so it can transform/aggregate the data in the correct way (aggregate for bars, average for lines)
*/
function setConfigData(data, field) {
	var configData = { 
			'simple': [],
			'full': []
		}
	var aggregate = 0;

	if (fields[field].chartType == chartTypes.bar) {
		$.each(data, function(i,d) {
			var time = new Date(d.time);
			var minute = i+1;
			if (!missingVal(d[field]) && d.epoch !=="") {	
				aggregate += parseInt(d[field]);
			}

			if (minute%mainParameters.general.interval == 0) {
				configData.simple.push(aggregate);
				aggregate = 0;
			}	
			
		});
		// return configData;
	}
	else {
		$.each(data, function(i,d) {
			//selects intervals of minutes (600 = 10 mins, 300 = 5 mins, etc...)
			var time = new Date(d.time);
			if (time.getMinutes() % mainParameters.general.interval == 0) {
				//if (d[field] === 'None' || d.epoch =="") {	
				if (d.epoch == "") {	
					configData.simple.push("0");
				}
				else {
					configData.simple.push(d[field]);	
				}
				configData.full.push(d);
			}
		});
	}
	return configData;
}	

/*
* Get the max or min of an array that may contain strings
*/
function minMaxMixedArray(array) {
	var minValue;
	var maxValue;
	for (var i = 0; i < array.length; i++) {
		if ($.isNumeric(array[i])) {
			var val = parseFloat(array[i]);
			if (minValue === undefined || maxValue === undefined) {
				minValue = val;
				maxValue = val;
			}
			if (val < minValue) {
				minValue = val;
			}
			if (val > maxValue) {
				maxValue = val;
			}
		}
	}
	return [minValue, maxValue];
}

function createLineChart(config) {
	var margin = {
			top: config.margin.top, 
			right: config.margin.right, 
			bottom: config.margin.bottom, 
			left: config.margin.left
		},
	    width = config.width;
	    height = config.height;

	var xStart = 0;
	var xEnd = config.data.length;

	var xBase = d3.scale.linear()
		.domain([xStart, xEnd])
	    .range([0, width]);

	// Since the choice of x-scale will depend on whether we're zoomed in,
	// we can define multiple x's, but set the one we're currently using
	// in xCurrent.
	var x = xBase;

	var zoomData = config.data;

	// TODO: kill function below and use x.invert
	var xInverse = d3.scale.linear()
		.domain([0, width])
	    .range([0,config.data.length]);	
	
	// Get min and max values from data.  If anomaly threshold is lower/higher than min/max data, use those
	// values as extrema
	var minMaxValue = minMaxMixedArray(config.data);
	if (minMaxValue[0] === undefined || minMaxValue[1] === undefined) {
		minMaxValue[0] = 0;
		minMaxValue[1] = 100;
	} else {
		if (minMaxValue[0] > config.anomalies.low) {
			minMaxValue[0] = config.anomalies.low;
		}
		if (minMaxValue[1] < config.anomalies.high) {
			minMaxValue[1] = config.anomalies.high;
		}
	}

	var y = d3.scale.linear()
		.domain(minMaxValue) 
	    .range([height, 0]);

	var yZoom = d3.scale.linear()
		.domain(minMaxValue)
		.range([chartConfigurations.dayView.charts.zoomHeight, 0]);

	var xBaseAxis = d3.svg.axis()
	    .scale(xBase)
	    .orient("bottom");

	var xAxis = d3.svg.axis()
		.outerTickSize([0])
		.innerTickSize([2])
		.tickFormat(function(d) { 
			var label = getTimeLabel(d);
			if (d % 60 == 0) {
				return label;
			} else {
				return "";
			}
		})
		.tickValues(d3.range(0, 60*24, 10))
	    .scale(x)
	    .orient("top");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("right");

	var yAxisZoom = d3.svg.axis()
		.scale(yZoom)
		.ticks(3)
		.tickSize(8, 1)
		.orient("right")

	var line = d3.svg.line().defined(function(d) { return !missingVal(d) })
	    .x(function(d,i) { return x(i); })
	    .y(function(d) { return y(d); });

	var lineZoom = d3.svg.line().defined(function(d) { return !missingVal(d) })
	    .x(function(d,i) { return x(i); })
	    .y(function(d) { return yZoom(d); });

	getDayHeadersForWeeklyCharts(config.target,config.id,config.className,config.day);
	
	d3.select(config.target + " #" + config.id)
		.append('div')
			.attr("class","chartDayArea");

	// Create SVGs for day line charts (zoomed and all-day)
	var dayContainer = d3.select("#" + config.id + " .chartDayArea");

	// This is the taller SVG where "zoomed in" chart appears.
	var svgZoom = dayContainer.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", chartConfigurations.dayView.charts.zoomHeight + margin.top + margin.bottom)
		.attr("class", "lineChartZoom")
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Add rectangle to track cursor
	svgZoom.append("rect")
		.attr("class", "rectTrackCursor")
		.attr("width", width)
	    .attr("height", chartConfigurations.dayView.charts.zoomHeight + margin.bottom)
	    .attr("fill", "#FFFFFF")
	    .on("mouseover", cursorShow)
	    .on("mouseout", cursorHide)
	    .on("mousemove", trackCursor)
	    .on("mousedown", makeNote);

	// Add dot to highlight cursor position
	var cursorDot = svgZoom.append("circle")
		.attr("class", "cursorXPos")
		.attr("cx", 0)
		.attr("cy", 0)
		.attr("r", 3)
		.style("display", "none");

	// Add text to show values at cursor
	var cursorText = svgZoom.append("text")
		.text("hello")
		.attr("y", 12)
		.attr("x", 0)
		.attr("class", "cursorText");

	var markerGroup = svgZoom.append("g")
		.attr("class", "markers")

	// This is the shorter SVG where you can manipulate zoom
	var svg = dayContainer.append("svg")
		.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.bottom) // add 15 for x axis if you need it
	    .attr("class", "lineChart")
	    .attr("style", "cursor: crosshair")

	svg.append("image")
		.attr("xlink:href", "/static/css/images/search-icon.png")
		.attr("x", 1)
		.attr("y", 10)
		.attr("height", "12px")
		.attr("width", "12px")
		.attr("opacity", 0.7);

	svg = svg.append("g")
	    	.attr("transform", "translate(" + margin.left + ",0)");

	// Make background rectangle to handle mouse events
	svg.append("rect")
		.attr("width", width)
	    .attr("height", height + margin.bottom)
	    .attr("fill", "#FFFFFF");

	// Make zoom selection rectangle
	svg.append("rect")
		.attr("class", "rectZoom")
		.attr("width", width)
		.attr("height", height + margin.bottom);

	svg.append("path")
		.datum(config.data)
		.attr("class", "line")
		.attr("d", line)
		.attr("transform","translate("+(x(1)-1)+")");

	pathZoom = svgZoom.append("path")
		.datum(config.data)
		.attr("class", "lineZoom")
		.attr("d", lineZoom)
		.attr("transform","translate("+(x(1)-1)+")");

	var anomalyLine = d3.svg.line()
		.x(function(d) { return x(d.x); })
    	.y(function(d) { return y(d.y); });

    var anomalyLineZoom = d3.svg.line()
		.x(function(d) { return x(d.x); })
    	.y(function(d) { return yZoom(d.y); });

	AddAnomalyLine(config,svg,fields[config.className].anomalies.h, anomalyLine, y);
	AddAnomalyLine(config,svg,fields[config.className].anomalies.l, anomalyLine, y);
	AddAnomalyLine(config,svgZoom,fields[config.className].anomalies.h, anomalyLineZoom, yZoom);
	AddAnomalyLine(config,svgZoom,fields[config.className].anomalies.l, anomalyLineZoom, yZoom);

	if (fields[config.className].anomalies.display) {
		AddAnomaliesToChart(svg, config.anomalies.high, "h", y);
		AddAnomaliesToChart(svg, config.anomalies.low, "l", y);
		AddAnomaliesToChart(svgZoom, config.anomalies.high, "h", yZoom);
		AddAnomaliesToChart(svgZoom, config.anomalies.low, "l", yZoom);
	}

    svgZoom.append("g")
    	.attr("class", "axisBar")
    	.attr("transform","translate(" + config.width + ",0)")
    	.call(yAxisZoom);

    svgZoom.append("g")
    	.attr("class", "xAxisBar")
    	//.attr("transform", "translate(0," + chartConfigurations.dayView.charts.zoomHeight + ")")
    	.call(xAxis);

	// Handle cursor tracking on taller SVG
	function trackCursor() {
		var xPixels = d3.mouse(this)[0];
		var xIndex = Math.floor(x.invert(xPixels));
		var xDiscrete = x(xIndex);
		var yPixels = zoomData[xIndex];

		if (missingVal(yPixels)) {
			yPixels = 0;
		} else {
			trackedYPos = yPixels;
		}

		cursorDot
			.attr("cx", xDiscrete)
			.attr("cy", yZoom(yPixels))
			.style("display", function() { return (yPixels == 0) ? "none":"block" });

		cursorText
			.text(cursorTrackText(xStart + xIndex, yPixels))
			.style("display", function() { return (yPixels == 0) ? "none":"block" });
		
	};

	function readNote(d) {
		dayEpoch = (d - config.epoch) / 60 // Total minutes into day
		xPixels = x(dayEpoch)
	 	var epoch = getEpochFromPixels(xPixels);
	 	openAnomalyDialog(this, xPixels, epoch);
	}

	function makeNote() {
		var xPixels = d3.mouse(this)[0];
		var epoch = getEpochFromPixels(xPixels);
		openAnomalyDialog(this, xPixels, epoch);
	}

	function getEpochFromPixels(xPixels) {
		var xIndex = Math.floor(x.invert(xPixels));
		return config.epoch + (xStart + xIndex) * 60
	}

	function addNotesToChart(notes) {
		// Add notes to chart
		listEpochs = [];
		for (var i=0; i < notes.length; i++) {
			var noteEpoch = notes[i].key.epoch
			var dayEpoch = noteEpoch - config.epoch;
			if (dayEpoch > 0) {
				listEpochs.push(noteEpoch);
				addNoteMarker(listEpochs, config.epoch);
			}
		}
	}

	function addActivitiesToChart(activities, svg, isZoomSVG) {
		//targetSvg, anomalies, type, y
		
		$.each(activities, function(i,d) {

			startEpoch = dateToEpoch(d.startTime);
			endEpoch = dateToEpoch(d.endTime);
			var dayStartMinutes = (startEpoch - config.epoch)/60;
			var dayEndMinutes = (endEpoch - config.epoch)/60;

			if (dayStartMinutes < xStart && dayEndMinutes >= xStart && dayEndMinutes <= xEnd) {
				dayStartMinutes = xStart;
			}
			if (dayStartMinutes >= xStart && dayStartMinutes <= xEnd && dayEndMinutes > xEnd) {
				dayEndMinutes = xEnd;
			}
			if (dayStartMinutes >= xStart && dayEndMinutes <= xEnd) {
				//svgZoom.insert("rect", ":first-child")

				var g = svg.append("g")
					.attr("class", "activity")

				g.append("rect")
					.attr("x", x(dayStartMinutes - xStart))
					.attr("y", 0)
					.attr("width", function() {
						minutesBetween = dayEndMinutes - dayStartMinutes;
						return x(minutesBetween);
					})
					.attr("height", chartConfigurations.dayView.charts.zoomHeight + margin.top + margin.bottom)
					.attr("fill", "#551A8B")
					.attr("opacity", isZoomSVG ? 0.3 : 0.1)
					.attr("class", "activity")
					.append("svg:title")
   					.text(d.subVerb);

   				if (isZoomSVG) {
	   				g.append("image")
	   					.attr("xlink:href", subVerbIcons[d.subVerb])
	   					.attr("x", x(dayStartMinutes - xStart) + 3)
	   					.attr("y", 7)
	   					.attr("width", "14")
	   					.attr("height", "10");   					
	   			}
			}
		});
	}

	function cursorShow() {
		cursorDisplay(true);
	}

	function cursorHide() {
		cursorDisplay(false);
	}

	function cursorDisplay(bool) {
	    cursorDot.style("display", bool ? "block":"none");
	    cursorText.style("display", bool ? "block":"none");
	}

	// Handle zooming on shorter SVG
  	svg.on("mousedown", function() {
  		// Store x-value
  		var rect = d3.select(this);
  		var xDown = d3.mouse(this)[0];
  		var xNow;
  		var parent = d3.select(this.parentNode);
  		rectZoom = parent.select(".rectZoom");
  		rectZoom.attr("transform", "translate(" + xDown + ",0)");
  		rectZoom.attr("width", 0)
  		var selectionWidth;
  		
  		var w = d3.select(window)
      		.on("mousemove", mousemove)
      		.on("mouseup", mouseup);

  		d3.event.preventDefault(); // disable text dragging

  		function mousemove() {
  			xNow = d3.mouse(rect.node())[0];
  			selectionWidth = Math.abs(xNow - xDown);
  			if (xNow < xDown) {
  				// Selection was made from right to left
  				rectZoom.attr("transform", "translate(" + xNow + ",0)");
  			}
  			
  			if (selectionWidth > 0) {
  				rectZoom.attr("width", selectionWidth)
  			}
  			
  		}

  		function mouseup() {
    		w.on("mousemove", null).on("mouseup", null);
    		if (xNow !== undefined) {
	    		// Refresh zoomed chart
	    		xStart = Math.floor(xInverse(Math.min(xDown, xNow)));
				xEnd = Math.floor(xInverse(Math.max(xDown, xNow)));
				// TODO: we're assuming here that every index is a minute of data
				zoomData = config.data.slice(xStart,xEnd);

				anomaliesLow = AnomaliesSubset(xStart,xEnd,config.anomalies.low);
				anomaliesHigh = AnomaliesSubset(xStart,xEnd,config.anomalies.high);

				activities = activitiesSubset(xStart, xEnd, config);
				
				notes = notesSubset(xStart, xEnd, config);

	    		RefreshZoomChart(zoomData, config, anomaliesLow, anomaliesHigh, notes, activities);
    		} else {
    			// Clear rectangle and reset zoom
    			xStart = 0;
    			xEnd = config.data.length;
  				rectZoom.attr("transform", "translate(0,0)")
  				rectZoom.attr("width", width + margin.left + margin.right)
    			RefreshZoomChart(config.data, config, config.anomalies.low, config.anomalies.high, dbNotes, dbActivities);
    		}
  		}

	});

	function RefreshZoomChart(data, config, anomaliesLow, anomaliesHigh, notes, activities) {

		// Set new zoom data
		zoomData = data;

		var yAxisZoom = d3.svg.axis()
			.scale(yZoom)
			.ticks(3)
			.tickSize(8, 1)
			.orient("right")

		// Reset the scale for the zoomed line
		x = d3.scale.linear()
			.domain([0, data.length])
		    .range([0, config.width]);

		var labelInterval = 10;
		var tickOffset = 1;
		if (data.length > 60 * 23) {
			labelInterval = 60;
			tickOffset = 10;
		} else if (data.length > 60 * 12) {
			labelInterval = 60;
		} else if (data.length > 240) {
			labelInterval = 30;
		}
		var xAxis = d3.svg.axis()
			.outerTickSize([0])
			.innerTickSize([2])
			.tickFormat(function(d) { 
				var label = getTimeLabel(d + xStart);
				if ((d + xStart) % labelInterval == 0) {
					return label;
				} else {
					return "";
				}
			})
			.tickValues(d3.range(0, data.length, tickOffset))
	    	.scale(x)
	    	.orient("top");

		// Create a new line with the new scale
		var line = d3.svg.line().defined(function(d) { return !missingVal(d) })
		    .x(function(d,i) { return x(i); })
		    .y(function(d) { return yZoom(d); });

		// Select the zoomed line
		svgZoom = d3.select("#" + config.id + " div svg.lineChartZoom g");

		//svgZoom.select(".axisBar")
    	//	.call(yAxisZoom);

    	svgZoom.select(".xAxisBar")
    		.call(xAxis);

		lineZoom = svgZoom.select("path.lineZoom");
		
		// Update the zoomed line data
		lineZoom
			.data([zoomData])
			.attr("d", line);

		// Save important rectangle before clearing all of the anomaly rectangles
		rectTrackCursor = svgZoom.select(".rectTrackCursor").node();

		// Remove all rectangles (to clear anomalies)
		svgZoom.selectAll("rect").remove();
		svgZoom.selectAll(".point").remove();
		svgZoom.selectAll(".activity").remove();

		// Add anomalies
		if (fields[config.className].anomalies.display) {
			AddAnomaliesToChart(svgZoom, anomaliesHigh, "h", yZoom);
			AddAnomaliesToChart(svgZoom, anomaliesLow, "l", yZoom);
		}
		// Add markers
		addNotesToChart(notes);

		// Add activities
		addActivitiesToChart(activities, svgZoom, true);

		// Re-insert cursor-tracking rectangle to top of child list
		svgZoom.insert(function() { return rectTrackCursor }, ":first-child");

	}

	function AddAnomaliesToChart(targetSvg, anomalies, type, y) {
		$.each(anomalies, function(i,d) {
			if (d.length>1) {
				targetSvg.append("rect")
					.attr("x", function() {
						return x(d[0].id);
					})
					.attr("y", function() {
						if (type != "h") {
							return y(fields[config.className].anomalies.l);
						} else {
							return 0;
						}
					})
					.attr("width", function() {
						var w = x(d[1].id - d[0].id);
						return w;
					})
					.attr("height", function() {
						if (type != "h") {
							return y(fields[config.className].anomalies.l);
						} else {
							return y(fields[config.className].anomalies.h);
						}
					})
					.attr("fill", function() {
						return chartConfigurations.dayView.charts.anomalyColor;
					})
					.attr("class", "anomaly");
			}
		});
	}

	addNotesToChart(dbNotes);
	addActivitiesToChart(dbActivities, svgZoom, true);
	addActivitiesToChart(dbActivities, svg, false)

	function addNoteMarker(listEpochs, configEpoch) {
		markerGroup
			.selectAll("path")
			.data(listEpochs)
			.enter().append("path")
	      	.attr("class", "point")
	      	.attr("stroke", "#FF8247")
	      	.attr("fill", "#FF8247")
	      	.attr("d", d3.svg.symbol().type("triangle-down"))
	      	.attr("transform", function(d) { 
	      		var xPos = (d - configEpoch) / 60; // convert epoch to minutes
				var xPixels = x(xPos);
	      		return "translate(" + xPixels + ",6)"; 
	      	})
	      	.on("mousedown", readNote);
	}

}

function cursorTrackText(timeIndex, val) {
	hours = timeIndex % 3600;
	minutes = hours % 60;
	hours = (hours - minutes) / 60;
	minPad = (String(minutes).length == 1) ? "0":"";
	time = hours + "h" + minPad + minutes;
	return "Time: " + time + ", Value: " + val;
}

function AddAnomalyLine(config,svg,value,line, y) {
	// Add line
	anomalyData = [{'x': 0,'y':value},{'x': config.data.length,'y':value}];
	svg.append("path")
		.attr("class", "line")
		.attr("stroke-dasharray","1,2")
		.attr("d",line(anomalyData));

	// Add label
	svg.append("text")
		.attr("y", y(value) + 2)
		.attr("x", -17)
		.attr("class", "dayViewLabel")
		.text(value);
}

function isAnnotated(d) {
	return (getAnnotation(d) != '');
}

function getAnnotation(epoch) {
	if (dbNotes.length > 0) {
		for (i = 0; i < dbNotes.length; i++) {
			if (dbNotes[i].key.epoch == epoch) {
				return dbNotes[i].value
			}
		}
		return ''
	} else {
		return ''
	}
}

function updateTips( t, tips ) {
	tips
	.text( t )
	.addClass( "ui-state-highlight" );
	setTimeout(function() {
		tips.removeClass( "ui-state-highlight", 1500 );
	}, 500 );
}

function checkLength( o, n, min, max ) {
	if ( o.val().length > max || o.val().length < min ) {
		o.addClass( "ui-state-error" );
		updateTips( "Length of " + n + " must be between " +
			min + " and " + max + ".", tips );
		return false;
	} else {
		return true;
	}
}

function checkRegexp( o, regexp, n ) {
	if ( !( regexp.test( o.val() ) ) ) {
		o.addClass( "ui-state-error" );
		updateTips( n, tips );
		return false;
	} else {
		return true;
	}
}

function openSettingsDialog(field) {

	var description = fields[field].description.toLowerCase();
	var dialogTitle = "Edit " + String(description) + " settings";
	var dialog, form;
	var low = $( "#low" );
	var high = $( "#high" );
	allFields = $( [] ).add( low ).add( high ),
	tips = $( ".validateTips" );

	low.val(fields[field].anomalies.l);
	high.val(fields[field].anomalies.h);

	function postSettings() {
		var valid = true;
		allFields.removeClass( "ui-state-error" );
		// validate low and high fields (alpha numeric, present, etc.)
		//valid = valid && checkLength( notes, "notes", 1, 500 );

		if ( valid ) {

			var values = {
    			'key': {
    				'userid': userid,
    				'field': field
				},
    			'value': {
    				'low': low.val(),
    				'high': high.val()
    			}
    		};

			var request = $.ajax({
				type: "POST",
				url: '/addsetting',
				contentType: "application/json",
				data: JSON.stringify(values),
				datatype: String
			})

			request.done(function(data) {

				showLoadingView();
				rewindFieldView();
				event.preventDefault();

				loadUser(userid);
			});

			request.fail(function() {
				alert("Failed to save settings");
			});

			dialog.dialog( "close" );
		}

		return valid;
	}
	
	dialog = $( "#dialog-settings" ).dialog({
		title: dialogTitle,
		autoOpen: true,
		height: 250,
		width: 300,
		modal: true,
		buttons: {
			"Save": postSettings,
			Cancel: function() {
				dialog.dialog( "close" );
			}
		},
		close: function() {
			form[ 0 ].reset();
			allFields.removeClass( "ui-state-error" );
			tips.text("");
		}
	});

	form = dialog.find( "form" ).on( "submit", function( event ) {
		event.preventDefault();
		postSettings();
	});

}

function openAnomalyDialog(source, xPixels, epoch) {

	// If anomaly has already been annotated, show it in dialog
	$( "#notes" ).val(getAnnotation(epoch));
	
	var dialog, form,
	notes = $( "#notes" ),
	allFields = $( [] ).add( notes ),
	tips = $( ".validateTips" );

	function addNote() {
		var valid = true;
		allFields.removeClass( "ui-state-error" );
		valid = valid && checkLength( notes, "notes", 1, 500 );
		// TODO: validate to avoid XSS atacks
		// valid = valid && checkRegexp( notes, /^([0-9a-zA-Z''])+$/, "Notes field only allows : a-z 0-9" );
		
		if ( valid ) {

			// Create object to post
			var values = {
    			'key': {
    				'userid': userid,
					'epoch': epoch
				},
    			'value': notes.val()
    		};

			var request = $.ajax({
				type: "POST",
				url: '/addnote',
				contentType: "application/json",
				data: JSON.stringify(values),
				datatype: String
			})

			request.done(function(notes) {
				switch(source.tagName.toLowerCase()) {
					case "rect":
						d3.select(source.parentNode).append("path")
							.attr("class", "point")
		      				.attr("stroke", "#FF8247")
		      				.attr("fill", "#FF8247")
		      				.attr("d", d3.svg.symbol().type("triangle-down"))
		      				.attr("transform", function(d) { return "translate(" + xPixels + ",4)"; });						
					case "path":
						// Do nothing.
				}
				//d3.select(source);
				//rectangle.attr("fill", annotateConfigurations.color);
				dbNotes = JSON.parse(notes)
			});

			request.fail(function() {
				alert("Request failed")
			});

			dialog.dialog( "close" );
		}
		return valid;
	}

	dialog = $( "#dialog-notes" ).dialog({
		autoOpen: true,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Create note": addNote,
			Cancel: function() {
				dialog.dialog( "close" );
			}
		},
		close: function() {
			form[ 0 ].reset();
			allFields.removeClass( "ui-state-error" );
			tips.text("");
		}
	});

	form = dialog.find( "form" ).on( "submit", function( event ) {
		event.preventDefault();
		addNote();
	});

}

function AnomaliesSubset(minIndex,maxIndex,anomalies) {
	var list = [];
	var newAnomaly;
	$.each(anomalies, function(i,d) {
		if (d.length>1) {
			if (d[0].id >= minIndex && d[0].id <= maxIndex) {
				newAnomaly = newObj(d);
				if (d[1].id > maxIndex) {
					newAnomaly[0].id -= minIndex 
					newAnomaly[1].id = maxIndex - minIndex;
					list.push(newAnomaly);
				} else {
					newAnomaly[0].id -= minIndex;
					newAnomaly[1].id -= minIndex;
					list.push(newAnomaly);
				}
			} else if (d[1].id >= minIndex && d[1].id <= maxIndex) {
				newAnomaly = newObj(d);
				newAnomaly[0].id = 0;
				newAnomaly[1].id -= minIndex;
				list.push(newAnomaly);
			} else if (d[0].id <= minIndex && d[1].id >= maxIndex) {
				newAnomaly = newObj(d);
				newAnomaly[0].id = 0;
				newAnomaly[1].id = maxIndex - minIndex;
				list.push(newAnomaly);
			} else {

			}
		}
	});
	return list
}

function activitiesSubset(minIndex, maxIndex, config) {
	var list = [];
	var newActivity;
	$.each(dbActivities, function(i,d) {
		startEpoch = dateToEpoch(d.startTime);
		endEpoch = dateToEpoch(d.endTime);
		var startDayMinutes = (startEpoch - config.epoch)/60;
		var endDayMinutes = (endEpoch - config.epoch)/60;
		if ((startDayMinutes >= minIndex && endDayMinutes <= maxIndex) ||
			(startDayMinutes < minIndex && endDayMinutes > minIndex && endDayMinutes <= maxIndex) ||
			(startDayMinutes >= minIndex && startDayMinutes < maxIndex && endDayMinutes > maxIndex)) {
			list.push(d);
		}
/*		if (startDayMinutes >= minIndex && startDayMinutes <= maxIndex) {
			newActivity = newObj(d);
			if (endDayMinutes > maxIndex) {
				newActivity.startTime = epochToDate(startEpoch - minIndex);
				newActivity.endTime = epochToDate(config.epoch + maxIndex - minIndex);
				list.push(newActivity);
			} else {
				newActivity.startTime = epochToDate(startEpoch - minIndex);
				newActivity.endTime = epochToDate(config.epoch + endEpoch - minIndex);
				list.push(newActivity);
			}
		} else if (endDayMinutes >= minIndex && endDayMinutes <= maxIndex) {
			newActivity = newObj(d);
			newActivity.startTime = epochToDate(minIndex + config.epoch);
			newActivity.endTime = epochToDate(endEpoch - minIndex);
			list.push(newActivity);
		} else if (startDayMinutes <= minIndex && endDayMinutes >= maxIndex) {
			newActivity = newObj(d);
			newActivity.startTime = epochToDate(minIndex + config.epoch);
			newActivity.endTime = epochToDate(config.epoch + maxIndex - minIndex);
			list.push(newActivity);
		}*/
	});
	return list
}

function notesSubset(minIndex, maxIndex, config) {
	var list = [];
	var newNote;
	$.each(dbNotes, function(i,d) {
		var dayEpoch = d.key.epoch - config.epoch;
		noteIndex = dayEpoch / 60;
		if (noteIndex >= minIndex && noteIndex <= maxIndex) {
			newNote = newObj(d);
			newNote.key.epoch -= minIndex * 60;
			list.push(newNote);
		}
	});
	return list;
}

/*
	Function that selects the data of the chosen week and sets it up in the userConfiguration element as well as returning it as an array. 

	This function gets the data of all the fields for the 1440 minutes of everyday.
*/
function getWeekData(start) {
	var week = [];	 
	var start = parseInt(start);
	if (start != 0) {
		userConfiguration.week.start = start;
		var end = start + 86400;
		for (var i = 0; i<7; i++) {
			var dayData = getDayData(start,end);
			week.push(dayData);
			start = end;
			end = end +86400;
		}
		userConfiguration.week.data = week;
	}
	return userConfiguration.week.data;
}


/*
	Function that standardizes the structure of the data for one day based on the number of minutes in the day (1440).

	@Returns an array with the 1440 data points for the day.
*/
function getDayData(start,end) {
	//sets up a fresh object with all the minutes of the day
	var clean = {};
	for (var i = 0; i<= 1439 ; i++) {
		var datum = {}
		for (var property in mainData[0]) {
			datum[property] = '';
		}
		clean[i] = datum;
	}
	var minday; //minute of the day
	var day = [];
	$.each(mainData, function(i,d) {
		if (parseInt(d.epoch) >= start && parseInt(d.epoch) < end) {
			//minday = (new Date(d.time).getUTCHours() *60) + ((d.epoch % 3600)/60)
			minday = (d.epoch - start) / 60
			clean[minday] = d;
		}
	});

	for (var i = 0; i<=1439; i++) {
		day.push(clean[i]);
	}

	// code below should work too
	// $.map(clean, function(obj,k) {
	// 	day.push(obj);
	// })
	return day;
}


function createDayCharts(start, startEpoch) {
	$(".subsection").hide();
	$(".subsection").html('');
	$("#dayView").toggle();

	userConfiguration.active = "dayView";
	//buildTimeScale("dayView",["",1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);

	var config;
	$.each(fieldsToDisplay(), function(i,field) {
		loadWeekConfigData(field, userConfiguration.week.start);
		config = userConfiguration.week.days[start];
		config.target = "#dayView";
		config.height = 130;
		if (fields[field].chartType == chartTypes.line) {
			createLineChart(config);	
		} else if (fields[field].chartType == chartTypes.bar) {
			createBarChart(config);
		}		
		$("#" + config.id + " h3").html(field);
		$("#" + config.id + " h3").addClass("dailyHeader");
	});

	mainParameters.dayView.dayEpoch = startEpoch;
	mainParameters.dayView.weekday = start;
	mainParameters.dayView.date = config.date;

	setBreakdownHeader('daily', '');	
}

/*function buildTimeScale(target,data) {
	// We want the time scale range to match the width of the line chart or bar chart it serves as an axis for.
	var width = chartConfigurations.dayView.charts.width;
	var x = d3.scale.linear()
		.domain([0,24])
	    .range([0, width]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .ticks(data.length)
	    .tickSize(10,1);

	width = chartConfigurations.dayView.timeScale.width +
			chartConfigurations.dayView.timeScale.margin.left +
			chartConfigurations.dayView.timeScale.margin.right;
	var svg = d3.select("#"+target).append("div")
				.attr("class","scale")
				.append("svg")
					.attr("class", "axis")
					.attr("class", "timeScale")
					.attr("width", width)
					.attr("height", chartConfigurations.dayView.timeScale.height);

	svg.append("g")
		.attr("class","timeAxis")
		.attr("transform", "translate(" + (chartConfigurations.dayView.charts.margin.left + 2) + ",40)")
		.call(xAxis)
		.selectAll("text")
			.attr("class","tickLabel")
			.attr("transform","translate(0,-50)");

	svg.selectAll(".domain")
		.attr("stroke","gray")
		.style('fill','none');

	// Adjusts the size of the vertical ticks from the scale
	svg.selectAll(".tick line")
		.attr("transform","translate(0,-20)")
		.attr("y2",40)

	// Removes the first tick line from the scale (when 0:00 hrs of the day)
	svg.select(".tick line")
		.attr("y2",0)

	//Changing the scale labels
	var scaleLabels =["",1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24];
	$.each($(".tick text"),function(i,d) {
		$(d).html(scaleLabels[i]);
	});	
}*/

function showFieldWeek(field) {
	userConfiguration.active = field;
	$(".subsection").hide();
	$("#" + field).html('');
	$("#" + field).toggle();

	//buildTimeScale(field, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);
	createWeekChart(field, userConfiguration.week.start);
}

function loadWeekConfigData(field, start) {
	var week = getWeekData(start);
	var max = 0;
	userConfiguration.week.days = [];
	$.each(week, function(i,d) {
		config = createConfigFile(d, '#' + field, field + i, field)
		userConfiguration.week.days.push(config);
		max = getWeekMax(userConfiguration.week.days[i].data, max);
	});
	userConfiguration.week.maxValue = max;
}

/*
	This function will create the weekley breakdown on a day by day basis of a particular activity passed as a parameter. 

	asd
*/
function createWeekChart(field, start) {
	$("#changeIntervalSection").show();
	loadWeekConfigData(field, start);
	setBreakdownHeader('week', field);
	
	$.each(userConfiguration.week.days, function(i,config) {
		if (fields[field].chartType == chartTypes.bar) {
			createBarChart(config);
		} else if (fields[field].chartType == chartTypes.line) {
			createLineChart(config);
		}
	})
}

function getWeekMax(data, current) {
	var m = Math.max.apply(Math,data);
	if (m> current)
		return m;
	else
		return current;
}

function getDayHeadersForWeeklyCharts(target,id,className,day) {
	var dayHeader = d3.select(target).append('div')
			.attr("id",id)
			// .attr("class",className)
			.attr("class","dayChart " + className)
		.append('div')
			.attr("class","chartDayHeader")
		.append('div')
		
	dayHeader.append('h3')
		.text(day);
}

function createBarChart(config) {
	var margin = {
					top: config.margin.top, 
					right: config.margin.right, 
					bottom: config.margin.bottom, 
					left: config.margin.left},
	    width = config.width;
	    height = config.height;

	var x = d3.scale.linear()
		.domain([0,config.data.length])
	    .range([0, width]);

	var y = d3.scale.linear()
		.domain([0,userConfiguration.week.maxValue])
	    .range([height, 0]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .ticks(0)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
				.scale(y)
				.ticks(4)
				.orient("left");

	getDayHeadersForWeeklyCharts(config.target,config.id,config.className,config.day);
		
	d3.select(config.target+" #"+config.id)
		.append('div')
			.attr("class","chartDayArea");

	var barWidth = (width / config.data.length);

	var svg = d3.select("#"+config.id+" .chartDayArea").append("svg")
				    .attr("width", width + margin.left + margin.right)
				    .attr("height", height + margin.top + margin.bottom)
				    .append("g")
				    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	svg.append("g")
		.attr("class", "axisBar")
		.call(yAxis)
    	.append("text")
     	.attr("transform", "rotate(-90)")
      	.attr("y", 0);

    svg.append("g")
    	.attr("class", "axisBar")
    	.attr("transform","translate(0," + height + ")")
    	.call(xAxis);

	svg.selectAll('rect')
		.data(config.data)
		.enter()
		.append("rect")
		.attr({
			'width': (barWidth-.5),
			'height': function(d) {
				return 	height - y(d);
			},
			'x': function(d,i) {
				// if (d>0)
				return (i*barWidth)+.5;
			},
			'y': function(d,i) {
				return y(d);
			}
		});
}

function getMax(data) {
	// var max = Math.max.apply(Math,data);
	return Math.max.apply(Math,data);
}

/********** Main operations **********/

function changeInterval(interval) {
	mainParameters.general.interval = interval;
	if (userConfiguration.active == "dayView") {
		createDayCharts(mainParameters.dayView.weekday,mainParameters.dayView.dayEpoch);
	} else {
		showFieldWeek(userConfiguration.active);
	}
}

function setBreakdownHeader(type, field) {
	
	var title = '';
	if(type == 'week') {
		var day1 = userConfiguration.week.days[0].date;
		var day2 = userConfiguration.week.days[userConfiguration.week.days.length -1].date;

		title = fields[userConfiguration.active].description + " from "+ MONTHS[day1.getMonth()] + " "+ day1.getDate() + " to "+ MONTHS[day2.getMonth()] + " "+ day2.getDate();
	}
	else if (type == 'daily') {
		var day = mainParameters.dayView.date;
		title = "Metrics for " + fullWeekdays[day.getDay()] + " " + MONTHS[day.getMonth()] + " " +day.getDate();
	}

	$("#breakdownHeader h3").text(title);
}

function setGanttHeader(oneWeek) {
	var day1 = new Date(oneWeek[0].time);
	var day2 = new Date(oneWeek[oneWeek.length - 1].time);
	header = MONTHS[day1.getMonth()] + " " + day1.getDate() + " to " + MONTHS[day2.getMonth()] + " " + day2.getDate()
	$("#gantt h2").text('Exercise data: ' + header);
}

function advanceTime(period) {
	if (period == 1)
		period = 86400;
	else if (period == 6)
		period = 604800;
	else if (period == -6)
		period = -604800;
	else if (period == -1)
		period = -86400;
	
	//
	// Forbid going to day that doesn't have data
	//

	userConfiguration.week.start = userConfiguration.week.start + period;	
	initialize(userConfiguration.week.start);
	if (userConfiguration.active != '') {
		if (userConfiguration.active == 'dayView') {
			createDayCharts(mainParameters.dayView.weekday,mainParameters.dayView.dayEpoch);	
		} else if (userConfiguration.active != '') {
			showFieldWeek(userConfiguration.active);	
		}
	}
}


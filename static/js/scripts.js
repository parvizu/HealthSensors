var mainData, cleanData;
var chartTypes = { "line": 1, "bar": 2, "other": 0 }
var fields = {
		'atemp': {
			'description': 'Air Temperature',
			'chartType': chartTypes.other,
			'required': false,
			'display': false
		},
		'time': {
			'description': 'Time',
			'chartType': chartTypes.other,
			'required': true,
			'display': false
		},
		'GSR': {
			'description': 'Galvanic Skin Response',
			'chartType': chartTypes.other,
			'required': false,
			'display': false
		},
		'HR': {
			'description': 'Heartrate',
			'chartType': chartTypes.line,
			'required': false,
			'display': true
		},
		'stemp': {
			'description': 'Skin Temperature',
			'chartType': chartTypes.other,
			'required': false,
			'display': false
		},
		'steps': {
			'description': 'Steps',
			'chartType': chartTypes.bar,
			'required': false,
			'display': true
		}
	};

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
	'HR': {
		'h': 80, // Gets overridden during init
		'l': 55, // Gets overridden during init
		'showAnomalies': true
	},
	'steps': {},
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
		'interval': 1, //in minutes
		'timeScale': function(x) {return 0;}

	}
}

var chartConfigurations = {
	'dayView': {
		'timeScale': {
			'width': 800,
			'height': 65,
			'margin': {
				'left': 30,
				'top': 0,
				'right': 15,
				'bottom': 0
			}
		},
		'charts': {
			'width': 800,
			'height': 25,
			'zoomHeight': 65,
			'margin': {
				'left': 30,
				'top': 0,
				'right': 0,
				'bottom': 5
			}
		}
	}
};

var annotateConfigurations = {
	'color': "#980002"
}

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

var userid;
var dbNotes;

$(document).ready( function() {
	// Make sure to change both lines below when switching between users
	userid = 14;
	//mainData = loadData(user14);

	// Load stuff from database
	url = 'getinit/' + String(userid);
	var request = $.ajax({
		type: "GET",
		url: url
	})

	request.done(function(data) {
		// Init values loaded.
		initValues = JSON.parse(data);
		dbData = initValues['data'];
		dbNotes = JSON.parse(initValues['notes']);
		dbSettings = JSON.parse(initValues['settings']);
		
		// Initialize visualization
		mainData = loadData(dbData);
		initialize(mainData[0].epoch);

		// Assign database settings to app variables
		setSettings(dbSettings);

		// TEMPORARY Uses the change button to update the interval.
		$("#changeInterval").on("click", function() {
			var interval = $("#interval").val();	
			if ($.isNumeric(interval) &&interval >0 && interval <=60 && interval !== '') {
				changeInterval(interval);
			}
			$("#interval").text("");
		})
	
	});

	request.fail(function() {
		alert("Failed to load annotation data");
	});

});

function setSettings(dbSettings) {
	mainParameters.HR.h = parseFloat(dbSettings['high']);
	mainParameters.HR.l = parseFloat(dbSettings['low']) ;   
	$("#hr-high").val(dbSettings['high']);
	$("#hr-low").val(dbSettings['low']);
}

function initialize(start) {
	getWeekData(start);
	buildGantt();
}

function loadData(file) {
	var dataDict = [];
	$.each(file, function(i,obj) {

		datetime = new Date(obj['time'].trim());
		epoch = datetime.getTime() / 1000.0;

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


function buildMainTable() {
	var scan = mainData[0];
	var str = "<td>Mr. John Doe</td><td>"+scan['HR']+"</td><td>"+scan['skinTemp']+"</td><td>"+scan['HR']+"</td><td></td>"
	$("#mainTableBody").append()
}

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
		// var vals = [];
		// $.map(weekData, function(obj,k) {
		// 	if (obj[field] =='None') 
		// 		vals.push(0)
		// 	else
		// 		vals.push(parseInt(obj[field]));
		// })

		var color = d3.scale.linear()
			.domain([0,100])
			.range(['white','black']);

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
			// Add measurement headers
			d3.select('div.ganttSide').append('div')
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
						return fillVal; //color(fillVal);
					},
					'value': function(d) {
						return d['value']
					}
				});

			values = [];
		}
	}

	$.each(fieldsToDisplay(), function(i,key) {
		// if (key == 'steps' || key == 'heartrate' || key =='calories')
		addMeasurementBlocks(key, i*33);
	});

	showGantt();
}

function showGantt() {
	$("#loading").fadeOut("fast", function() {
		$("#gantt").fadeIn();
		$("#settings").fadeIn();
	});
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
		if (d[field] != "") {
			var value = parseInt(d[field]);
			agg += value;
			measurements++;
			if (mainParameters[field] != undefined) {
				if (value > mainParameters[field].h) {
					anomalyOver.push(d);
				} else if (value < mainParameters[field].l) {
					anomalyUnder.push(d);
				}
				if (value > mainParameters[field].h || value < mainParameters[field].l) {
					// Begin chain of consecutive anomalies
					consecutiveAnomalies++;
				} else if (consecutiveAnomalies > 1) {
					// If there are 0 or 1 consecutive anomalies, we don't care
					// If there are two or more consecutive anomalies, we consider that a chain.  That chain is now broken.
					maxConsecutiveAnomalies = Math.max(consecutiveAnomalies, maxConsecutiveAnomalies);
					consecutiveAnomalies = 0;
				}
			}
		}
		if (minute % interval == 0) {
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
		if (d[field]!='') {
			var value = parseInt(d[field]);
			agg += value;
			measurements++;
			if (mainParameters[field] != undefined) {
				if (value > mainParameters[field].h) {
					anomalyOver.push(d);
				}
				else if (value < mainParameters[field].l) {
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
		day: getDateDay(data[0]),
		date: new Date(data[0].time),
		epoch: data[0].epoch,
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
	if ('showAnomalies' in mainParameters[field]) {
		$.each(data, function(i,d) {
			if (d[field] > mainParameters[field].h && d[field] != "") {
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
			
			if (d[field] < mainParameters[field].l && d[field] != "") {
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
			if (d[field] !== '' && d.epoch !=="") {	
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

	var parseDate = d3.time.format("%Y-%m-%d").parse;

	var x = d3.scale.linear()
		.domain([0, config.data.length])
	    .range([0, width]);

	var xInverse = d3.scale.linear()
		.domain([0, width])
	    .range([0,config.data.length]);	
	
	var minMaxValue = minMaxMixedArray(config.data);
	if (minMaxValue[0] === undefined || minMaxValue[1] === undefined) {
		minMaxValue[0] = 0;
		minMaxValue[1] = 100;
	}

	var y = d3.scale.linear()
		.domain(minMaxValue) 
	    .range([height, 0]);

	var yZoom = d3.scale.linear()
		.domain(minMaxValue)
		.range([chartConfigurations.dayView.charts.zoomHeight, 0]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");

	var line = d3.svg.line().defined(function(d) { return d != ''})
	    .x(function(d,i) { return x(i); })
	    .y(function(d) { return y(d); });

	var lineZoom = d3.svg.line().defined(function(d) { return d != ''})
	    .x(function(d,i) { return x(i); })
	    .y(function(d) { return yZoom(d); });

	getDayHeadersForWeeklyCharts(config.target,config.id,config.className,config.day);
	
	d3.select(config.target + " #" + config.id)
		.append('div')
			.attr("class","chartDayArea");

	// Create SVGs for day line charts (zoomed and all-day)
	var dayContainer = d3.select("#" + config.id + " .chartDayArea");

	var svgZoom = dayContainer.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", chartConfigurations.dayView.charts.zoomHeight + margin.top + margin.bottom)
		.attr("class", "lineChartZoom")
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var svg = dayContainer.append("svg")
		.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	    .attr("class", "lineChart")
	    .attr("style", "cursor: crosshair")
	  	.append("g")
	    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Make background rectangle to handle mouse events
	svg.append("rect")
		.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	    .attr("fill", "#FFFFFF");

	// Make zoom selection rectangle
	svg.append("rect")
		.attr("class", "rectZoom")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.attr("fill", "#EEE");

	svg.append("path")
		.datum(config.data)
		.attr("class", "line")
		.attr("d", line)
		.attr("transform","translate("+(x(1)-1)+")");

	svgZoom.append("path")
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

	AddAnomalyLine(config,svg,mainParameters.HR.h, anomalyLine, y);
	AddAnomalyLine(config,svg,mainParameters.HR.l, anomalyLine, y);
	AddAnomalyLine(config,svgZoom,mainParameters.HR.h, anomalyLineZoom, yZoom);
	AddAnomalyLine(config,svgZoom,mainParameters.HR.l, anomalyLineZoom, yZoom);

	if (mainParameters.HR.showAnomalies) {
		AddAnomaliesToChart(svg, config.anomalies.high,"h", x, y);
		AddAnomaliesToChart(svg, config.anomalies.low,"l", x, y);
		AddAnomaliesToChart(svgZoom, config.anomalies.high,"h", x, yZoom);
		AddAnomaliesToChart(svgZoom, config.anomalies.low,"l", x, yZoom);
	}

	// Handle zooming
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
	    		minIndex = Math.floor(xInverse(Math.min(xDown, xNow)));
				maxIndex = Math.floor(xInverse(Math.max(xDown, xNow)));
				// TODO: we're assuming here that every index is a minute of data
				zoomData = config.data.slice(minIndex,maxIndex);

				anomaliesLow = AnomaliesSubset(minIndex,maxIndex,config.anomalies.low);
				anomaliesHigh = AnomaliesSubset(minIndex,maxIndex,config.anomalies.high);
				
	    		RefreshZoomChart(zoomData, config, lineZoom, yZoom, anomaliesLow, anomaliesHigh);
    		} else {
    			// Clear rectangle and reset zoom
  				rectZoom.attr("transform", "translate(0,0)")
  				rectZoom.attr("width", width + margin.left + margin.right)
    			RefreshZoomChart(config.data, config, lineZoom, yZoom, config.anomalies.low, config.anomalies.high)
    		}
  		}
	});
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
		.attr("x", 15 - chartConfigurations.dayView.charts.margin.left)
		.attr("class", "dayViewLabel")
		.text(value);
}

function AddAnomaliesToChart(targetSvg, anomalies, type, x, y) {
	$.each(anomalies, function(i,d) {
		if (d.length>1) {
			targetSvg.append("rect")
				.attr("x", function() {
					return x(d[0].id);
				})
				.attr("y", function() {
					if (type != "h") {
						return y(mainParameters.HR.l);
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
						return y(mainParameters.HR.l);
					} else {
						return y(mainParameters.HR.h);
					}
				})
				.attr("fill", function() {
					if (isAnnotated(d[0])) {
						return annotateConfigurations.color
					} else {
						return "#555555"
					}
				})
				.attr("class", "heartAnomaly")
				.on("mousedown", function() {
					openAnomalyDialog(d, this);
 				});
		}
	});
}

function isAnnotated(d) {
	return (getAnnotation(d) != '');
}

function getAnnotation(d) {
	if (dbNotes.length > 0) {
		for (i = 0; i < dbNotes.length; i++) {
			if (dbNotes[i].key.epoch == d.epoch) {
				return dbNotes[i].value
			}
		}
		return ''
	} else {
		return ''
	}
}

function openAnomalyDialog(d, rect) {
	rectangle = d3.select(rect);

	// If anomaly has already been annotated, show it
	$( "#notes" ).val(getAnnotation(d[0]));
	
	var dialog, form,
	notes = $( "#notes" ),
	allFields = $( [] ).add( notes ),
	tips = $( ".validateTips" );
	
	function updateTips( t ) {
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
				min + " and " + max + "." );
			return false;
		} else {
			return true;
		}
	}

    function checkRegexp( o, regexp, n ) {
		if ( !( regexp.test( o.val() ) ) ) {
			o.addClass( "ui-state-error" );
			updateTips( n );
			return false;
		} else {
			return true;
		}
	}

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
					'epoch': d[0]['epoch']
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
				rectangle.attr("fill", annotateConfigurations.color);
				dbNotes = JSON.parse(notes)
			});

			request.fail(function() {
				alert("Request failed")
			});

			dialog.dialog( "close" );
		}
		return valid;
	}

	dialog = $( "#dialog" ).dialog({
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
	var anomaliesSubset = [];
	var newAnomaly;
	$.each(anomalies, function(i,d) {
		if (d.length>1) {
			if (d[0].id >= minIndex && d[0].id <= maxIndex) {
				newAnomaly = JSON.parse(JSON.stringify(d));
				if (d[1].id > maxIndex) {
					newAnomaly[0].id -= minIndex 
					newAnomaly[1].id = maxIndex - minIndex;
					anomaliesSubset.push(newAnomaly);
				} else {
					newAnomaly[0].id -= minIndex;
					newAnomaly[1].id -= minIndex;
					anomaliesSubset.push(newAnomaly);
				}
			} else if (d[1].id >= minIndex && d[1].id <= maxIndex) {
				newAnomaly = JSON.parse(JSON.stringify(d));
				newAnomaly[0].id = 0;
				newAnomaly[1].id -= minIndex;
				anomaliesSubset.push(newAnomaly);
			} else if (d[0].id <= minIndex && d[1].id >= maxIndex) {
				newAnomaly = JSON.parse(JSON.stringify(d));
				newAnomaly[0].id = 0;
				newAnomaly[1].id = maxIndex - minIndex;
				anomaliesSubset.push(newAnomaly);
			} else {

			}
		}
	});
	return anomaliesSubset	
}

/*
	Function that refreshes the zoomed line chart to show the data within the latest zoom bounds
*/
function RefreshZoomChart(data, config, line, y, anomaliesLow, anomaliesHigh) {

	// Reset the scale for the zoomed line
	var x = d3.scale.linear()
		.domain([0, data.length])
	    .range([0, config.width]);

	// Create a new line with the new scale
	var line = d3.svg.line().defined(function(d) { return d != ''})
	    .x(function(d,i) { return x(i); })
	    .y(function(d) { return y(d); });

	// Select the zoomed line
	svgZoom = d3.select("#" + config.id + " div svg.lineChartZoom g");
	lineZoom = svgZoom.select("path.lineZoom");
	
	// Update the zoomed line data
	lineZoom
		.data([data])
		.attr("d", line);

	// Remove anomalies
	svgZoom.selectAll("rect").remove();

	// Add anomalies
	if (mainParameters.HR.showAnomalies) {
		AddAnomaliesToChart(svgZoom, anomaliesHigh, "h", x, y);
		AddAnomaliesToChart(svgZoom, anomaliesLow, "l", x, y);
	}

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
			week.push(getDayData(start,end));
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
			minday = (new Date(d.time).getUTCHours() *60) + ((d.epoch % 3600)/60)
			clean[minday] = d;
		}
	});

	$.map(clean, function(obj,k) {
		day.push(obj);
	})
	return day;
}


function createDayCharts(start, startEpoch) {
	$(".subsection").hide();
	$(".subsection").html('');
	$("#dayView").toggle();

	userConfiguration.active = "dayView";
	buildTimeScale("dayView",["",1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);

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
		$("#" + config.id + " h3").html(fields[field].description);
		$("#" + config.id + " h3").addClass("dailyHeader");
	});

	mainParameters.dayView.dayEpoch = startEpoch;
	mainParameters.dayView.weekday = start;
	mainParameters.dayView.date = config.date;

	setBreakdownHeader('daily', '');	
}


function buildTimeScale(target,data) {
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
}

function showFieldWeek(field) {
	userConfiguration.active = field;
	$(".subsection").hide();
	$("#" + field).html('');
	$("#" + field).toggle();

	buildTimeScale(field, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);
	createWeekChart(field, userConfiguration.week.start);
}

function loadWeekConfigData(category,start) {
	var week = getWeekData(start);
	var max = 0;
	userConfiguration.week.days = [];
	$.each(week, function(i,d) {
		userConfiguration.week.days.push(createConfigFile(d,'#'+category,category+i,category));
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

	var parseDate = d3.time.format("%Y-%m-%d").parse;

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


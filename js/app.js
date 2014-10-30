// Store all audience data
var fullData          = null;
var currentDay        = 0;
var programPubRegexps = [/^PUB\s/, /(:PUB.*)$/];
var aShareAll         = [];
var aShareBefore      = [];
var aShareProgram     = [];
var aShareAfter       = [];
var carousel          = new Carousel(".slider");
var lastScale         = 1;
var fixed             = new FixedElement('.fixed');
var fixedElement      = $('.fixed');

fixedElement.height(getViewport()[1]);

fixedElement.on('zoomStart', function(){
	carousel.disable();
});

fixedElement.on('zoomEnd', function(e){
    var scale = e.detail ? e.detail.scale : e.originalEvent.detail.scale;

	fixedElement.height(getViewport()[1] * scale);

	if(scale <= 1){
		carousel.enable();
	}

	handleProgramNameVisibility(scale);
});

$("body").nodoubletapzoom();
FastClick.attach(document.body);

// Fix infinite scroll on desktop browser (due to the fixed element)
if($(window).width() > 640){
	document.addEventListener("scroll", function(){
		if($('.content').height() + parseInt($('.content').css('margin-top'), 10) - $(window).scrollTop() < $(window).height()){
			$('body').scrollTop($(window).scrollTop() - 10);
		}
	}, false);
}

// D3 formatters
var dateFormat        = d3.time.format("%Y-%m-%d");
var dayFormat         = d3.time.format('%d/%m');
var timeFormat        = d3.time.format("%H:%M:%S");
var hourFormat        = d3.time.format("%H:%M");
var percentFormat     = d3.format(".0%");

// Dimensions with market share matching
var dimensions = {
	'ni_4':     { name: 'Audience 4+', color: "steelblue", marketShareLabel: "4 ans+" },
	'pda_4':    { name: 'PdA 4+', color: "#8c564b", marketShareLabel: "4 ans+" },
	'ni_frda':  { name: 'Audience Femme RDA', color: "steelblue", marketShareLabel : "Fem<50 RDA" },
	'pda_frda': { name: 'PdA Femme RDA', color: "#8c564b", marketShareLabel: "Fem<50 RDA" }
};

// Get first dimension as default
var currentDimension  = Object.keys(dimensions)[0];
var allChannels       = ['TV1', 'TF2', 'TF3', 'D-', 'N5', 'ctrl+R', 'TEAR', 'Z8'];

$('.slider').on('slide', function(e){
    var slideNumber = e.detail ? e.detail.slideNumber : e.originalEvent.detail.slideNumber;

	if(slideNumber == currentDay){
		$('#loader').hide();
		return;
	}

	fixedElement.show();
	$('.footer').hide();

	// Remove old chart
	d3.select('.content li:nth-child('+(currentDay + 1)+') div.content-padded div.chartContainer').remove();

	// Set new day
	currentDay = slideNumber;
	var dayData = coerceData( getDayData(fullData, currentDay) );

	$('.content li:eq('+(currentDay)+')').addClass('loading');

	// Display new day's data
	redraw(dayData, currentDimension, currentDay);
});

window.addEventListener( "orientationchange", handleOrientationChange, false);


function handleOrientationChange(e){
	$(window).scrollLeft(0);
	fixedElement.hide();

	var dayData = coerceData( getDayData(fullData, currentDay) );
	redraw(dayData, currentDimension, currentDay);

	carousel.setPaneDimensions();

	// Redraw details svg ?
	if($('#programDetails.in').length){
		// Scale it
		var details     = $('#programDetails');
		var scale       = window.detectZoom.zoom();
		var top         = $(document).scrollTop();
		var left        = $(document).scrollLeft();
		var viewport    = getViewport();

		details
			.css('width', viewport[0] * scale)
			.css('height', viewport[1] * scale)
			.css('transform-origin', 'left top')
			.css('transform', 'scale('+(1/scale)+')  translate('+(left * scale)+'px, '+(top * scale)+'px)');


		redrawMarketShares(details, aShareAll, aShareBefore, aShareProgram, aShareAfter);
	}
}

/**
 * Return audience data for a given day
 * @param {Array} data
 * @param {Number} iDay
 * @returns Array
 */
var getDayData = function(data, iDay){
	var keys = Object.keys(data);

	return data[keys[iDay]];
};

// Coerce the JSON data to the appropriate types.
var coerceData = function(data) {
	if(typeof data[0].start != 'string'){
		return data;
	}

	data.forEach(function(d) {
		var oDate = new Date(d.start);
		d.start   = +oDate + oDate.getTimezoneOffset() * 60 * 1000;
	});

	return data;
};

/**
 * Return time like 00:00:00 as a {Number} of millisecond
 * @param duration
 * @returns {number}
 */
var parseDuration = function(duration) {
	return (timeFormat.parse(duration) - timeFormat.parse('00:00:00'));
};

/**
 * Draw main SVG
 * @param {Array}  data
 * @param {String} dimension
 * @param {Number} day
 */
var redraw = function(data, dimension, day) {
	if(!data.length){
		return;
	}

	dimension         = dimension || 'ni_4';
	currentDimension  = dimension;
	day               = day || 0;

	// Get main dimensions
	var calculatedWidth = $('body').width();
	var margin = { top: 20, right: 0, bottom: 0, left: 0 };
	var width = calculatedWidth - margin.left - margin.right;
	var height = 800 - margin.top - margin.bottom;

	$('.content').width(calculatedWidth);
	$('.content ul, .content, .content ul li').height(800 + $('.header').height() * 2);

	// Main scales
	var x = d3.scale.ordinal().rangeBands([0, width]);
	var y = d3.time.scale().range([height, 0]);
	var	z = d3.scale.sqrt();

	// Retrieve schema container for the current day
	var content = d3.select('.content li:nth-child('+(day + 1)+') div.content-padded');
	content.select('div').remove();

	// Display day name in title
	var date = dateFormat.parse(data[0].date);
	d3.select('h1').text('Audience du '+dayFormat(date));

	// Recreate the container tag
	var chartContainer = content.append("div")
		.attr('class', 'chartContainer')
		.style("width", (width + margin.left + margin.right)+'px')
		.style("height", (height + margin.top + margin.bottom)+'px')
		.style("-webkit-transform", "translate(" + margin.left + "px," + margin.top + "px)");

	// Compute the scale domains
	x.domain(allChannels);
	y.domain(d3.extent(data, function(d) {
		return d.start;
	}).reverse());
	z.domain([0, d3.max(data, function(d) { return d[dimension]; })]);
	z.range(["white", dimensions[dimension].color]);

	var yScale = height / (y.domain()[0].getTime() - y.domain()[1].getTime()) * 1000;
	var xRangeBand = x.rangeBand();

	// Display the tiles for each data.
	var tile = chartContainer.selectAll(".tile")
			.data(data);

	// enter tiles
	tile.enter().append("div")
		.attr("class", function (d){
			return "tile " + (isAd(d.name) ? 'ad' : '');
		})
		.attr("style", "position: absolute")
		.attr('data-content', function(d){ return d.name; })
		.attr('id', function(d, i){ return 'tile-' + i; })
		.style("left", function(d) {
			var result = x(d.channel);
			// Center ads
			if(isAd(d.name)){
				result += xRangeBand / 4;
			}
			return result+"px";
		})
		.style("top", function(d) { return y(d.start)+"px"; })
		.style("width", function(d){
			return (isAd(d.name) ? xRangeBand / 2 : xRangeBand)+"px";
		})
		.style("height", function(d) { return (d.duration * yScale)+"px";})
		.on('click', function(d){
			if($(this).hasClass('selected')){
				displayDetails.bind(this)();
				return;
			}

			$('.selected').removeClass('selected');
			$(this).addClass('selected');

			$('.footer')
				.show()
				.text(hourFormat(new Date(d.start)) + ' ' + d.name);
		});

	// update tiles
	tile.style("background-color", function(d) { return z(d[dimension]); });

	// exit tiles
	tile.exit().remove();

	var programNames = chartContainer.selectAll(".programName")
		.data(data);

	// enter program names
	programNames
		.enter()
		.append('span')
		.attr('class', 'programName')
		.classed('ad', function(d) { return isAd(d.name); })
		.attr('id', function(d, i){ return 'tileName-' + i; })
		.html(function(d){ return d.name; })
		.style("left", function(d) {
			return x(d.channel) + "px";
		})
		.style("top", function(d) {
			return (y(d.start) - 4 + (d.duration * yScale) / 2) + "px";
		})
		.style("width", xRangeBand + "px")
		.on('click', function(d, i) {
			if($('#tile-'+ i).hasClass('selected')){
				displayDetails.bind(this)();
				return;
			}

			$('.selected').removeClass('selected');
			$('#tile-'+ i).addClass('selected');

			$('.footer')
				.show()
				.text(hourFormat(new Date(d.start)) + ' ' + d.name);
		});

	// exit program names
	programNames.exit().remove();

	// remove emty spans to lighten the dom
	programNames.filter('.ad').remove();

	// remove previous elements
	d3.select('.axis').remove();

	// Add an x-axis.
	var xAxis = chartContainer.append("div")
			.attr("class", "x axis")
			.style('top', '-'+margin.top+'px');

	xAxis.selectAll('span')
			.data(x.domain())
			.enter()
			.append('span')
			.style('left', function(d) {
				return x(d)+'px';
			})
			.style('width', x.rangeBand()+'px')
			.html(function(d){ return d;});

	// Draw line at 13h & 20h
	var lineHours = [13, 20];
	var lastChannel = allChannels[allChannels.length - 1];
	for(var i = 0, length = lineHours.length; i < length; i++){
		var hour        = lineHours[i];
		var time        = date.getTime() + hour * 3600 * 1000;
		var startPoint  = {x: x(0), y: y(time)};
		var endPoint    = {x: x(lastChannel) + x.rangeBand(), y: y(time)};

		chartContainer.append('div')
				.attr('class', 'hourLine')
				.style('left', (startPoint.x)+"px")
				.style('top', (endPoint.y)+"px");

		// Text
		chartContainer.append('span')
				.attr('class', 'hourLineValue')
				.html(hour + 'h')
				.style('left', (startPoint.x + 5)+"px")
				.style('top', (startPoint.y - 20)+"px");
	}

	//initScroller();
	$('.content ul').removeClass('loading');
	$('.content li:eq('+(day-1)+'), .content li:eq('+(day+1)+')').addClass('loading');
	$('.content li:eq('+(day)+')').removeClass('loading');

	handleProgramNameVisibility(window.detectZoom.zoom());

	fixed.applyChanges(true);
	fixedElement.show();
};

/**
 * Check the zoom level to hide or show programs name
 *
 * @param {Number} scale
 */
function handleProgramNameVisibility(scale) {
	var isZoomedIn = getViewport()[0] < 180;
	var tileStyle  = document.getElementById('tile_style');

	if (isZoomedIn) {
		tileStyle.innerHTML = ".programName { display: block; } .tile:not(.ad) { outline: solid white 1px; }";
	} else {
		tileStyle.innerHTML = ".programName { display: none; } .tile:not(.ad) { outline: none; }";
	}
}

d3.json("data/grille-full.json", function(data) {
	// Store all data
	fullData = data;
	var dayData = coerceData( getDayData(data, currentDay) );

	// Generate day container
	var days = Object.keys(data);
	var container = d3.select('div.content ul');
	container.selectAll('li div.content-padded')
			.data(days)
			.enter()
			.append('li')
			.append('div')
			.attr('class', 'content-padded')
			.style('width', d3.select('.content').style('width'));

	// Draw current day's data
	redraw(dayData, currentDimension, currentDay);

	// Initialize carousel
	carousel.init();
});

/**
 * Returns true if a program is an advertisement
 * @param {String} name
 * @returns boolean
 */
function isAd(name){
	for(var i = 0, length = programPubRegexps.length; i < length; i++){
		if(programPubRegexps[i].test(name)){
			return true;
		}
	}

	return false;
}

/**
 * Current dimension switch
 */
$('.dropdown-menu a').hammer().on("click", function(event) {
	event.preventDefault();
	$('.btn-group').removeClass('open');
	$('.dropdown-backdrop').remove();

	var target    = $(event.target);
	var category  = target.attr('data-category');
	var dayData   = coerceData( getDayData(fullData, currentDay) );
	var adStyle   = document.getElementById('ad_style');
	if (category == 'no_ad'){
		adStyle.innerHTML = ".tile.ad { display: none; }";
		target.attr('data-category', 'ad');
		target.html('Montrer les pubs');
	} else if (category == 'ad'){
		adStyle.innerHTML = "";
		target.attr('data-category', 'no_ad');
		target.html('Cacher les pubs');
	} else {
		redraw(dayData, category, currentDay);
	}

	return false;
});

/**
 * Display detail of a program
 */
function displayDetails(event){
	lastScale = 1;

	// Display modal box
	var details = $('#programDetails');
	details.modal({backdrop: true, keyboard: true});

	// Scale it
	var scale       = window.detectZoom.zoom();
	var top         = $(window).scrollTop();
	var left        = $(window).scrollLeft();
	var viewport    = getViewport();

	details
			.css('width', viewport[0] * scale)
			.css('height', viewport[1] * scale)
			.css('transform-origin', 'left top')
			.css('transform', 'scale('+(1/scale)+')  translate('+(left * scale)+'px, '+(top * scale)+'px)');

	// Retrieve programm data
	var programData = d3.select(this).data()[0];
	var duration = programData.duration / 60;

	// Display program data
	$('.modal-title', details).text(programData.name);
	$('.modal-body p', details).html('<dl>' +
			'<dt>Durée</dt><dd>' + parseInt(duration/60, 10) + 'h' + d3.format('##')(parseInt(duration%60, 10)) + '</dd>' +
			'<dt>Audience des 4 ans et plus</dt><dd>' + d3.format('0,')(programData.ni_4) + '</dd>' +
			'<dt>Part d\'audience des 4 ans et plus</dt><dd>' + programData.pda_4 + '%</dd>' +
			'<dt>Audience Femme RDA</dt><dd>' + d3.format('0,')(programData.ni_frda) + '</dd>' +
			'<dt>Part d\'audience Femme RDA</dt><dd>' + programData.pda_frda + '%</dd>' +
			'</dl>'
	);

	// Retrieve all channels data for this day & dimension
	var aChannels = allChannels.slice(0);

	// Put the current channel first
	var nbChannels = aChannels.length;
	for(var i = 0; i < nbChannels; i++){
		if(aChannels[i] == programData.channel){
			aChannels.splice(i, 1);
			aChannels.unshift(programData.channel);
			break;
		}
	}

	// Filter to retrieve data 30mn before & 30 mn after
	var iChannel          = 0;
	var dayData           = {};
	var iProgramStart     = programData.start;
	var iProgramDuration  = programData.duration * 1000;
	var timeBefore        = 30 * 60 * 1000;
	var timeAfter         = 30 * 60 * 1000;

	(function loadMarketShare(){
		// And of channel data loading, display it
		if(iChannel == nbChannels - 1){
			return displayMarketShare(details, dayData, programData);
		}

		// Allow to display all dimensions
		var dimension = currentDimension;
		if(dimension == 'ni_4'){
			dimension = 'pda_4';
		}
		if(dimension == 'ni_frda'){
			dimension = 'pda_frda';
		}

		// Load channel json
		d3.json("data/market-shares/ms-"+programData.date+"-"+aChannels[iChannel]+"-"+dimension+".json", function(channelData) {

			if(channelData){
				for(var i = 0, length = channelData.length; i < length; i++){
					var element = channelData[i];

					// Filter 30mn before, 30mn after
					if(element.start < iProgramStart - timeBefore || element.start > iProgramStart + iProgramDuration + timeAfter){
						continue;
					}

					// Create data for the program start if not exists
					if(!dayData[element.start]){
						dayData[element.start] = {
							start: element.start
						};
					}

					// Store channel data
					dayData[element.start][element.channel] = element.share;
				}
			}

			iChannel++;
			loadMarketShare();
		});
	})();
}

/**
 * Display a stacked chart with channels data
 * @param {DOMElement} details
 * @param {Object} rawDayData
 * @param {Object} programData
 */
function displayMarketShare(details, rawDayData, programData){
	// Retrieve program & svg data
	var iProgramStart     = programData.start;
	var iProgramDuration  = programData.duration * 1000;

	// Get data before, after and for the program
	aShareBefore           = [];
	aShareProgram          = [];
	aShareAfter            = [];

	// Format data as an array
	aShareAll = [];
	for(var z in rawDayData){
		if(rawDayData.hasOwnProperty(z)){
			aShareAll.push(rawDayData[z]);
		}
	}

	// Dispatch data
	for(var i = 0, length = aShareAll.length; i < length; i++){
		var element = aShareAll[i];
		var iStart  = element.start;

		if(iStart <= iProgramStart){
			aShareBefore.push(element);
		}

		if(iStart >= iProgramStart && iStart <= iProgramStart + iProgramDuration){
			aShareProgram.push(element);
		}

		if(iStart >= iProgramStart + iProgramDuration){
			aShareAfter.push(element);
		}
	}

	redrawMarketShares(details, aShareAll, aShareBefore, aShareProgram, aShareAfter);
}

/**
 *
 * @param {DOMElement} details
 * @param {Array} aAllData
 * @param {Array} aBefore
 * @param {Array} aProgram
 * @param {Array} aAfter
 */
function redrawMarketShares(details, aAllData, aBefore, aProgram, aAfter){
	// SVG dimension
	var padding           = 20;
	var width             = $('.modal-dialog', details).width()- padding * 2;
	var height            = 400;
	var color             = d3.scale.category20();
	var yLegendHeight     = 25;
	var i;

	// Color domain
	color.domain(d3.keys(aAllData[0]).filter(function(key) { return key != "start"; }));
	var colors = color.domain();

	// Scales
	var x = d3.time.scale().domain(d3.extent(aAllData, function(d){return d.start;})).range([0, width]);
	var y = d3.scale.linear().domain([0, d3.max(aAllData, function(d){
		var max = 0;

		// Sum data for all the channels
		for(var i = 0, length = colors.length; i < length; i++){
			max += d[colors[i]];
		}

		return max;
	})]).range([height, 0]);

	// Remove old svg
	d3.select('#programDetails div.shareMarket svg').remove();

	// Create svg
	var svg = d3.select('#programDetails div.shareMarket')
			.append('svg')
			.attr('x', padding)
			.attr('y', padding)
			.attr('width', width)
			.attr('height', height)
			.append('g')
			.attr("transform", "translate("+200+", "+padding+");");

	// Axes
	var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(6).tickFormat(d3.time.format("%H:%M"));
	var yAxis = d3.svg.axis().scale(y).orient('left').tickFormat(percentFormat);

	// Area data
	var area = d3.svg.area()
			.x(function(d) {
				return x(d.start);
			})
			.y0(function(d) {
				return y(d.y0);
			})
			.y1(function(d) {
				return y(d.y0 + d.y);
			});

	var stack = d3.layout.stack().values(function(d) { return d.values; });

	// Draw channels legend (yLegend)
	var nbColors = colors.length;
	var legendSize = width / nbColors;
	for(i = 0; i < nbColors; i++){
		// Display color
		svg.append('rect')
				.attr('x', i * legendSize)
				.attr('y', 0)
				.attr('width', 25)
				.attr('height', 20)
				.attr('fill', color(colors[i]));

		// Display name
		svg.append('text')
				.text(colors[i])
				.attr('text-anchor', 'left')
				.attr('x', i * legendSize + 30)
				.attr('y', 15)
				.attr('height', 20);
	}

	// Display SVGs
	var aSvgDatas = [
		{data: aBefore, class:'before', opacity: '0.4'},
		{data: aProgram, class:'program', opacity: 1},
		{data: aAfter, class:'after', opacity: '0.4'}
	];

	for (i = 0, length = aSvgDatas.length; i < length; i++) {
		(function(svgData){

			// Create d3 stack method
			var svgStack = stack(color.domain().map(function(name) {
				return {
					name: name,
					values: svgData.data.map(function(d) {
						return {start: d.start, y: d[name]};
					})
				};
			}));

			// Display svg data
			var svgArea = svg.selectAll("."+svgData.class)
					.data(svgStack)
					.enter()
					.append("g")
					.attr("transform", "translate(0, "+yLegendHeight+")")
					.attr("class", svgData.class)
					.append("path")
					.attr("class", "area")
					.attr("d", function(d) { return area(d.values); })
					.style("fill", function(d) { return color(d.name); })
					.attr('opacity', svgData.opacity);
		})(aSvgDatas[i]);
	}

	// Display axes
	svg.append('g')
			.attr('class', 'xAxis')
			.attr("transform", "translate(0, "+(height+yLegendHeight)+")")
			.call(xAxis)
			.selectAll("text");

	svg.append('g')
			.attr("transform", "translate(0, "+yLegendHeight+")")
			.attr('class', 'yAxis')
			.call(yAxis);
}

// @TODO : Use moment instead
var parseDuration = function(duration) {
	var components = duration.split(':');
	var parseDuration = 0;
	parseDuration += parseInt(components[0], 10) * 60 * 60;
	parseDuration += parseInt(components[1], 10) * 60;
	parseDuration += parseInt(components[2], 10);
	return parseInt(parseDuration, 10);
};

/**
 * Add seconds to a text based time (XX:XX:XX)
 * @param String sDuration
 * @param Integer iSecond
 * @returns String a text based time (XX:XX:XX)
 */
var addDuration = function(sDuration, iSecond){
	var duration  = parseDuration(sDuration) + iSecond;

	var hour      = Math.floor(duration / 3600);
	var minute    = Math.floor((duration % 3600) / 60);
	var second    = Math.floor((duration % 3600) % 60);

	var durationComponents  = [
		hour < 10 ? '0'+hour : hour,
		minute < 10 ? '0'+minute : minute,
		second < 10 ? '0'+second : second
	];

	return durationComponents.join(':');
}

exports.parseDuration = parseDuration;
exports.addDuration = addDuration;
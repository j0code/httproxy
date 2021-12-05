let ErrorLevel = {
	INFO: {id: 0, txt: "\33[37mINFO"},
	WARN: {id: 1, txt: "\33[33mWARN"},
	ERROR: {id: 2, txt: "\33[31mERROR"},
	DEBUG: {id: 3, txt: "\33[36mDEBUG"},
	ATTEMPT: {id: 4, txt: "\33[36mATTEMPT"},
	FAILURE: {id: 5, txt: "\33[31mFAILURE"},
	SUCCESS: {id: 6, txt: "\33[92mSUCCESS"}
}

function getLogTimeString() {
	var now = new Date();
	var s = now.getSeconds();
	var min = now.getMinutes();
	var h = now.getHours();
	var d = now.getDate();
	var m = now.getMonth() +1;
	var y = now.getFullYear();
	return y + "/" + (m < 10 ? "0"+m : m) + "/" + (d < 10 ? "0"+d : d) + " " + (h < 10 ? "0"+h : h) + ":" + (min < 10 ? "0"+min : min) + ":" + (s < 10 ? "0"+s : s)
}

function log(protocol, errlvl, action, ...args) {
	var time = getLogTimeString()
	protocol = (protocol || "").toUpperCase()
	errlvl = errlvl || {}
	if(!errlvl.id) id = 0
	if(!errlvl.txt) txt = ErrorLevel.INFO.txt
	action = action || "UNKNOWN"
	var argStr = "";
	for(var i = 0; i < args.length; i++) {
		argStr += getColorString(args[i]);
		if(i < args.length -1) argStr += " ";
	}
	var protocolTxt = ""
	if(protocol) {
		protocolTxt = `\u001B[37m${protocol}\u001B[97m::`
	}
	if([1, 2].includes(errlvl.id)) {
		console.error(`\u001B[97m[\u001B[90m${time}\u001B[97m] [${protocolTxt}\u001B[94m${action}\u001B[97m] [${errlvl.txt}\u001B[97m]: \u001B[37m${argStr}\u001B[m`)
	} else {
		console.log(  `\u001B[97m[\u001B[90m${time}\u001B[97m] [${protocolTxt}\u001B[94m${action}\u001B[97m] [${errlvl.txt}\u001B[97m]: \u001B[37m${argStr}\u001B[m`)
	}
}

function getColorString(value, addQuotes) {
	if(typeof value == "undefined") return "\33[90m" + value + "\33[37m";
	if(typeof value == "number") return "\33[33m" + value + "\33[37m";
	if(typeof value == "boolean") return "\33[33m" + value + "\33[37m";
	if(typeof value == "object") {
		if(!value) return "\33[37m" + value + "\33[37m";
		if(value instanceof Array) {
			var s = "\33[37m[";
			for(var i = 0; i < value.length; i++) {
				s += getColorString(value[i], true);
				if(i < value.length -1) s += ", ";
			}
			s += "]\33[37m"
		} else {
			if(value.toString) return "\33[37m" + value.toString() + "\33[37m";
			var keys = Object.keys(value);
			var s = "\33[37m{";
			for(var i = 0; i < keys.length; i++) {
				s += getColorString(keys[i], true) + ": " + getColorString(value[keys[i]], true);
				if(i < value.length -1) s += ", ";
			}
		}
	}
	
	if(addQuotes) {
		return "\33[32m\"" + value + "\"\33[37m";
	} else {
		return "\33[37m" + value + "\33[37m";
	}
}

module.exports = {
	INFO: ErrorLevel.INFO,
	WARN: ErrorLevel.WARN,
	ERROR: ErrorLevel.ERROR,
	DEBUG: ErrorLevel.DEBUG,
	ATTEMPT: ErrorLevel.ATTEMPT,
	FAILURE: ErrorLevel.FAILURE,
	SUCCESS: ErrorLevel.SUCCESS,
	
	log,
	info: (protocol, action, ...args) => log(protocol, ErrorLevel.INFO, action, ...args),
	warn: (protocol, action, ...args) => log(protocol, ErrorLevel.WARN, action, ...args),
	error: (protocol, action, ...args) => log(protocol, ErrorLevel.ERROR, action, ...args),
	debug: (protocol, action, ...args) => log(protocol, ErrorLevel.DEBUG, action, ...args),
	attempt: (protocol, action, ...args) => log(protocol, ErrorLevel.ATTEMPT, action, ...args),
	failure: (protocol, action, ...args) => log(protocol, ErrorLevel.FAILURE, action, ...args),
	success: (protocol, action, ...args) => log(protocol, ErrorLevel.SUCCESS, action, ...args)
}
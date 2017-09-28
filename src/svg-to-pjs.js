var creditLine = "/**\n * Converted from SVG format using @darrylyeo's SVG-to-PJS converter:\n * darryl-yeo.com/svg-to-processing-js-converter\n */";

var wrapper = document.getElementById("svg-to-pjs-converter");

var output = document.getElementById("svg-output");
var outputDocument = output.contentDocument || output.contentWindow.document;
var pathDataScript = outputDocument.createElement("script");
pathDataScript.setAttribute("src", "../src/path-data-polyfill.js")
outputDocument.head.appendChild(pathDataScript);

var outputWrapper = document.getElementById("svg-to-pjs-output");
var pjsOutput = document.getElementById("pjs-output");

var svgFilePicker = document.getElementById('svg-file');
var svgInput = document.getElementById('svg-input');
var optionCenterGraphic = document.getElementById('svg-option-center-graphic');
var optionRoundDecimals = document.getElementById('svg-option-round-decimals');
var optionRoundToDecimalPlaces = document.getElementById('svg-option-round-to-decimal-places');

optionCenterGraphic.addEventListener('change', updateSVGOutput, false);
optionRoundDecimals.addEventListener('change', function(e) {
	optionRoundToDecimalPlaces.disabled = !optionRoundDecimals.checked;
	updateSVGOutput();
}, false);
optionRoundToDecimalPlaces.addEventListener('change', updateSVGOutput, false);

svgFilePicker.addEventListener('change', function(e) {
	var files = e.target.files; // FileList object

	// files is a FileList of File objects. List some properties.
	for (var i = 0, f; f = files[i++];) {
		var reader = new FileReader();

		reader.onloadend = function(e) {
			if (e.target.readyState == FileReader.DONE) { // DONE == 2
				svgInput.value = e.target.result;
				updateSVGOutput(e.target.result);
			}
		};

		reader.readAsBinaryString(f);
	}
}, false);

svgInput.addEventListener('change', function(e){
	updateSVGOutput(this.value);
});
svgInput.addEventListener('keyup', function(e){
	if(e.keyCode == 13){
		updateSVGOutput(this.value);
	}
});

function updateSVGOutput(data){
	wrapper.classList.add("input-received");
	
	var svg = outputDocument.body.querySelector("svg");
	svg && svg.parentNode.removeChild(svg);
	outputDocument.body.innerHTML += data;

	svg = outputDocument.querySelector("svg");
	if(svg){
		try {
			pjsOutput.value = [
				creditLine,
				svgToPJS(
					svg,
					optionCenterGraphic.checked,
					optionRoundDecimals.checked,
					optionRoundToDecimalPlaces.value
				),
				creditLine
			].join("\n\n");
		}catch(e){
			pjsOutput.value = "Looks like there was an error!\n" + e.message + " (" + e.lineNumber + ")";
			//pjsOutput.value = "Looks like there was an error! Good thing you're testing it for me. Tell me about it and I'll be sure to resolve it.\n" + e.message + " (" + e.lineNumber + ")";
			console.error(e);
		}
	}
}


var offsetX, offsetY;
var svgRoundNumbers, svgRoundToDecimalPlaces;
var svgToPJS = function(svg, centerGraphic, roundNumbers, roundToDecimalPlaces){
	offsetX = centerGraphic ? parseFloat(svg.getAttribute("width")) / -2 : 0;
	offsetY = centerGraphic ? parseFloat(svg.getAttribute("height")) / -2 : 0;

	svgRoundNumbers = roundNumbers;
	svgRoundToDecimalPlaces = roundToDecimalPlaces;

	// Trim overrideable function calls that are redundant
	var output = svgTagToPJS(svg).split("\n");

	var overrideableFunctions = {
		"fill" : "fill",
		"noFill" : "fill",
		"stroke" : "stroke",
		"noStroke" : "stroke",
		"strokeCap" : "strokeCap"
	};
	var lastOverrideableFunctionCallForName = {
		// "mapped name" : ["function call", line#]
		"fill": ["", 0],
		"stroke": ["", 0],
		"strokeCap": ["", 0],
	}
	var nonOverrideableFunctionWasCalledSinceLastOverrideableFunction = false;
	for(var f = 0; f < output.length; f++){
		var functionCall = output[f];
		var functionName = nameOfFunctionCall(functionCall);
		//console.log("---------\n" + f + " " + functionCall)

		var mappedFunctionName = overrideableFunctions[functionName];
		if(mappedFunctionName){
			var lastOverrideableFunctionCall = lastOverrideableFunctionCallForName[mappedFunctionName][0];
			var lastOverrideableFunctionCallLineNumber = lastOverrideableFunctionCallForName[mappedFunctionName][1];
			var lastOverrideableFunctionCallName = nameOfFunctionCall(lastOverrideableFunctionCall);
			// If the current function call exactly matches the last function call for the same mapped name, remove the current function call
			if(functionCall === lastOverrideableFunctionCall){
				//console.log("Matches call on line " + lastOverrideableFunctionCallLineNumber + ": removing this line " + functionCall);
				output[f] = undefined;
			}
			// If the NAME of the current function call is the same as the NAME of the last call for the same mapped name AND a non-overrideable function (e.g. a shape) has not been called between the two
			else if(functionName === lastOverrideableFunctionCallName && !nonOverrideableFunctionWasCalledSinceLastOverrideableFunction){
				//console.log("Overrode call on line " + lastOverrideableFunctionCallLineNumber + ": removing line " + output[lastOverrideableFunctionCallLineNumber]);
				//The current call overrode the previous call; remove the previous call
				output[lastOverrideableFunctionCallLineNumber] = undefined;
			}
			nonOverrideableFunctionWasCalledSinceLastOverrideableFunction = false;
		}else{
			nonOverrideableFunctionWasCalledSinceLastOverrideableFunction = true;
		}
		lastOverrideableFunctionCallForName[mappedFunctionName] = [functionCall, output[f] ? f : lastOverrideableFunctionCallLineNumber];
	}
	/*
	for(var f = 0; f < output.length; f++){
		var functionName = output[f].substr(0, output[f].indexOf('('));
		var functionName1 = ((f + 1) < output.length) ? output[f + 1].substr(0, output[f + 1].indexOf('(')) : "";
		if((functionName === functionName1 && overrideableFunctions[functionName]) || overrideableFunctions[functionName] === functionName1){
			output[f] = undefined;
		}
	}
	*/
	return output.filter(function(e){return e}).join("\n");
}

function svgTagToPJS(svgTag){console.log(svgTag)
	if(!svgTag) return '';

	var output = [];
	var tagName = svgTag.tagName;

	var fill = svgTag.getAttribute("fill");//window.getComputedStyle(svgTag).fill;
	var fillOpacity = svgTag.getAttribute("fillOpacity");//window.getComputedStyle(svgTag).fillOpacity;
	if(styleIsDefined(fill)){
		var pjsParameters = css3ColorToPJSParameters(fill, fillOpacity);
		output.push(functionCallAsString(pjsParameters ? "fill" : "noFill", pjsParameters));
	}else if(fill === "none" || fill === "transparent"){
		output.push(functionCallAsString("noFill"));
	}else{console.log(9, functionCallAsString("fill", 0))
		output.push(functionCallAsString("fill", 0));
	}

	var stroke = svgTag.getAttribute("stroke");//window.getComputedStyle(svgTag).stroke;
	var strokeOpacity = svgTag.getAttribute("strokeOpacity");//window.getComputedStyle(svgTag).strokeOpacity;
	if(styleIsDefined(stroke)){
		var pjsParameters = css3ColorToPJSParameters(stroke, strokeOpacity);
		output.push(functionCallAsString(pjsParameters ? "stroke" : "noStroke", pjsParameters));
	}else{
		output.push(functionCallAsString("noStroke"));
	}

	var strokeWidth = svgTag.getAttribute("stroke-width");//window.getComputedStyle(svgTag).strokeWidth;
	if(styleIsDefined(strokeWidth)) output.push(functionCallAsString("strokeWeight", parseInt(strokeWidth)));

	var strokeLineCap = svgTag.getAttribute("stroke-line-cap");//window.getComputedStyle(svgTag).strokeWidth;
	if(styleIsDefined(strokeLineCap)){
		output.push("strokeCap", {
			"butt" : "SQUARE",
			"round" : "ROUND",
			"square" : "PROJECT"
		}[strokeLineCap]);
	}
console.log(tagName);
	switch(tagName){
		case "svg":
		case "g":
			for(var t = 0; t < svgTag.children.length; t++){
				output.push(svgTagToPJS(svgTag.children[t]));
			}
			break;
		case "rect":
			output.push(
				functionCallAsString("rect",
					getAttrs(
						svgTag,
						["x", "y", "width", "height", "rx"],
						[0, 0, 0, 0, undefined]
					).addNumbers([
						offsetX, offsetY
					])
				)
			);
			break;
		case "circle":
			output.push(
				functionCallAsString("ellipse",
					getAttrs(
						svgTag,
						["cx", "cy", "r", "r"],
						[0, 0, 0, 0]
					).addNumbers([
						offsetX, offsetY
					])
				)
			);
			break;
		case "ellipse":
			output.push(
				functionCallAsString("ellipse",
					getAttrs(
						svgTag,
						["cx", "cy", "rx", "ry"],
						[0, 0, 0, 0]
					).addNumbers([
						offsetX, offsetY
					])
				)
			);
			break;
		case "line":
			output.push(
				functionCallAsString("line",
					getAttrs(svgTag,
						["x1", "y1", "x2", "y2"],
						[0, 0, 0, 0]
					).addNumbers([
						offsetX, offsetY, offsetX, offsetY
					])
				)
			);
			break;
		case "polyline":
		case "polygon":
			var points = svgTag.getAttribute("points").split(" ");
			output.push(functionCallAsString("beginShape"));
			for(var p = 0; p < points.length; p++){
				if(points[p]){
					output.push(
						functionCallAsString("vertex",
							points[p].split(",").addNumbers([
								offsetX, offsetY
							])
						)
					);
				}
			}
			output.push(functionCallAsString("endShape", tagName === "polygon" ? "CLOSE" : undefined));
			break;
		case "path":
			var currentPos = {x: 0, y: 0};

			var previousBezierControlPoint = {x: 0, y: 0};
			var previousBezierEndPoint = {x: 0, y: 0};
			
			var pathData = svgTag.getPathData({normalize: true});
			
			var pathOpen = false;

			for(var i = 0; i < pathData.length; i++){
				var segment = pathData[i];
				var segmentData = segment.values;
				switch(segment.type){
					case "Z":
						pathOpen = false;
						output.push(functionCallAsString("endShape"));
						break;
					case "M":
						if(pathOpen){
							output.push(functionCallAsString("endShape"));
						}
						pathOpen = true;
						output.push(functionCallAsString("beginShape"));
						output.push(
							functionCallAsString("vertex",
								[
									segmentData[0], segmentData[1]
								].addNumbers([
									offsetX, offsetY
								])
							)
						);
						break;
					case "L":
						output.push(
							functionCallAsString("vertex",
								[
									segmentData[0], segmentData[1]
								].addNumbers([
									offsetX, offsetY
								])
							)
						);
						break;
					case "C":
					case "S":
						output.push(
							functionCallAsString("bezierVertex",
								[
									segmentData[0] || previousBezierEndPoint.x * 2 - previousBezierControlPoint.x,
									segmentData[1] || previousBezierEndPoint.y * 2 - previousBezierControlPoint.y,
									// segmentData[relativeSegmentType === PATHSEG_CURVETO_CUBIC_REL ? "x1" : "x2"],
									//segmentData[relativeSegmentType === PATHSEG_CURVETO_CUBIC_REL ? "y1" : "y2"],
									segmentData[2],
									segmentData[3],
									segmentData[4],
									segmentData[5]
								].addNumbers([
									offsetX, offsetY, offsetX, offsetY, offsetX, offsetY
								])
							)
						);
						previousBezierControlPoint.x = segmentData[2];
						previousBezierControlPoint.y = segmentData[3];
						previousBezierEndPoint.x = segmentData[4];
						previousBezierEndPoint.y = segmentData[5];
						break;
					case "Q":
					case "T":
						var cubicBezier = quadraticBezierToCubicBezierControlPoints(
							currentPos.x,
							currentPos.y,
							segmentData[0] || previousBezierEndPoint.x * 2 - previousBezierControlPoint.x,
							segmentData[1] || previousBezierEndPoint.y * 2 - previousBezierControlPoint.y,
							//segmentData[relativeSegmentType === PATHSEG_CURVETO_QUADRATIC_REL ? "x1" : "x"],
							//segmentData[relativeSegmentType === PATHSEG_CURVETO_QUADRATIC_REL ? "y1" : "y"],
							segmentData[2],
							segmentData[3]
						);
						output.push(
							functionCallAsString("bezierVertex",
								[
									cubicBezier.x1, cubicBezier.y1,
									cubicBezier.x2, cubicBezier.y2,
									segmentData[2], segmentData[3]
								].addNumbers([
									offsetX, offsetY, offsetX, offsetY, offsetX, offsetY
								])
							)
						);
						previousBezierControlPoint.x = cubicBezier.x2;
						previousBezierControlPoint.y = cubicBezier.y2;
						previousBezierEndPoint.x = segmentData[2];
						previousBezierEndPoint.y = segmentData[3];
						break;
					case "A":
						break;
					case "H":
						output.push(
							functionCallAsString("vertex",
								[
									segmentData[0], currentPos.y
								].addNumbers([
									offsetX, offsetY
								])
							)
						);
						currentPos.x = segmentData[0];
						break;
					case "V":
						output.push(
							functionCallAsString("vertex",
								[
									currentPos.x, segmentData[0]
								].addNumbers([
									offsetX, offsetY
								])
							)
						);
						currentPos.y = segmentData[0];
						break;
						/*output.push(
							functionCallAsString("bezierVertex",
								[
									segmentData.x1, segmentData.y1,
									segmentData.x1, segmentData.y1,
									segmentData.x, segmentData.y
								].addNumbers([
									offsetX, offsetY, offsetX, offsetY, offsetX, offsetY
								])
							)
						);
						break;*/
				}

				if(segment.type !== "H" || segment.type !== "V"){
					currentPos.x = segmentData[segmentData.length - 2];
					currentPos.y = segmentData[segmentData.length - 1];
				}
			}
			if(pathOpen){
				output.push(functionCallAsString("endShape"));
			}
			break;
		case "text":
		case "tref":
			output.push(
				functionCallAsString(
					"text",
					[
						getTextNodes(svgTag),
						svgTag.getAttribute("x") || 0,
						svgTag.getAttribute("y") || 0
					].addNumbers([
						0, offsetX, offsetY
					])
				)
			);
			for(var t = 0; t < svgTag.children.length; t++){
				output.push(svgTagToPJS(svgTag.children[t]));
			}
			break;
		case "image":
			//output.push(functionCallAsString());
			break;
		case "use":
			var tagToUse = outputDocument.querySelector("#svg-output " + svgTag.href);
			output.push(tagToUse ? svgTagToPJS(tagToUse) : "");
	}

	return output.join("\n");
}

var functionCallAsString = function(functionName, args, numberOfRequiredArgs, removeSemicolon){
	var output = functionName + "(";

	if(typeof args !== "undefined"){
		if(typeof args === "string"){
			args = args.split(",");
		}else if(typeof args !== "object"){
			args = [args];
		}

		// Add quotes around string parameters
		/*for(var a = 0; a < args.length; a++){
			if(typeof args[a] === "string"){
				args[a] = JSON.stringify('"' + args[a] + '"').slice(1, -1);
			}
		}*/
		if(numberOfRequiredArgs !== undefined){
			while(args.length < numberOfRequiredArgs){
				args.push(undefined);
			}
			args = args.slice(0, numberOfRequiredArgs);
		}

		if(svgRoundNumbers){
			for(var a = 0; a < args.length; a++){
				if(!isNaN(args[a])){
					args[a] = roundToDecimalPlaces(args[a], svgRoundToDecimalPlaces);
				}
			}
		}
		for(var a = args.length - 1; a > 0; a--){
			if(isNaN(args[a]) || args[a] === "NaN" || args[a] === undefined || args[a] === "undefined"){
				args.pop();
			}else{
				break;
			}
		}
		output += args.join(", ");
	}

	output += ")";
	if(!removeSemicolon){
		output += ";";
	}
	return output;
}

var nameOfFunctionCall = function(functionCall){
	return functionCall.substr(0, functionCall.indexOf('('));
}

/*
var FunctionCall = function(name, args, numberOfRequiredArgs, omitSemicolon){
	this.name = name;

	if(args){
		if(typeof args === "string"){
			args = args.split(",");
		}else if(typeof args !== "object"){
			args = [args];
		}

		if(numberOfRequiredArgs !== undefined){
			while(args.length < numberOfRequiredArgs){
				args.push(undefined);
			}
			args = args.slice(0, numberOfRequiredArgs);
		}
		for(var a = 0; a < args.length; a++){
			if(!isNaN(args[a])){
				args[a] = roundToThreeDecimalPlaces(args[a]);
			}
		}
	}
	this.args = args;
}
FunctionCall.prototype.toString = function(){
	var output = this.name + "(";
	if(this.args){
		output += args.join(", ");
	}
	output += ")";
	if(!this.omitSemicolon){
		output += ";";
	}
	return output;
}
*/

var getAttrs = function(element, attrNames, defaultAttrValues){
	var arr = [];
	for(var a = 0; a < attrNames.length; a++){
		var attrName = attrNames[a];
		var value = element.getAttribute(attrName);
		if((value === null || typeof value === "undefined") && defaultAttrValues) value = defaultAttrValues[a];
		if(typeof value === "string") value = value.trim();
		//if(!isNaN(value)){
			arr.push(value);
		//}
	}
	return arr;
}

var css3ColorToPJSParameters = function(color, opacity){
	if(!styleIsDefined(color)) return;

	var parameters;
	if(color[0] === "u"){
		var linkedElement = outputDocument.querySelector(color.slice(color.indexOf("(") + 1, -1));
		if(linkedElement && linkedElement.tagName === "linearGradient"){
			return css3ColorToPJSParameters(window.getComputedStyle(linkedElement.children[0], "stop-color"), opacity);
		}else{
			return;
		}
	}else if(color[0] === "r"){
		parameters = color.slice(color.indexOf("(") + 1, -1);
	}else if(color[0] === "#"){
		parameters = hexToRGB(color.substring(1));
	}
	if(styleIsDefined(opacity)){
		parameters += ", " + (opacity * 255)
	}
	return parameters;
}

var hexToRGB = function(hex){
	if(hex.length < 6){
		for(var i = hex.length - 1; i >= 0; i--){
			hex = hex.slice(0, i) + hex[i] + hex.slice(i)
		}
	}
	var bigInt = parseInt(hex, 16);
	return [(bigInt >> 16) & 255, (bigInt >> 8) & 255, bigInt & 255].join(", ");
}

var quadraticBezierToCubicBezierControlPoints = function(x1, y1, x2, y2, x3, y3){
	return {
		x1: x1 + 2/3 * (x2 - x1),
		y1: y1 + 2/3 * (y2 - y1),
		x2: x3 + 2/3 * (x2 - x3),
		y2: y3 + 2/3 * (y2 - y3),
	}
}

var roundToDecimalPlaces = function(num, decimalPlaces){
	return Math.round((parseFloat(num) + 1/Math.pow(10, decimalPlaces*2)) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

var styleIsDefined = function(style){
	return style !== undefined && style !== null && style !== "none" && style !== "transparent";
}

var getTextNodes = function(element){
	var nodes = element.childNodes;
	var t = '';

	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i].nodeType == 3) {
			t += nodes[i].nodeValue;
		}
	}

	return t;
}

Array.prototype.addNumbers = function(arr){
	console.log("before", this, arr)
	for(var n = 0; n < Math.min(this.length, arr.length); n++){
		if(/*!isNaN(this[n]) && */!isNaN(arr[n])){
			this[n] = +this[n] + arr[n];
		}
	}
	console.log("after", this);
	return this;
}

var addSwappedKeysAndValues = function(obj){
	for(var key in obj){
		obj[obj[key]] = key;
	}
	return obj;
}
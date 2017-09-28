const creditLine = "/**\n * Converted from SVG format using @darrylyeo's SVG-to-PJS converter:\n * darryl-yeo.com/svg-to-processing-js-converter\n */"

const wrapper = document.getElementById("svg-to-pjs-converter")

const output = document.getElementById("svg-output")
const outputWindow = output.contentWindow
const outputDocument = output.contentDocument || output.contentWindow.document
const pathDataScript = outputDocument.createElement("script")
pathDataScript.setAttribute("src", "../src/path-data-polyfill.js")
outputDocument.head.appendChild(pathDataScript)

const outputWrapper = document.getElementById("svg-to-pjs-output")
const pjsOutput = document.getElementById("pjs-output")

const svgFilePicker = document.getElementById('svg-file')
const svgInput = document.getElementById('svg-input')
const optionCenterGraphic = document.getElementById('svg-option-center-graphic')
const optionRoundDecimals = document.getElementById('svg-option-round-decimals')
const optionRoundToDecimalPlaces = document.getElementById('svg-option-round-to-decimal-places')

optionCenterGraphic.addEventListener('change', updateSVGOutput, false)
optionRoundDecimals.addEventListener('change', function(e) {
	optionRoundToDecimalPlaces.disabled = !optionRoundDecimals.checked
	updateSVGOutput()
}, false)
optionRoundToDecimalPlaces.addEventListener('change', updateSVGOutput, false)

svgFilePicker.addEventListener('change', function(e) {
	const files = e.target.files; // FileList object

	// files is a FileList of File objects. List some properties.
	for (const f of files) {
		const reader = new FileReader()

		reader.onloadend = function(e) {
			if (e.target.readyState == FileReader.DONE) { // DONE == 2
				svgInput.value = e.target.result
				updateSVGOutput(e.target.result)
			}
		}

		reader.readAsBinaryString(f)
	}
}, false)

svgInput.addEventListener('change', function(e){
	updateSVGOutput(this.value)
})
svgInput.addEventListener('keyup', function(e){
	if(e.keyCode == 13){
		updateSVGOutput(this.value)
	}
})

function updateSVGOutput(data){
	wrapper.classList.add("input-received")
	
	let svg = outputDocument.body.querySelector("svg")
	svg && svg.parentNode.removeChild(svg)
	outputDocument.body.innerHTML += data

	svg = outputDocument.querySelector("svg")
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
			].join("\n\n")
		}catch(e){
			pjsOutput.value = "Looks like there was an error!\n" + e.message + " (" + e.lineNumber + ")"
			//pjsOutput.value = "Looks like there was an error! Good thing you're testing it for me. Tell me about it and I'll be sure to resolve it.\n" + e.message + " (" + e.lineNumber + ")"
			console.error(e)
		}
	}
}


let offsetX, offsetY
let svgRoundNumbers, svgRoundToDecimalPlaces
const svgToPJS = function(svg, centerGraphic, roundNumbers, roundToDecimalPlaces){
	offsetX = centerGraphic ? parseFloat(svg.getAttribute("width")) / -2 : 0
	offsetY = centerGraphic ? parseFloat(svg.getAttribute("height")) / -2 : 0

	svgRoundNumbers = roundNumbers
	svgRoundToDecimalPlaces = roundToDecimalPlaces

	// Trim overrideable function calls that are redundant
	const output = svgTagToPJS(svg).split("\n")

	const overrideableFunctions = {
		"fill" : "fill",
		"noFill" : "fill",
		"stroke" : "stroke",
		"noStroke" : "stroke",
		"strokeCap" : "strokeCap"
	}
	const lastOverrideableFunctionCallForName = {
		// "mapped name" : ["function call", line#]
		"fill": ["", 0],
		"stroke": ["", 0],
		"strokeCap": ["", 0],
	}
	let nonOverrideableFunctionWasCalledSinceLastOverrideableFunction = false
	for(let f = 0; f < output.length; f++){
		const functionCall = output[f]
		const functionName = nameOfFunctionCall(functionCall)
		//console.log("---------\n" + f + " " + functionCall)

		const mappedFunctionName = overrideableFunctions[functionName]
		if(mappedFunctionName){
			const lastOverrideableFunctionCall = lastOverrideableFunctionCallForName[mappedFunctionName][0]
			var lastOverrideableFunctionCallLineNumber = lastOverrideableFunctionCallForName[mappedFunctionName][1]
			const lastOverrideableFunctionCallName = nameOfFunctionCall(lastOverrideableFunctionCall)
			// If the current function call exactly matches the last function call for the same mapped name, remove the current function call
			if(functionCall === lastOverrideableFunctionCall){
				//console.log("Matches call on line " + lastOverrideableFunctionCallLineNumber + ": removing this line " + functionCall)
				output[f] = undefined
			}
			// If the NAME of the current function call is the same as the NAME of the last call for the same mapped name AND a non-overrideable function (e.g. a shape) has not been called between the two
			else if(functionName === lastOverrideableFunctionCallName && !nonOverrideableFunctionWasCalledSinceLastOverrideableFunction){
				//console.log("Overrode call on line " + lastOverrideableFunctionCallLineNumber + ": removing line " + output[lastOverrideableFunctionCallLineNumber])
				//The current call overrode the previous call; remove the previous call
				output[lastOverrideableFunctionCallLineNumber] = undefined
			}
			nonOverrideableFunctionWasCalledSinceLastOverrideableFunction = false
		}else{
			nonOverrideableFunctionWasCalledSinceLastOverrideableFunction = true
		}
		lastOverrideableFunctionCallForName[mappedFunctionName] = [functionCall, output[f] ? f : lastOverrideableFunctionCallLineNumber]
	}
	/*
	for(let f = 0; f < output.length; f++){
		const functionName = output[f].substr(0, output[f].indexOf('('))
		const functionName1 = ((f + 1) < output.length) ? output[f + 1].substr(0, output[f + 1].indexOf('(')) : ""
		if((functionName === functionName1 && overrideableFunctions[functionName]) || overrideableFunctions[functionName] === functionName1){
			output[f] = undefined
		}
	}
	*/
	return output.filter(function(e){return e}).join("\n")
}

function svgTagToPJS(svgTag){
	if(!svgTag) return ''

	const output = []
	const tagName = svgTag.tagName

	const computedStyle = outputWindow.getComputedStyle(svgTag)

	const fill = computedStyle.fill
	const fillOpacity = computedStyle.fillOpacity
	if(styleIsDefined(fill)){
		const pjsParameters = css3ColorToPJSParameters(fill, fillOpacity)
		output.push(functionCallAsString(pjsParameters ? "fill" : "noFill", pjsParameters))
	}else if(fill === "none" || fill === "transparent"){
		output.push(functionCallAsString("noFill"))
	}else{console.log(9, functionCallAsString("fill", 0))
		output.push(functionCallAsString("fill", 0))
	}

	const stroke = computedStyle.stroke
	const strokeOpacity = computedStyle.strokeOpacity
	if(styleIsDefined(stroke)){
		const pjsParameters = css3ColorToPJSParameters(stroke, strokeOpacity)
		output.push(functionCallAsString(pjsParameters ? "stroke" : "noStroke", pjsParameters))
	}else{
		output.push(functionCallAsString("noStroke"))
	}

	const strokeWidth = computedStyle.strokeWidth
	if(styleIsDefined(strokeWidth)) output.push(functionCallAsString("strokeWeight", parseInt(strokeWidth)))

	const strokeLineCap = computedStyle.strokeLineCap
	if(styleIsDefined(strokeLineCap)){
		output.push("strokeCap", {
			"butt" : "SQUARE",
			"round" : "ROUND",
			"square" : "PROJECT"
		}[strokeLineCap])
	}
console.log(tagName)
	switch(tagName){
		case "svg":
		case "g":
			for(const child of svgTag.children){
				output.push(svgTagToPJS(child))
			}
			break
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
			)
			break
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
			)
			break
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
			)
			break
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
			)
			break
		case "polyline":
		case "polygon":
			const points = svgTag.getAttribute("points").split(" ")
			output.push(functionCallAsString("beginShape"))
			for(const p of points){
				if(p){
					output.push(
						functionCallAsString("vertex",
							p.split(",").addNumbers([
								offsetX, offsetY
							])
						)
					)
				}
			}
			output.push(functionCallAsString("endShape", tagName === "polygon" ? "CLOSE" : undefined))
			break
		case "path":
			const currentPos = {x: 0, y: 0}

			const previousBezierControlPoint = {x: 0, y: 0}
			const previousBezierEndPoint = {x: 0, y: 0}
			
			const pathData = svgTag.getPathData({normalize: true})
			
			let pathOpen = false

			for(const segment of pathData){
				const segmentData = segment.values
				switch(segment.type){
					case "Z":
						pathOpen = false
						output.push(functionCallAsString("endShape"))
						break
					case "M":
						if(pathOpen){
							output.push(functionCallAsString("endShape"))
						}
						pathOpen = true
						output.push(functionCallAsString("beginShape"))
						output.push(
							functionCallAsString("vertex",
								[
									segmentData[0], segmentData[1]
								].addNumbers([
									offsetX, offsetY
								])
							)
						)
						break
					case "L":
						output.push(
							functionCallAsString("vertex",
								[
									segmentData[0], segmentData[1]
								].addNumbers([
									offsetX, offsetY
								])
							)
						)
						break
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
						)
						previousBezierControlPoint.x = segmentData[2]
						previousBezierControlPoint.y = segmentData[3]
						previousBezierEndPoint.x = segmentData[4]
						previousBezierEndPoint.y = segmentData[5]
						break
					case "Q":
					case "T":
						const cubicBezier = quadraticBezierToCubicBezierControlPoints(
							currentPos.x,
							currentPos.y,
							segmentData[0] || previousBezierEndPoint.x * 2 - previousBezierControlPoint.x,
							segmentData[1] || previousBezierEndPoint.y * 2 - previousBezierControlPoint.y,
							//segmentData[relativeSegmentType === PATHSEG_CURVETO_QUADRATIC_REL ? "x1" : "x"],
							//segmentData[relativeSegmentType === PATHSEG_CURVETO_QUADRATIC_REL ? "y1" : "y"],
							segmentData[2],
							segmentData[3]
						)
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
						)
						previousBezierControlPoint.x = cubicBezier.x2
						previousBezierControlPoint.y = cubicBezier.y2
						previousBezierEndPoint.x = segmentData[2]
						previousBezierEndPoint.y = segmentData[3]
						break
					case "A":
						break
					case "H":
						output.push(
							functionCallAsString("vertex",
								[
									segmentData[0], currentPos.y
								].addNumbers([
									offsetX, offsetY
								])
							)
						)
						currentPos.x = segmentData[0]
						break
					case "V":
						output.push(
							functionCallAsString("vertex",
								[
									currentPos.x, segmentData[0]
								].addNumbers([
									offsetX, offsetY
								])
							)
						)
						currentPos.y = segmentData[0]
						break
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
						)
						break*/
				}

				if(segment.type !== "H" || segment.type !== "V"){
					currentPos.x = segmentData[segmentData.length - 2]
					currentPos.y = segmentData[segmentData.length - 1]
				}
			}
			if(pathOpen){
				output.push(functionCallAsString("endShape"))
			}
			break
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
			)
			for(const child of svgTag.children){
				output.push(svgTagToPJS(child))
			}
			break
		case "image":
			//output.push(functionCallAsString())
			break
		case "use":
			const tagToUse = outputDocument.querySelector("#svg-output " + svgTag.href)
			output.push(tagToUse ? svgTagToPJS(tagToUse) : "")
	}

	return output.join("\n")
}

const functionCallAsString = function(functionName, args, numberOfRequiredArgs, removeSemicolon){
	let output = functionName + "("

	if(typeof args !== "undefined"){
		if(typeof args === "string"){
			args = args.split(",")
		}else if(typeof args !== "object"){
			args = [args]
		}

		// Add quotes around string parameters
		/*args = args.map(a => {
			if(typeof a === "string"){
				return JSON.stringify('"' + a + '"').slice(1, -1)
			}else{
				return a
			}
		})*/
		if(numberOfRequiredArgs !== undefined){
			while(args.length < numberOfRequiredArgs){
				args.push(undefined)
			}
			args = args.slice(0, numberOfRequiredArgs)
		}

		if(svgRoundNumbers){
			args = args.map(a => {
				if(!isNaN(a)){
					return roundToDecimalPlaces(a, svgRoundToDecimalPlaces)
				}else{
					return a
				}
			})
		}
		while(true){
			const a = args[args.length - 1]
			if(isNaN(a) || a === "NaN" || a === undefined || a === "undefined"){
				args.pop()
			}else{
				break
			}
		}
		output += args.join(", ")
	}

	output += ")"
	if(!removeSemicolon){
		output += ";"
	}
	return output
}

const nameOfFunctionCall = function(functionCall){
	return functionCall.substr(0, functionCall.indexOf('('))
}

/*
const FunctionCall = function(name, args, numberOfRequiredArgs, omitSemicolon){
	this.name = name

	if(args){
		if(typeof args === "string"){
			args = args.split(",")
		}else if(typeof args !== "object"){
			args = [args]
		}

		if(numberOfRequiredArgs !== undefined){
			while(args.length < numberOfRequiredArgs){
				args.push(undefined)
			}
			args = args.slice(0, numberOfRequiredArgs)
		}
		for(let a = 0; a < args.length; a++){
			if(!isNaN(args[a])){
				args[a] = roundToThreeDecimalPlaces(args[a])
			}
		}
	}
	this.args = args
}
FunctionCall.prototype.toString = function(){
	const output = this.name + "("
	if(this.args){
		output += args.join(", ")
	}
	output += ")"
	if(!this.omitSemicolon){
		output += ""
	}
	return output
}
*/

const getAttrs = function(element, attrNames, defaultAttrValues){
	const arr = []
	attrNames.forEach((attrName, a) => {
		let value = element.getAttribute(attrName)
		if((value === null || typeof value === "undefined") && defaultAttrValues) value = defaultAttrValues[a]
		if(typeof value === "string") value = value.trim()
		//if(!isNaN(value)){
			arr.push(value)
		//}
	})
	return arr
}

const css3ColorToPJSParameters = function(color, opacity){
	if(!styleIsDefined(color)) return

	let parameters
	if(color[0] === "u"){
		const linkedElement = outputDocument.querySelector(color.slice(color.indexOf("(") + 1, -1))
		if(linkedElement && linkedElement.tagName === "linearGradient"){
			return css3ColorToPJSParameters(window.getComputedStyle(linkedElement.children[0], "stop-color"), opacity)
		}else{
			return
		}
	}else if(color[0] === "r"){
		parameters = color.slice(color.indexOf("(") + 1, -1)
	}else if(color[0] === "#"){
		parameters = hexToRGB(color.substring(1))
	}
	if(styleIsDefined(opacity)){
		parameters += ", " + (opacity * 255)
	}
	return parameters
}

const hexToRGB = function(hex){
	if(hex.length < 6){
		for(let i = hex.length - 1; i >= 0; i--){
			hex = hex.slice(0, i) + hex[i] + hex.slice(i)
		}
	}
	const bigInt = parseInt(hex, 16)
	return [(bigInt >> 16) & 255, (bigInt >> 8) & 255, bigInt & 255].join(", ")
}

const quadraticBezierToCubicBezierControlPoints = function(x1, y1, x2, y2, x3, y3){
	return {
		x1: x1 + 2/3 * (x2 - x1),
		y1: y1 + 2/3 * (y2 - y1),
		x2: x3 + 2/3 * (x2 - x3),
		y2: y3 + 2/3 * (y2 - y3),
	}
}

const roundToDecimalPlaces = function(num, decimalPlaces){
	return Math.round((parseFloat(num) + 1/Math.pow(10, decimalPlaces*2)) * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
}

const styleIsDefined = function(style){
	return style !== undefined && style !== null && style !== "none" && style !== "transparent"
}

const getTextNodes = function(element){
	const nodes = element.childNodes
	const t = ''

	for(const node of nodes) {
		if(node.nodeType == 3) {
			t += node.nodeValue
		}
	}

	return t
}

Array.prototype.addNumbers = function(arr){
	console.log("before", this, arr)
	for(let n = 0; n < Math.min(this.length, arr.length); n++){
		if(/*!isNaN(this[n]) && */!isNaN(arr[n])){
			this[n] = +this[n] + arr[n]
		}
	}
	console.log("after", this)
	return this
}

const addSwappedKeysAndValues = function(obj){
	for(const key in obj){
		obj[obj[key]] = key
	}
	return obj
}
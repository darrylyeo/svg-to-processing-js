{

const creditLine = "/**\n * Converted from SVG format using @darrylyeo's SVG-to-PJS converter:\n * darryl-yeo.com/svg-to-processing-js-converter\n */"

const $ = document.querySelector.bind(document)

const $wrapper = $('#svg-to-pjs-converter')

const $output = $('#svg-output')
const $outputWindow = $output.contentWindow
const $outputDocument = $output.contentDocument || $output.contentWindow.document
const $pathDataScript = $outputDocument.createElement('script')
$pathDataScript.setAttribute('src', '../src/path-data-polyfill.js')
$outputDocument.head.appendChild($pathDataScript)

const $outputWrapper = $('#svg-to-pjs-output')
const $pjsOutput = $('#pjs-output')

const $svgFilePicker = $('#svg-file')
const $svgInput = $('#svg-input')
const $optionCenterGraphic = $('#svg-option-center-graphic')
const $optionRoundDecimals = $('#svg-option-round-decimals')
const $optionRoundToDecimalPlaces = $('#svg-option-round-to-decimal-places')

$optionCenterGraphic.addEventListener('change', () => updateSVGOutput(), false)
$optionRoundDecimals.addEventListener('change', function(e) {
	$optionRoundToDecimalPlaces.disabled = !$optionRoundDecimals.checked
	updateSVGOutput()
}, false)
$optionRoundToDecimalPlaces.addEventListener('change', () => updateSVGOutput(), false)

$svgFilePicker.addEventListener('change', function(e) {
	const files = e.target.files; // FileList object

	// files is a FileList of File objects. List some properties.
	for (const f of files) {
		const reader = new FileReader()

		reader.onloadend = function(e) {
			if (e.target.readyState == FileReader.DONE) { // DONE == 2
				$svgInput.value = e.target.result
				updateSVGOutput()
			}
		}

		reader.readAsBinaryString(f)
	}
}, false)

$svgInput.addEventListener('change', function(e){
	updateSVGOutput()
})
$svgInput.addEventListener('keyup', function(e){
	if(e.keyCode == 13){
		updateSVGOutput()
	}
})

function updateSVGOutput(data = $svgInput.value){
	if(!data) return

	$wrapper.classList.add('input-received')
	
	let $svg = $outputDocument.querySelector('svg')
	if($svg) $svg.parentNode.removeChild($svg)
	$outputDocument.body.innerHTML += data

	$svg = $outputDocument.querySelector('svg')
	if($svg){
		try {
			$pjsOutput.value = [
				creditLine,
				svgToPJS(
					$svg,
					$optionCenterGraphic.checked,
					$optionRoundDecimals.checked,
					$optionRoundToDecimalPlaces.value
				),
				creditLine
			].join('\n\n')
		}catch(e){
			$pjsOutput.value = `Looks like there was an error!\n${e.message} (${e.lineNumber})`
			//$pjsOutput.value = `Looks like there was an error! Good thing you're testing it for me. Tell me about it and I'll be sure to resolve it.\n${e.message} (${e.lineNumber})`
			console.error(e)
		}
	}
}


let offsetX, offsetY
let svgRoundNumbers, svgRoundToDecimalPlaces
const svgToPJS = function($svg, centerGraphic, roundNumbers, roundToDecimalPlaces){
	offsetX = centerGraphic ? parseFloat($svg.getAttribute('width')) / -2 : 0
	offsetY = centerGraphic ? parseFloat($svg.getAttribute('height')) / -2 : 0

	svgRoundNumbers = roundNumbers
	svgRoundToDecimalPlaces = roundToDecimalPlaces

	const output = svgTagToPJS($svg).toString()
	return output
}


const STYLE_COMMANDS = ['fill', 'stroke', 'strokeWeight', 'strokeCap']
const SHAPE_COMMANDS = ['rect', 'ellipse', 'line', 'beginShape', 'vertex', 'bezierVertex', 'endShape', 'text']
const ALL_COMMANDS = [...STYLE_COMMANDS, ...SHAPE_COMMANDS]

class PJSProgram {
	constructor(){
		this.commands = []
		this.currentStyle = {}
	}

	addCommand(name, ...args){
		args = args.filter(x => x !== undefined)

		const isStyleCommand = STYLE_COMMANDS.includes(name)
		const isShapeCommand = SHAPE_COMMANDS.includes(name)

		if(svgRoundNumbers){
			args = args.map(a => isNaN(a) ? a : roundToDecimalPlaces(a, svgRoundToDecimalPlaces))
		}

		// Prevent duplicate style commands
		if(
			isStyleCommand &&
			name in this.currentStyle &&
			this.currentStyle[name].args.equals(args)
		) return
		
		const command = {
			name,
			args,
			used: isShapeCommand // shape commands are used by default; style commands become used if a shape uses it
		}
		this.commands.push(command)

		if(isShapeCommand){
			for(const name in this.currentStyle){
				this.currentStyle[name].used = true
			}
		}else{
			this.currentStyle[name] = command
		}
	}

	toString(){
		return this.commands.filter(command => command.used).map(({name, args}) => {
			if(!args.length){
				name = {
					'fill': 'noFill',
					'stroke': 'noStroke'
				}[name] || name
			}
			return `${name}(${args.join(', ')});`
		}).join('\n')
	}
}

for(const command of ALL_COMMANDS){
	PJSProgram.prototype[command] = function(...args){
		this.addCommand(command, ...args)
	}
}

function svgTagToPJS($svgTag, program = new PJSProgram()){
	if(!$svgTag) return ''

	const tagName = $svgTag.tagName

	const computedStyle = $outputWindow.getComputedStyle($svgTag)

	const getAttrs = function(attrNames, defaultAttrValues){
		return attrNames.map((attrName, a) => {
			let value = computedStyle[attrName]
			const defaultValue = defaultAttrValues[a]

			if(typeof defaultValue === 'number') value = parseInt(value)

			if(value === null || typeof value === 'undefined') value = defaultValue
			else if(typeof value === 'string') value = value.trim()

			return value
		})
	}

	const {fill, fillOpacity, stroke, strokeOpacity, strokeWidth, strokeLineCap} = computedStyle

	if(styleIsDefined(fill)){
		program.fill(...css3ColorToPJSParameters(fill, fillOpacity))
	}else if(fill === 'none' || fill === 'transparent'){
		program.fill()
	}else{
		program.fill(0)
	}

	if(styleIsDefined(stroke)){
		program.stroke(...css3ColorToPJSParameters(stroke, strokeOpacity))
	}else{
		program.stroke()
	}

	if(styleIsDefined(strokeWidth)) program.strokeWeight(parseInt(strokeWidth))

	if(styleIsDefined(strokeLineCap)){
		program.strokeCap({
			'butt' : 'SQUARE',
			'round' : 'ROUND',
			'square' : 'PROJECT'
		}[strokeLineCap])
	}

	console.log(tagName)

	switch(tagName){
		case 'svg':
		case 'g':
			for(const child of $svgTag.children){
				svgTagToPJS(child, program)
			}
			break
		case 'rect':
			program.rect(
				...getAttrs(
					['x', 'y', 'width', 'height', 'rx'],
					[0, 0, 0, 0, undefined]
				).addNumbers([
					offsetX, offsetY
				])
			)
			break
		case 'circle':
			program.ellipse(
				...getAttrs(
					['cx', 'cy', 'r', 'r'],
					[0, 0, 0, 0]
				).addNumbers([
					offsetX, offsetY
				])
			)
			break
		case 'ellipse':
			program.ellipse(
				...getAttrs(
					['cx', 'cy', 'rx', 'ry'],
					[0, 0, 0, 0]
				).addNumbers([
					offsetX, offsetY
				])
			)
			break
		case 'line':
			program.line(
				...getAttrs($svgTag,
					['x1', 'y1', 'x2', 'y2'],
					[0, 0, 0, 0]
				).addNumbers([
					offsetX, offsetY, offsetX, offsetY
				])
			)
			break
		case 'polyline':
		case 'polygon':
			const points = $svgTag.getAttribute('points').split(' ')
			program.beginShape()
			for(const p of points){
				if(p){
					program.vertex(
						...p.split(',').addNumbers([
							offsetX, offsetY
						])
					)
				}
			}
			program.endShape(tagName === 'polygon' ? 'CLOSE' : undefined)
			break
		case 'path':
			const currentPos = {x: 0, y: 0}

			const previousBezierControlPoint = {x: 0, y: 0}
			const previousBezierEndPoint = {x: 0, y: 0}
			
			const pathData = $svgTag.getPathData({normalize: true})
			
			let pathOpen = false

			for(const segment of pathData){
				const segmentData = segment.values
				switch(segment.type){
					case 'Z':
						pathOpen = false
						program.endShape()
						break
					case 'M':
						if(pathOpen){
							program.endShape()
						}
						pathOpen = true
						program.beginShape()
						program.vertex(
							...[
								segmentData[0], segmentData[1]
							].addNumbers([
								offsetX, offsetY
							])
						)
						break
					case 'L':
						program.vertex(
							...[
								segmentData[0], segmentData[1]
							].addNumbers([
								offsetX, offsetY
							])
						)
						break
					case 'C':
					case 'S':
						program.bezierVertex(
							...[
								segmentData[0] || previousBezierEndPoint.x * 2 - previousBezierControlPoint.x,
								segmentData[1] || previousBezierEndPoint.y * 2 - previousBezierControlPoint.y,
								// segmentData[relativeSegmentType === PATHSEG_CURVETO_CUBIC_REL ? 'x1' : 'x2'],
								//segmentData[relativeSegmentType === PATHSEG_CURVETO_CUBIC_REL ? 'y1' : 'y2'],
								segmentData[2],
								segmentData[3],
								segmentData[4],
								segmentData[5]
							].addNumbers([
								offsetX, offsetY, offsetX, offsetY, offsetX, offsetY
							])
						)
						previousBezierControlPoint.x = segmentData[2]
						previousBezierControlPoint.y = segmentData[3]
						previousBezierEndPoint.x = segmentData[4]
						previousBezierEndPoint.y = segmentData[5]
						break
					case 'Q':
					case 'T':
						const cubicBezier = quadraticBezierToCubicBezierControlPoints(
							currentPos.x,
							currentPos.y,
							segmentData[0] || previousBezierEndPoint.x * 2 - previousBezierControlPoint.x,
							segmentData[1] || previousBezierEndPoint.y * 2 - previousBezierControlPoint.y,
							//segmentData[relativeSegmentType === PATHSEG_CURVETO_QUADRATIC_REL ? 'x1' : 'x'],
							//segmentData[relativeSegmentType === PATHSEG_CURVETO_QUADRATIC_REL ? 'y1' : 'y'],
							segmentData[2],
							segmentData[3]
						)
						program.bezierVertex(
							...[
								cubicBezier.x1, cubicBezier.y1,
								cubicBezier.x2, cubicBezier.y2,
								segmentData[2], segmentData[3]
							].addNumbers([
								offsetX, offsetY, offsetX, offsetY, offsetX, offsetY
							])
						)
						previousBezierControlPoint.x = cubicBezier.x2
						previousBezierControlPoint.y = cubicBezier.y2
						previousBezierEndPoint.x = segmentData[2]
						previousBezierEndPoint.y = segmentData[3]
						break
					case 'A':
						break
					case 'H':
						program.vertex(
							...[
								segmentData[0], currentPos.y
							].addNumbers([
								offsetX, offsetY
							])
						)
						currentPos.x = segmentData[0]
						break
					case 'V':
						program.vertex(
							...[
								currentPos.x, segmentData[0]
							].addNumbers([
								offsetX, offsetY
							])
						)
						currentPos.y = segmentData[0]
						break
				}

				if(segment.type !== 'H' || segment.type !== 'V'){
					currentPos.x = segmentData[segmentData.length - 2]
					currentPos.y = segmentData[segmentData.length - 1]
				}
			}
			if(pathOpen){
				program.endShape()
			}
			break
		case 'text':
		case 'tref':
			program.text(
				...[
					getTextNodes($svgTag),
					$svgTag.getAttribute('x') || 0,
					$svgTag.getAttribute('y') || 0
				].addNumbers([
					0, offsetX, offsetY
				])
			)
			for(const child of $svgTag.children){
				svgTagToPJS(child, program)
			}
			break
		case 'image':
			//output.push(functionCallAsString())
			break
		case 'use':
			const $tagToUse = $outputDocument.querySelector('#svg-output ' + $svgTag.href)
			if($tagToUse){
				svgTagToPJS($tagToUse, program)
			}
	}

	return program
}

const css3ColorToPJSParameters = function(color, opacity){
	if(!styleIsDefined(color)) return

	let parameters
	if(color[0] === 'u'){
		const $linkedElement = $outputDocument.querySelector(color.slice(color.indexOf('(') + 1, -1))
		if($linkedElement && $linkedElement.tagName === 'linearGradient'){
			return css3ColorToPJSParameters(window.getComputedStyle($linkedElement.children[0], 'stop-color'), opacity)
		}else{
			return
		}
	}else if(color[0] === 'r'){
		parameters = color.slice(color.indexOf('(') + 1, -1).replace(/ /g, '').split(',')
	}else if(color[0] === '#'){
		parameters = hexToRGB(color.substring(1))
	}
	if(parameters[0] === parameters[1] && parameters[1] === parameters[2]){
		parameters = [parameters[0]]
	}
	if(styleIsDefined(opacity) && opacity < 1){
		parameters.push(opacity * 255)
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
	return [(bigInt >> 16) & 255, (bigInt >> 8) & 255, bigInt & 255]
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
	return style !== undefined && style !== null && style !== 'none' && style !== 'transparent'
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
	console.log('before', this, arr)
	for(let n = 0; n < Math.min(this.length, arr.length); n++){
		if(/*!isNaN(this[n]) && */!isNaN(arr[n])){
			this[n] = +this[n] + arr[n]
		}
	}
	console.log('after', this)
	return this
}
Array.prototype.equals = function(array){
	return this.length === array.length && this.every((x, i) => x === array[i])
}

}
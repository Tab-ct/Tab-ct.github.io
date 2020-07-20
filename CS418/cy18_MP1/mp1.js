/**
 * @file MP1 assignment
 * @author chengting Yu <cy18@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas drawn on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The angle of self-rotation about Z-axis*/
var defAngleZ = 0;

/** @global The angle of rotation around the z-axis*/
var centerAngle = 0;

/** @global The angluar speed factor of rotation around the z axis */
var defAngleZSpeedFactor = 1;
var centerAngleSpeedFactor = 1;

/** @global The parameters that used for translation */
var transFactor = 0;
var translateX = 0;
var translateY = 0;

/** @global Two times pi to save some multiplications...*/
var twicePi=2.0*3.14159;

/** @global Paras used in non-uniform motion */
var sinAngle = 0;
var circleCount = 0;

/** @global The max number of scenes in first and second animations */
const NUM_SCENE = 6;
const NUM_SCENE_SECOND = 7;

/** @global The threshold number at which stallTime is going to reach */
const WAIT = 25;

/** @global The alternative to setTimeout() lagging, just increments per frame till flag */
var stallTime = 0;

/** @global The state at which the image is animating */
var scene = 0;

/** @global The parameters used to restore the angles smoothly */
var defAngleZSmooth = 0;
var centerAngleSmooth = 0;

/** @global The flag to distinguush which animation to act */
var isSecondAnimation = 0;


/** @global The paramaters that used in second animation */
var shapeChangeFactor = 0;

/** @global The frame count in some scene to support movements */
var frameCount = 0;

//----------------------------------------------------------------------------------

/** 
 * These pop and push functions copied from examples in class.
 */ 
var mvMatrixStack = [];
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}


/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}


/**
 * Separate Two "I" to achieve non-uniform transform.
 * @param {Number} angle Angles used to descirbe two I's position.
 */
function separateIs(angle){
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  
  // vertices to update (blue I)
  var data = [
  -0.44, 0.61,  0.1,
  0.44,  0.61,  0.1,
  -0.44, 0.21, 0.1,

  0.44,  0.61,  0.1,
  -0.44, 0.21, 0.1,
  0.44,  0.21, 0.1,

  -0.26, 0.21, 0.1,
  0.26,  0.21, 0.1,
  -0.26, -0.21, 0.1,

  0.26,  0.21, 0.1,
  -0.26,  -0.21,  0.1,
  0.26,  -0.21,  0.1,
  
  -0.44, -0.61,  0.1,
  0.44,  -0.61,  0.1,
  -0.44, -0.21, 0.1,

  0.44,  -0.61,  0.1,
  -0.44, -0.21, 0.1,
  0.44,  -0.21, 0.1

];

// Some change in X and Y parameters to achieve non-uniform change.
   for (var i=0; i < 54; i += 3) {
    data[i] = data[i] * (Math.cos(degToRad(angle)));
    data[i+1] = data[i+1] - 0.4 * Math.sin(degToRad(angle)) ;
  }

  // update the data which only cover the blue one
  // VERTEX_OFFSET = 18 (vertices) * 3 (dimensions) * 4 (bytes)
  gl.bufferSubData(gl.ARRAY_BUFFER, 18 * 3 * 4 , new Float32Array(data));


  // vertices to update (ograng I)
  var data = [
    // Orange I
    -0.38, 0.55,  0.0,
    0.38,  0.55,  0.0,
    -0.38, 0.27, 0.0,

    0.38,  0.55,  0.0,
    -0.38, 0.27, 0.0,
    0.38,  0.27, 0.0,

    -0.2, 0.27, 0.0,
    0.2,  0.27, 0.0,
    -0.2, -0.27, 0.0,

    0.2,  0.27, 0.0,
    -0.2,  -0.27,  0.0,
    0.2,  -0.27,  0.0,
    
    -0.38, -0.55,  0.0,
    0.38,  -0.55,  0.0,
    -0.38, -0.27, 0.0,
    
    0.38,  -0.55,  0.0,
    -0.38, -0.27, 0.0,
    0.38,  -0.27, 0.0,
  
  ];

  // Some change in X and Y parameters to achieve non-uniform change.
  for (var i=0; i < 54; i += 3) {
    data[i] = data[i] - 0.2 + 0.2 * Math.cos(degToRad(angle)) ;
    data[i+1] = data[i+1] + 0.4 * Math.sin(degToRad(angle));
  }

  // update the data which only cover the orange one
  gl.bufferSubData(gl.ARRAY_BUFFER, 0 , new Float32Array(data));

}


/**
 * The function used in second animation in order to
 * change shape from "I" to "circle"
 * @param {Number} shapeChangeFactor The factor that control total process.
 */
function shapeChange(shapeChangeFactor){

  // determine the current position of vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    
    // vertices to update (blue I)
    var dataFrom = [
    // Orange I
    -0.38, 0.55,  0.0,
    0.38,  0.55,  0.0,
    -0.38, 0.27, 0.0,

    0.38,  0.55,  0.0,
    -0.38, 0.27, 0.0,
    0.38,  0.27, 0.0,

    -0.2, 0.27, 0.0,
    0.2,  0.27, 0.0,
    -0.2, -0.27, 0.0,

    0.2,  0.27, 0.0,
    -0.2,  -0.27,  0.0,
    0.2,  -0.27,  0.0,
    
    -0.38, -0.55,  0.0,
    0.38,  -0.55,  0.0,
    -0.38, -0.27, 0.0,
    
    0.38,  -0.55,  0.0,
    -0.38, -0.27, 0.0,
    0.38,  -0.27, 0.0,


  // Blue I
    -0.44, 0.61,  0.1,
    0.44,  0.61,  0.1,
    -0.44, 0.21, 0.1,
  
    0.44,  0.61,  0.1,
    -0.44, 0.21, 0.1,
    0.44,  0.21, 0.1,
  
    -0.26, 0.21, 0.1,
    0.26,  0.21, 0.1,
    -0.26, -0.21, 0.1,
  
    0.26,  0.21, 0.1,
    -0.26,  -0.21,  0.1,
    0.26,  -0.21,  0.1,
    
    -0.44, -0.61,  0.1,
    0.44,  -0.61,  0.1,
    -0.44, -0.21, 0.1,
  
    0.44,  -0.61,  0.1,
    -0.44, -0.21, 0.1,
    0.44,  -0.21, 0.1
  
  ];

  var radius = 0.2;
  var z = 0.25;
  var dataTo = [];
  var currAngle = 0;
  var nextAngle = 0;

  // calculate and creata position of each vertex by loop
  for (i=0;i<12;i+=2){      // used for the orange one
    currAngle = i *  twicePi / 12;
    nextAngle = (i+1) * twicePi / 12;
    x=(radius * Math.cos(currAngle));
    y=(radius * Math.sin(currAngle));
    dataTo.push(x);
    dataTo.push(y);
    dataTo.push(z);
    x=(radius * Math.cos(nextAngle));
    y=(radius * Math.sin(nextAngle));
    dataTo.push(x);
    dataTo.push(y);
    dataTo.push(z);
    dataTo.push(0);
    dataTo.push(0);
    dataTo.push(0);
  }
  for (i=1;i<12;i+=2){      // used for the blue one 
    currAngle = i *  twicePi / 12;
    nextAngle = (i+1) * twicePi / 12;
    x=(radius * Math.cos(currAngle));
    y=(radius * Math.sin(currAngle));
    dataTo.push(x);
    dataTo.push(y);
    dataTo.push(z);
    x=(radius * Math.cos(nextAngle));
    y=(radius * Math.sin(nextAngle));
    dataTo.push(x);
    dataTo.push(y);
    dataTo.push(z);
    dataTo.push(0);
    dataTo.push(0);
    dataTo.push(0);
  }



    // The loop determine the current position of vertices
    // that is,   Mfrom * (1-t) + Mto * t = Mnow
    for (var i=0; i < 36 * 3; i += 3) {
      dataFrom[i] = dataFrom[i] * (1-shapeChangeFactor) + dataTo[i] * shapeChangeFactor;
      dataFrom[i+1] = dataFrom[i+1] * (1-shapeChangeFactor) + dataTo[i+1] * shapeChangeFactor;
    }
  
    // update vertices position
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dataFrom), gl.DYNAMIC_DRAW);
    

    // determine the current color
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer); 
    var colorFrom = [
      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,

      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,

      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,

      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,

      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,

      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,
      232/255, 74/255, 39/255, 1.0,



      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
  
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
  
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
  
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
  
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
  
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0,
      19/255, 41/255, 75/255, 1.0
    ];
  
    var red1 = 247/255;
    var green1 = 186/255;
    var blue1 = 129/255;
    var red2 = 162/255;
    var green2 = 196/255;
    var blue2 = 225/255;

    // assign the color for vertices in circle
    var colorTo = [

      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,

      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,

      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,

      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,

      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,

      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,
      red1, green1, blue1, 1.0,



      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,

      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,

      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,

      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,

      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,

      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,
      red2, green2, blue2, 1.0,
      
    ];


    // determine the current color of each vertex to achieve gradual change.
    for (var i=0; i < 36 * 4; i += 4) {
      colorFrom[i] = colorFrom[i] * (1-shapeChangeFactor) + colorTo[i] * shapeChangeFactor;
      colorFrom[i+1] = colorFrom[i+1] * (1-shapeChangeFactor) + colorTo[i+1] * shapeChangeFactor;
      colorFrom[i+2] = colorFrom[i+2] * (1-shapeChangeFactor) + colorTo[i+2] * shapeChangeFactor;
    }
  
    // update new color data 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorFrom), gl.DYNAMIC_DRAW);
  
}

// Those setup function are copied from examples in class.
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
}

/**
 * Populate vertex buffer with data
  @param {number} number of vertices to use around the circle boundary
 */
function loadVertices() {
//Generate the vertex positions    
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    
  // import the position information for "I"
  var triangleVertices = [
    // Orange I
    -0.38, 0.55,  0.0,
    0.38,  0.55,  0.0,
    -0.38, 0.27, 0.0,

    0.38,  0.55,  0.0,
    -0.38, 0.27, 0.0,
    0.38,  0.27, 0.0,

    -0.2, 0.27, 0.0,
    0.2,  0.27, 0.0,
    -0.2, -0.27, 0.0,

    0.2,  0.27, 0.0,
    -0.2,  -0.27,  0.0,
    0.2,  -0.27,  0.0,
    
    -0.38, -0.55,  0.0,
    0.38,  -0.55,  0.0,
    -0.38, -0.27, 0.0,
    
    0.38,  -0.55,  0.0,
    -0.38, -0.27, 0.0,
    0.38,  -0.27, 0.0,

    // Blue I
    -0.44, 0.61,  0.1,
    0.44,  0.61,  0.1,
    -0.44, 0.21, 0.1,

    0.44,  0.61,  0.1,
    -0.44, 0.21, 0.1,
    0.44,  0.21, 0.1,

    -0.26, 0.21, 0.1,
    0.26,  0.21, 0.1,
    -0.26, -0.21, 0.1,

    0.26,  0.21, 0.1,
    -0.26,  -0.21,  0.1,
    0.26,  -0.21,  0.1,
    
    -0.44, -0.61,  0.1,
    0.44,  -0.61,  0.1,
    -0.44, -0.21, 0.1,
    
    0.44,  -0.61,  0.1,
    -0.44, -0.21, 0.1,
    0.44,  -0.21, 0.1
];

  // put vertices into buffer and set the correspond value
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 36;
}



/**
 * Populate color buffer with data
  @param {number} number of vertices to use around the circle boundary
 */
function loadColors() {

  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);   

  // import color information for "I"
  var colors = [
    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,

    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,

    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,

    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,

    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,

    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,
    232/255, 74/255, 39/255, 1.0,

    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,

    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,

    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,

    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,

    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,

    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0,
    19/255, 41/255, 75/255, 1.0


];
  
  // setup color buffer and the required data
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 36;  
}

/**
 * Populate buffers with data
 */
function setupBuffers() {
  // setuo both vertices buffer and colors buffer
  loadVertices();
  loadColors();
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

  mat4.identity(mvMatrix);
  mat4.identity(pMatrix);
  mat4.ortho(pMatrix,-1,1,-1,1,1,-1);  
  
  var transformVec = vec3.create();

  // transform used to control the total (whole) rotation around Z-axis
  mat4.rotateZ(mvMatrix, mvMatrix, degToRad(centerAngle));  

  // transform used in first animation and translate "I" to right-top
  vec3.set(transformVec, transFactor, transFactor, 0);
  mat4.translate(mvMatrix, mvMatrix, transformVec);

  // transform used in second animation to translate "circle" along x and y
  vec3.set(transformVec, translateX, translateY, 0);
  mat4.translate(mvMatrix, mvMatrix, transformVec);
 
  // transform used to control the self-rotation around Z-axis
  mat4.rotateZ(mvMatrix, mvMatrix, degToRad(defAngleZ));

  // transform used in scaling
  vec3.set(transformVec, (1-transFactor), (1-transFactor), 0);
  mat4.scale(mvMatrix, mvMatrix, transformVec);

  // setup and draw 
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() { 

  if (isSecondAnimation != 1){  // Aninamation body for the first animation.

  // SCENE 1: self rotation and rotation about center
    if (scene % NUM_SCENE == 0) {
      if (stallTime < WAIT) {
          stallTime++;
      } else if (defAngleZSpeedFactor <= 10){
        defAngleZ = (defAngleZ +1.0*defAngleZSpeedFactor) % 360 ;
        defAngleZSpeedFactor = defAngleZSpeedFactor + 0.05;
      } else {
        scene++;
      }
  }

  // SCENE 2: translate to right-top and becomes smaller
    if (scene % NUM_SCENE == 1) {
      if (stallTime < WAIT) { // stalls time
          stallTime++;
          defAngleZ = (defAngleZ+1.0*defAngleZSpeedFactor) % 360;
      } else if (transFactor <= 0.4) {
        defAngleZ = (defAngleZ+1.0*defAngleZSpeedFactor) % 360;
        transFactor = transFactor + 0.005;
      } else  { // normalize (offset errors) and change scene
          transFactor = 0.4;
          stallTime = 0;
          scene++;
      }
  }
    
  // SCENE 3
  if (scene % NUM_SCENE == 2){
    if (centerAngleSpeedFactor <= 10){
        defAngleZ = (defAngleZ +1.0*defAngleZSpeedFactor) % 360 ;
        centerAngle= (centerAngle+1.0*centerAngleSpeedFactor) % 360 ;
        centerAngleSpeedFactor = centerAngleSpeedFactor + 0.1;
      } else {
        scene++;
      }
  }

  // SCENE 4
  if (scene % NUM_SCENE == 3) {
    if (centerAngleSpeedFactor > 0){
      defAngleZ= (defAngleZ+1.0*defAngleZSpeedFactor) % 360 ;
      centerAngle= (centerAngle+1.0*centerAngleSpeedFactor) % 360 ;
      centerAngleSpeedFactor -= 0.05;
      defAngleZSpeedFactor -= 0.05;
    }else{
      scene++;
    }
  }

  // SCENE 5
  if (scene % NUM_SCENE == 4){
    if (circleCount < 3){
      sinAngle = (sinAngle+3.0) % 360;
      if (sinAngle == 0){
        circleCount++;
      }
      separateIs(sinAngle);
    } else {
      scene ++;
      stallTime = 0;
      defAngleZSmooth = defAngleZ / WAIT;
      centerAngleSmooth = centerAngle / WAIT;
    }
  }

  // SCENE 6
  if (scene % NUM_SCENE == 5){
    if (stallTime < WAIT) { // stalls time
        stallTime++;
        defAngleZ -= defAngleZSmooth;
        centerAngle -= centerAngleSmooth;
    } else if(transFactor >= 0){
        transFactor -= 0.005;
    } else {
        // initialize all parameters used in first animation
        initializePara();

        scene++;
    }
  }

}else{  // Animation body for the second animation


  // SCENE 1
  if (scene % NUM_SCENE_SECOND == 0){
      if (stallTime < WAIT) { // stalls time
        stallTime++;
      }
      if (shapeChangeFactor < 1){   // change I's shape
        defAngleZ = (defAngleZ + 3) % 360;
        shapeChangeFactor += 0.005;
        shapeChange(shapeChangeFactor);
      }else{
        scene ++;
        stallTime = 0;
      }
  }

  // SCENE 2
  if (scene % NUM_SCENE_SECOND == 1) {
    if (defAngleZSpeedFactor <= 10){
      defAngleZ = (defAngleZ +1.0*defAngleZSpeedFactor) % 360 ;
      defAngleZSpeedFactor = defAngleZSpeedFactor + 0.05;
    } else {
      scene++;
    }
  }

  // SCENE 3
  if (scene % NUM_SCENE_SECOND == 2){
    frameCount ++ ;
    defAngleZ = (defAngleZ +1.0*defAngleZSpeedFactor) % 360;
    if (translateY > -1 + 0.25){
      translateY = - 0.5 * 9.8 * (frameCount/100) * (frameCount/100);
      translateX = -(frameCount/1000) * (6 * (frameCount/100) + 4);
    }else if (translateX > -1 + 0.2){
      translateX = -(frameCount/1000) * (6 * (frameCount/100) + 4);
    }else {
      scene++;
      frameCount = 0;
    }
  }

  // SCENE 4
  if (scene % NUM_SCENE_SECOND == 3){
    frameCount ++ ;
    defAngleZ = (defAngleZ +1.0*defAngleZSpeedFactor) % 360;
    if(translateY < 1 - 0.25){
      translateY += (6 * (frameCount/100))/1000;
    }else{
      scene++;
      frameCount = 0;
    }
  }

  // SCENE 5
  if(scene % NUM_SCENE_SECOND == 4){
    frameCount ++ ;
    defAngleZ = (defAngleZ +1.0*defAngleZSpeedFactor) % 360;
    if (translateY > 0){
      translateY = 1 - 0.25 - 0.5 * 9.8 * (frameCount/100) * (frameCount/100);
      translateX = -1 + 0.2 + (frameCount/1000) * 20;
    }else{
      scene ++;
      frameCount = 0;
      defAngleZSmooth = defAngleZ / WAIT;
    }
  }

  // SCENE 6
  if (scene % NUM_SCENE_SECOND == 5){
    if(shapeChangeFactor > 0){
      defAngleZ = (defAngleZ +1.0*defAngleZSpeedFactor) % 360;
      shapeChangeFactor -= 0.005;
      shapeChange(shapeChangeFactor);
    }else{
      scene ++;
    }
  }

  // SCENE 7
  if (scene % NUM_SCENE_SECOND == 6) {
    if (defAngleZSpeedFactor > 0){
      defAngleZ= (defAngleZ+1.0*defAngleZSpeedFactor) % 360 ;
      defAngleZSpeedFactor -= 0.05;
    }else{
      if(stallTime < 4 * WAIT){
        stallTime++;
      }else{
        initializePara();
        scene++;
      }
    }
  }

}
}

/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    draw();
    animate();
}


/**
 * function used as interface to triger the first animation
 */
function startFirstAnimation(){

  // initialize all parameters used in first animation
  initializePara();

  // initialize all scene data
  scene = 0;
  isSecondAnimation = 0;
  setupBuffers();
}

/**
 * function used as interface to triger the second animation
 */
function startSecondAnimation(){

  // initialize all parameters used in second animation
  initializePara();

  // initialize all scene data
  scene = 0;
  isSecondAnimation = 1;
  setupBuffers();
}


/** 
 * function used to initialize all parameters
 */
function initializePara(){

  // all parameters that used in animation 
  defAngleZ = 0;
  centerAngle = 0;
  defAngleZSpeedFactor = 1;
  centerAngleSpeedFactor = 1;
  transFactor = 0;
  stallTime = 0;
  shapeChangeFactor = 0;
  circleCount = 0;
  translateX = 0;
  translateY = 0;
  frameCount = 0;
}

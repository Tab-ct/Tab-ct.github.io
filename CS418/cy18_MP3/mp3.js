
/**
 * @file A simple WebGL example for viewing meshes read from OBJ files
 * @author Eric Shaffer <shaffer1@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global the GLSL shader program used for skybox */
var skyboxShaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The Reflection matrix */
var rMatrix = mat4.create();


/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

/** @global parameter used in transformations */
var transformVec = vec3.create();

/** @global texture for cubemap */
var texture;

/** @global buffers used in skybox shader */
var vBuffer;
var fBuffer;

/** @global quaternion used to in view rotation */
var quaternion = quat.create();


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,2.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [1,1,1];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1.0,1.0,1.0];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0.5,0.5,0.5];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0,1.0,1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];


//Model parameters
var eulerY=0;

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
  //Your code here
  console.log("Getting text file");
  return new Promise((resolve, reject) =>{
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
    console.log("Made promise");
  });
    
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");    
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
  shaderProgram.uniformCubeSampler = gl.getUniformLocation(shaderProgram, "uCubeSampler");

  shaderProgram.rMatrixUniform = gl.getUniformLocation(shaderProgram, "uRMatrix");
  shaderProgram.uniformDoRefract = gl.getUniformLocation(shaderProgram, "doRefract");
  shaderProgram.uniformDoSimpleShading = gl.getUniformLocation(shaderProgram, "doSimpleShading");
}


//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for skybox shaders
 */
function setupSkyboxShaders() {
  skyboxVertexShader = loadShaderFromDOM("shader-vs-skybox");
  skyboxFragmentShader = loadShaderFromDOM("shader-fs-skybox");
  
  skyboxShaderProgram = gl.createProgram();
  gl.attachShader(skyboxShaderProgram, skyboxVertexShader);
  gl.attachShader(skyboxShaderProgram, skyboxFragmentShader);
  gl.linkProgram(skyboxShaderProgram);

  if (!gl.getProgramParameter(skyboxShaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(skyboxShaderProgram);

  skyboxShaderProgram.vertexPositionAttribute = gl.getAttribLocation(skyboxShaderProgram, "aPosition");
  gl.enableVertexAttribArray(skyboxShaderProgram.vertexPositionAttribute);

  skyboxShaderProgram.uniformSkybox = gl.getUniformLocation(skyboxShaderProgram, "uSkybox");
  skyboxShaderProgram.uniformVMatrix = gl.getUniformLocation(skyboxShaderProgram, "uVMatrix");
  skyboxShaderProgram.uniformPMatrix = gl.getUniformLocation(skyboxShaderProgram, "uPMatrix");
  skyboxShaderProgram.uniformMMatrix = gl.getUniformLocation(skyboxShaderProgram, "uMMatrix");

  // init buffers
  setupSkyboxBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Setup the vertex and face buffers used in skybox shaders
 */
function setupSkyboxBuffers(){

  // buffer for vertice
  var vertexBuffer = [
    -1, -1, -1,
      1, -1, -1,
      1,  1, -1,
    -1,  1, -1,
    -1, -1,  1,
      1, -1,  1,
      1,  1,  1,
    -1,  1,  1,
  ];

  // buffer for indices
  var faceBuffer = [
      // forword
      0, 1, 2,
      2, 3, 0,

      // back
      5, 4, 7,
      7, 6, 5,

      // left
      4, 0, 3,
      3, 7, 4,
      
      // right
      1, 5, 6,
      6, 2, 1,

      // top
      3, 2, 6,
      6, 7, 3,

      // bottom
      1, 0, 4,
      4, 5, 1

  ];

  // setup vertex buffer
  vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexBuffer), gl.STATIC_DRAW);
  // vBuffer.itemSize = 3;
  // vBuffer.numItems = 8;

  // setup index buffer
  fBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,  new Uint16Array(faceBuffer), gl.STATIC_DRAW);
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 * -- the code below is token from webgl guide:
 * -- https://webglfundamentals.org/webgl/lessons/webgl-environment-maps.html
 */
function setupCubeMap(){

  // Create a texture
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
 
  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
      url: 'London/pos-x.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
      url: 'London/neg-x.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
      url: 'London/pos-y.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
      url: 'London/neg-y.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
      url: 'London/pos-z.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
      url: 'London/neg-z.png',
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const {target, url} = faceInfo;
  
    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
  
    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);
  
    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function() {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupMesh(filename) {
   //Your code here
   myMesh = new TriMesh();
   myPromise = asyncGetFile(filename);
   // We define what to do when the promise is resolved with the then() call,
   // and what to do when the promise is rejected with the catch() call
   myPromise.then((retrievedText) => {
     myMesh.loadFromOBJ(retrievedText);
     console.log("Yay! got the file");
   })
   .catch(
     // Log the rejection reason
     (reason) => {
       console.log("Handle rejected promise ("+reason+")here.");
     }
   )
   myMesh.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    //console.log("function draw()")

    gl.useProgram(shaderProgram);
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(75), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 500.0);

    // We want to look down -z, so create a lookat point in that direction    
    // vec3.add(viewPt, eyePt, viewDir);
    vec3.add(viewDir, -eyePt, viewPt);
    
    // Then generate the lookat matrix and initialize the view matrix to that view
    mat4.lookAt(vMatrix,eyePt,viewPt,up);
    
    //Draw Mesh
    //ADD an if statement to prevent early drawing of myMesh
        mvPushMatrix();
        mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));

        // get minXYZ and maxXYZ from mesh
        var minXYZ = vec3.create();
        var maxXYZ = vec3.create();
        myMesh.getAABB(minXYZ, maxXYZ);

        // scale teapot to 0.2
        vec3.set(transformVec, 0.2, 0.2, 0.2);
        mat4.scale(mvMatrix, mvMatrix, transformVec);

        // translate teapot to center
        var translateX = -(maxXYZ[0] + minXYZ[0])/2;
        var translateY = -(maxXYZ[1] + minXYZ[1])/2;
        var translateZ = -(maxXYZ[2] + minXYZ[2])/2;
        vec3.set(transformVec, translateX, translateY, translateZ);
        mat4.translate(mvMatrix, mvMatrix, transformVec);

        // compile move and view matrixes
        mat4.multiply(mvMatrix,vMatrix,mvMatrix);
        
        // set uniforms
        setMatrixUniforms();
        setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
        gl.uniformMatrix4fv(shaderProgram.rMatrixUniform, false, rMatrix);

        // detemine the chosen mode
        if(document.getElementById("Shading").checked){
          gl.uniform1f(shaderProgram.uniformDoSimpleShading, 1.0);
        }else{
          gl.uniform1f(shaderProgram.uniformDoSimpleShading, 0.0);
          if(document.getElementById("refraction").checked){
            gl.uniform1f(shaderProgram.uniformDoRefract, 1.0);
          }else{
            gl.uniform1f(shaderProgram.uniformDoRefract, 0.0);
          }
        }

        // Tell the shader to use texture unit 0 for u_texture
        gl.uniform1i(shaderProgram.uniformCubeSampler, 0);
    
        if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
        {
            setMaterialUniforms(shininess,kAmbient,
                                kTerrainDiffuse,kSpecular); 
            myMesh.drawTriangles();
        }
    
        if(document.getElementById("wirepoly").checked)
        {   
            setMaterialUniforms(shininess,kAmbient,
                                kEdgeBlack,kSpecular);
            myMesh.drawEdges();
        }   

        if(document.getElementById("wireframe").checked)
        {
            setMaterialUniforms(shininess,kAmbient,
                                kEdgeWhite,kSpecular);
            myMesh.drawEdges();
        }   
        
        mvPopMatrix();

        // draw skybox
        drawSkybox();
    
}

//----------------------------------------------------------------------------------
/**
 * Draw function for skybox
 */
function drawSkybox(){

  // set skybox size
  var mMatrix = mat4.create();
  mat4.identity(mMatrix);
  vec3.set(transformVec, 5.0, 5.0, 5.0);
  mat4.scale(mMatrix, mMatrix, transformVec);

  // set up shaders for skybox
  gl.useProgram(skyboxShaderProgram);

  // setup corresponding matrixes into shader
  gl.uniformMatrix4fv(skyboxShaderProgram.uniformVMatrix, false, vMatrix);
  gl.uniformMatrix4fv(skyboxShaderProgram.uniformPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(skyboxShaderProgram.uniformMMatrix, false, mMatrix);
  gl.uniform1i(skyboxShaderProgram.uniformSkybox, 0);

  // setup buffers into shaders
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.vertexAttribPointer(skyboxShaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fBuffer);

  // draw by using index
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};

/**
 * keyboard handler with key down
 */
function handleKeyDown(event) {
        //console.log("Key down ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = true;
          if (currentlyPressedKeys["a"]) {
            // key A
            eulerY-= 1;
        } else if (currentlyPressedKeys["d"]) {
            // key D
            eulerY+= 1;
        } 
    
        // not been used 
        // if (currentlyPressedKeys["ArrowUp"]){
        //     // Up cursor key
        //     event.preventDefault();
        //     eyePt[2]+= 0.01;
        // } else if (currentlyPressedKeys["ArrowDown"]){
        //     event.preventDefault();
        //     // Down cursor key
        //     eyePt[2]-= 0.01;
        // } 

        // rotation to left around the teapot
        if (currentlyPressedKeys["ArrowLeft"]){
          event.preventDefault();
          quat.setAxisAngle(quaternion, up, degToRad(-2.0));
          vec3.transformQuat(eyePt, eyePt, quaternion);
          mat4.rotateY(rMatrix, rMatrix, degToRad(-2.0));
        }

        // rotation to right around the teapot
        if (currentlyPressedKeys["ArrowRight"]){
          event.preventDefault();
          quat.setAxisAngle(quaternion, up, degToRad(2.0));
          vec3.transformQuat(eyePt, eyePt, quaternion);
          mat4.rotateY(rMatrix, rMatrix, degToRad(2.0));
        } 


    
}

/**
 * keyboard handler with key up
 */
function handleKeyUp(event) {
        //console.log("Key up ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = false;
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupSkyboxShaders();
  // setupCubeMap();
  setupShaders();
  setupCubeMap();
  setupMesh("teapot_0.obj");
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}


//----------------------------------------------------------------------------------
/**
  * Update any model transformations
  */
function animate() {
   //console.log(eulerX, " ", eulerY, " ", eulerZ); 
  //  document.getElementById("eY").value=eulerY;
  //  document.getElementById("eZ").value=eyePt[2];   
}


//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
}


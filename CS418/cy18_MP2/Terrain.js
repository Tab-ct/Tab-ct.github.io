/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

/** Class implementing 3D terrain. */
class Terrain{   
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.generateTerrain();
        console.log("Terrain: Generated Terrain Model");
        
        this.generateLines();
        console.log("Terrain: Generated lines");
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }
    
    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        //Your code here

        /* index of current vertex */
        var vid = 3 * (i * (this.div + 1) + j);

        this.vBuffer[vid] = v[0];
        this.vBuffer[vid + 1] = v[1];
        this.vBuffer[vid + 2] = v[2];

    }
    
    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        //Your code here

        /* index of current vertex */
        var vid = 3 * (i * (this.div + 1) + j);

        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid + 1];
        v[2] = this.vBuffer[vid + 2];
    }
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems / 3, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        
        console.log("triangulatedPlane: loadBuffers");
    }
    
    /**
    * Render the triangles 
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }
    
    /**
    * Render the triangle edges wireframe style 
    */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);   
    }

/**
 * Fill the vertex and buffer arrays 
 */    
generateTriangles()
{
    //Your code here
    var deltaX = (this.maxX - this.minX) / this.div;
    var deltaY = (this.maxY - this.minY) / this.div;

    /* set up both vBuffer and nBuffer */
    for(var i=0; i <= this.div; i++){
        for(var j=0; j <= this.div; j++){  

            /* set vertices */
            this.vBuffer.push(this.minX + deltaX * j );
            this.vBuffer.push(this.minY + deltaY * i );
            this.vBuffer.push(0);

            /* set normal */
            this.nBuffer.push(0);
            this.nBuffer.push(0);
            this.nBuffer.push(0);

        }
    }


    /* set up fBuffer */
    for(var i=0; i < this.div; i++){
        for(var j=0; j < this.div; j++){  

            /* index of current vertex */
            var vid = i * (this.div + 1) + j;
            
            this.fBuffer.push(vid);
            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+this.div+1);
     
            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+this.div+2);
            this.fBuffer.push(vid+this.div+1);     

        }
    }

    // set # of vertices and faces
    this.numVertices = this.vBuffer.length/3;
    this.numFaces = this.fBuffer.length/3;

}


/**
 * Generate Terrain model by adjusting vertices and normal vectors
 */  
generateTerrain(){

    // set value for each operation
    var delta = 0.003;
    for(var count  = 0; count < 1000; count++){

        // generate random point P
        var p_X = Math.floor(Math.random() * (this.div + 1) );
        var p_Y = Math.floor(Math.random() * (this.div + 1) );

        // generate random normal vector n
        var n_angle = Math.random() * 2 * Math.PI ;
        var n = vec2.create();
        vec2.set(n, Math.cos(n_angle), Math.sin(n_angle) );

        // traverse each vertex and adjust its z-coordinate
        for(var i = 0; i < this.div + 1; i++){
            for(var j = 0; j <this.div + 1; j++){

                // get point b
                var b = vec3.create();
                this.getVertex(b,i,j);

                // generate vector p -> b
                var pb = vec2.create();
                vec2.set(pb, i - p_X, j - p_Y);

                // increase or decrese z-coordinate by delta
                if(vec2.dot(pb,n) > 0){
                    b[2] += delta;
                }
                if(vec2.dot(pb,n) < 0){
                    b[2] -= delta;
                }

                // reset z-coordinate
                this.setVertex(b,i,j);
            }
        }

    }

    for(var i=0; i < this.numFaces; i++){

        // get three vertices from the current trangle 
        var v1_idx = this.fBuffer[3 * i];
        var v2_idx = this.fBuffer[3 * i + 1];
        var v3_idx = this.fBuffer[3 * i + 2];
        // console.log("v1_idx",v1_idx);
        // console.log("v2_idx",v2_idx);
        // console.log("v3_idx",v3_idx);
        var v1 = vec3.create();
        var v2 = vec3.create();
        var v3 = vec3.create();
        vec3.set(v1, this.vBuffer[v1_idx * 3], this.vBuffer[v1_idx * 3 + 1], this.vBuffer[v1_idx * 3 + 2]);
        vec3.set(v2, this.vBuffer[v2_idx * 3], this.vBuffer[v2_idx * 3 + 1], this.vBuffer[v2_idx * 3 + 2]);
        vec3.set(v3, this.vBuffer[v3_idx * 3], this.vBuffer[v3_idx * 3 + 1], this.vBuffer[v3_idx * 3 + 2]);

        // determine normal vectors for each vertex
        var v12 = vec3.create();
        var v13 = vec3.create();
        vec3.subtract(v12, v2, v1);
        vec3.subtract(v13, v3, v1);
        var n1 = vec3.create();
        vec3.cross(n1, v12, v13);

        var v21 = vec3.create();
        var v23 = vec3.create();
        vec3.subtract(v21, v1, v2);
        vec3.subtract(v23, v3, v2);
        var n2 = vec3.create();
        vec3.cross(n2, v23, v21);

        var v31 = vec3.create();
        var v32 = vec3.create();
        vec3.subtract(v31, v1, v3);
        vec3.subtract(v32, v2, v3);
        var n3 = vec3.create();
        vec3.cross(n3, v31, v32);

        // set normal vectors in coresponding position
        // vec3.normalize(n1, n1);
        // vec3.normalize(n2, n2);
        // vec3.normalize(n3, n3);

        // console.log("n1",n1);
        // console.log("n2",n2);
        // console.log("n3",n3);

        this.nBuffer[v1_idx * 3]     += n1[0];
        this.nBuffer[v1_idx * 3 + 1] += n1[1];
        this.nBuffer[v1_idx * 3 + 2] += n1[2];

        this.nBuffer[v2_idx * 3]     += n2[0];
        this.nBuffer[v2_idx * 3 + 1] += n2[1];
        this.nBuffer[v2_idx * 3 + 2] += n2[2];

        this.nBuffer[v3_idx * 3]     += n3[0];
        this.nBuffer[v3_idx * 3 + 1] += n3[1];
        this.nBuffer[v3_idx * 3 + 2] += n3[2];



        // this.nBuffer[v1_idx * 3]     += n1[0] + this.nBuffer[v1_idx * 3];
        // this.nBuffer[v1_idx * 3 + 1] += n1[1] + this.nBuffer[v1_idx * 3 + 1];
        // this.nBuffer[v1_idx * 3 + 2] += n1[2] + this.nBuffer[v1_idx * 3 + 2];

        // this.nBuffer[v2_idx * 3]     += n2[0] + this.nBuffer[v2_idx * 3];
        // this.nBuffer[v2_idx * 3 + 1] += n2[1] + this.nBuffer[v2_idx * 3 + 1];
        // this.nBuffer[v2_idx * 3 + 2] += n2[2] + this.nBuffer[v2_idx * 3 + 2];

        // this.nBuffer[v3_idx * 3]     += n3[0] + this.nBuffer[v3_idx * 3];
        // this.nBuffer[v3_idx * 3 + 1] += n3[1] + this.nBuffer[v3_idx * 3 + 1];
        // this.nBuffer[v3_idx * 3 + 2] += n3[2] + this.nBuffer[v3_idx * 3 + 2];
    }

    // normalize all normal vectors
    for(var i = 0; i < this.numVertices; i++){
        var n = vec3.create();
        vec3.set(n, this.nBuffer[i * 3], this.nBuffer[i * 3 + 1], this.nBuffer[i * 3 + 2]);
        vec3.normalize(n, n);
        this.nBuffer[i * 3]     = n[0];
        this.nBuffer[i * 3 + 1] = n[1];
        this.nBuffer[i * 3 + 2] = n[2];
    }

    // this.printBuffers();
}

/**
 * Print vertices and triangles to console for debugging
 */
printBuffers()
    {
        
    // for(var i=0;i<this.numVertices;i++)
    //       {
    //        console.log("v ", this.vBuffer[i*3], " ", 
    //                          this.vBuffer[i*3 + 1], " ",
    //                          this.vBuffer[i*3 + 2], " ");
                       
    //       }
    
    //   for(var i=0;i<this.numFaces;i++)
    //       {
    //        console.log("f ", this.fBuffer[i*3], " ", 
    //                          this.fBuffer[i*3 + 1], " ",
    //                          this.fBuffer[i*3 + 2], " ");
                       
    //       }

        for(var i=0;i<this.numVertices;i++)
        {
        console.log("n ", this.nBuffer[i*3], " ", 
                        this.nBuffer[i*3 + 1], " ",
                        this.nBuffer[i*3 + 2], " ");
                    
        }
        
    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);
        
        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);
        
        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }
    
}
    
}

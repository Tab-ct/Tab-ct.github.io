/**
 * @fileoverview Particle - A simple sphere model of particle using WebGL
 * @author Chengting Yu
 */

/** Class implementing particle. */
class Particle{   
/**
 * Initialize members of a Particle object
 */
    constructor(id){

        // record particle ID in entity
        this.id = id;

        // parameter used to record info of particle
        this.position = vec3.create();
        this.velocity = vec3.create();
        this.acceleration = vec3.create();
        this.drag = 0.9;
        this.radius = Math.random() * 2 + 2; // range in (2,4)

        // initial status info
        var maxVelocity = Math.floor(Math.random() * 50);
        vec3.random(this.position, 30);
        vec3.random(this.velocity, maxVelocity);
        vec3.set(this.acceleration, 0, -9.8, 0);
        // vec3.set(this.velocity, 0, 0, 0);
        // vec3.set(this.acceleration, 0, 0, 0);
        console.log("sphere model created for particle", this.id);

        // generate material color
        // var colorVal = document.getElementById("mat-color").value
        // console.log(colorVal);
        // this.R = hexToR(colorVal)/255.0;
        // this.G = hexToG(colorVal)/255.0;
        // this.B = hexToB(colorVal)/255.0;
        this.color = vec3.create();
        vec3.random(this.color, 1);
        this.R = Math.random()*0.6 + 0.4;
        this.G = Math.random()*0.6 + 0.4;
        this.B = Math.random()*0.6 + 0.4;

        // record count of grounding as terminate condition
        this.fallCount = 0;

        
        
        // Get extension for 4 byte integer indices for drwElements
        // var ext = gl.getExtension('OES_element_index_uint');
        // if (ext ==null){
        //     alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        // }
    }

//-----------------------------------------------------------
//-----------------------------------------------------------
/**
 * Update the state for particle
 */
    updateStatus(){

        var timeInterval = 0.1;

        // update both postion and velecity info
        var posChange = vec3.create();
        var vChangeByDrag = vec3.create();
        var vChangeByA = vec3.create();

        vec3.scale(posChange, this.velocity, timeInterval);
        vec3.scale(vChangeByDrag, this.velocity, Math.pow(this.drag, timeInterval));
        vec3.scale(vChangeByA, this.acceleration, timeInterval);

        vec3.add(this.position, this.position, posChange);
        vec3.add(this.velocity, vChangeByDrag, vChangeByA);

        // Collision Detection 
        var boundary = 40;
        var damp = 0.75;
        for(var i=0; i<3; i++){
            if(this.position[i] + this.radius > boundary){
                var overflow = this.position[i] + this.radius - boundary;
                this.position[i] = boundary - overflow - this.radius;
                this.velocity[i] = - this.velocity[i] * damp;
                // if( Math.abs(this.velocity[i]) < 0.1){
                //     this.velocity[i] = 0;
                // }
            }
            if(this.position[i] - this.radius < -boundary){
                var overflow = - boundary - this.position[i] + this.radius;
                this.position[i] = - boundary + overflow + this.radius;
                this.velocity[i] = -this.velocity[i] * damp;
                // if( Math.abs(this.velocity[i]) < 0.1){
                //     this.velocity[i] = 0;
                // }
                if(i == 1){
                    if( Math.abs(this.velocity[i]) < 9.8){
                        this.fallCount += 1;
                        if(this.fallCount == 3){
                            this.velocity[i] = 0;
                            vec3.set(this.acceleration, 0, 0, 0);
                        }
                    }
                    // this.fallCount += 1;
                    // if(this.fallCount == 10){
                    //     this.velocity[i] = 0;
                    //     vec3.set(this.acceleration, 0, 0, 0);
                    // }
                }
            }
            
        }

        // console.log("status updated for particle", this.id);
        // console.log("position:", this.position);
        // console.log("velocity:", this.velocity);
        // console.log("acceleration:", this.acceleration);
    }
    
}

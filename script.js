let GL=null;
var main=function() {
  var CANVAS=document.getElementById("ST");
  CANVAS.width=window.innerWidth;
  CANVAS.height=window.innerHeight;

  /*========================= CAPTURE MOUSE EVENTS ========================= */
  var AMORTIZATION=0.025;
  var speed=0.04;
  var dX=0, dY=0;
  var _int=0;
  var R=0;
  var intervalRad=0.56;
  var at=0,ap=0,ar=0;
  var tx=0,ty=0,tz=0;
  var cx=0,cy=0,cz=0;

 var mouseMove=function(e) {
              if(e.clientX>CANVAS.width*0.7){ dX= 1; _int=-intervalRad;}
         else if(e.clientX<CANVAS.width*0.3){ dX=-1; _int= intervalRad;}            
         else if(e.clientY>CANVAS.height*0.7){  dY=1;  }
         else if(e.clientY<CANVAS.height*0.3){  dY=-1; }
         else{ dX=0;dY=0;_int=0;}    
    e.preventDefault();
     };
  var KP= function(e) {

          var key = e.keyCode;
           switch(key){
            case 38:  //up
                   tz= speed*Math.cos(LIBS.degToRad(R));  tx= speed*Math.sin(-LIBS.degToRad(R));  break;
            case 40:  //down
                   tz=-speed*Math.cos(LIBS.degToRad(R));  tx=-speed*Math.sin(-LIBS.degToRad(R));  break;
            case 37: //left
                   tx= speed*Math.cos(LIBS.degToRad(R));  tz=-speed*Math.sin(-LIBS.degToRad(R));  break;
            case 39: //right
                   tx=-speed*Math.cos(LIBS.degToRad(R));  tz= speed*Math.sin(-LIBS.degToRad(R));  break;
            default: break;

           }   
  };
   var KU= function(e) {
      tx=0;ty=0;tz=0; 
     //if(e.keyCode==75){alert("ap: "+ap+",at: "+at);}           
  };

  window.addEventListener("keypress", KP,true);
  window.addEventListener("keyup", KU,true); 
  CANVAS.addEventListener("mousemove", mouseMove, false);
  /*========================= GET WEBGL CONTEXT ========================= */
  
  try {
   
    GL= CANVAS.getContext("webgl", {antialias: true}) || CANVAS.getContext("experimental-webgl", {antialias: true});
    var EXT = GL.getExtension("OES_element_index_uint") ||
      GL.getExtension("MOZ_OES_element_index_uint") ||
        GL.getExtension("WEBKIT_OES_element_index_uint");
  } catch (e) {
    alert("You are not webgl compatible :(") ;
    return false;
  }

  /*========================= SHADERS ========================= */

  var shader_vertex_source="\n\
attribute vec3 position;\n\
attribute vec2 uv;\n\
attribute vec3 normal;\n\
uniform mat4 Pmatrix;\n\
uniform mat4 Vmatrix;\n\
uniform mat4 Mmatrix;\n\
varying vec2 vUV;\n\
varying vec3 vNormal;\n\
varying vec3 vView;\n\
\n\
void main(void) {\n\
gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);\n\
vNormal=vec3(Mmatrix*vec4(normal, 0.));\n\
vView=vec3(Vmatrix*Mmatrix*vec4(position, 1.));\n\
vUV=uv;\n\
}";

  var shader_fragment_source="\n\
precision mediump float;\n\
uniform sampler2D sampler;\n\
varying vec2 vUV;\n\
varying vec3 vNormal;\n\
varying vec3 vView;\n\
vec3 normal;\n\
\n\
\n\
struct PointLight{\n\
vec3 position;\n\
float constant;\n\
float linear;\n\
float quadratic;\n\
\n\
vec3 ambient;\n\
vec3 diffuse;\n\
vec3 specular;\n\
};\n\
#define NR_POINT_LIGHTS 4\n\
uniform PointLight pointLight1;\n\
uniform PointLight pointLight2;\n\
uniform PointLight pointLight3;\n\
\n\
\n\
\n\
const vec3 mat_ambient_color=vec3(0.5,0.5,0.5);\n\
const vec3 mat_diffuse_color=vec3(0.5,0.5,0.5);\n\
const vec3 mat_specular_color=vec3(0.7,0.7,0.7);\n\
const float mat_shininess=0.0078125;\n\
\n\
\n\
\n\
vec3 CalcPointLight(PointLight light, vec3 normal, vec3 position, vec3 viewDir){\n\
vec3 lightDir = normalize(light.position - position);\n\
// Diffuse shading\n\
float diff = max(dot(normal, lightDir), 0.0);\n\
// Specular shading\n\
vec3 reflectDir = reflect(-lightDir, normal);\n\
float spec = pow(max(dot(viewDir, reflectDir), 0.0), mat_shininess);\n\
// Attenuation\n\
float distance    = length(light.position - position);\n\
float attenuation = 0.5 / (light.constant + light.linear*distance + light.quadratic * (distance * distance));\n\
// Combine results\n\
vec3 ambient  = light.ambient * vec3(texture2D( sampler, vUV));\n\
vec3 diffuse  = light.diffuse * diff * vec3(texture2D( sampler, vUV));\n\
vec3 specular = light.specular * spec * vec3(texture2D( sampler, vUV));\n\
ambient  *= attenuation;\n\
diffuse  *= attenuation;\n\
specular *= attenuation;\n\
return (ambient + diffuse + specular);\n\
}\n\
\n\
vec3 position;\n\
vec3 Tshiness=vec3(0.015,0.015,0.015);\n\
\n\
\n\
void main(void) {\n\
vec3 color=vec3(texture2D(sampler, vUV));\n\
vec3 V=normalize(vView);\n\
vec3 R=reflect(pointLight1.position,normal);\n\
     R=reflect(pointLight2.position,normal);\n\
   //R=reflect(pointLight3.position,normal);\n\
\n\
\n\
vec3  I = CalcPointLight(pointLight1,normal, position, vView);\n\
      I+= CalcPointLight(pointLight2,normal, position, vView);\n\
    //I+= CalcPointLight(pointLight3,normal, position, vView);\n\
gl_FragColor = vec4(I*Tshiness, 1.);\n\
if(gl_FragColor.a < 0.4)discard;\n\
}";

  var get_shader=function(source, type, typeString) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      alert("ERROR IN "+typeString+ " SHADER : " + GL.getShaderInfoLog(shader));
      return false;
    }
    return shader;
  };

  var shader_vertex=get_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
  var shader_fragment=get_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

  var SHADER_PROGRAM=GL.createProgram();
  GL.attachShader(SHADER_PROGRAM, shader_vertex);
  GL.attachShader(SHADER_PROGRAM, shader_fragment);

  GL.linkProgram(SHADER_PROGRAM);

  var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
  var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
  var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
  var _sampler = GL.getUniformLocation(SHADER_PROGRAM, "sampler");

  var _uv       = GL.getAttribLocation(SHADER_PROGRAM, "uv");
  var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
  var _normal   = GL.getAttribLocation(SHADER_PROGRAM, "normal");
 
  GL.enableVertexAttribArray(_uv);
  GL.enableVertexAttribArray(_position);
  GL.enableVertexAttribArray(_normal);
    GL.useProgram(SHADER_PROGRAM);
    GL.uniform1i(_sampler, 0);

 /*========================= TEXTURES ========================= */
  var get_texture=function(image_URL){

    var image=new Image();
    image.crossOrigin="anonymous"
    image.src=image_URL;
    image.webglTexture=false;

    image.onload=function(e) {
      var texture=GL.createTexture();
      GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
      GL.bindTexture(GL.TEXTURE_2D, texture);
      GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST_MIPMAP_LINEAR);
      GL.generateMipmap(GL.TEXTURE_2D);
      GL.bindTexture(GL.TEXTURE_2D, null);
      image.webglTexture=texture;
    };
    return image;
  };
  var cube_texture=get_texture("ressources/stage_FF.png");
  var light_texture=get_texture("ressources/white.png");

 /*========================= MATRIX ========================= */
  var THETA=0,  PHI=0;
  var PROJMATRIX=LIBS.get_projection(60, CANVAS.width/CANVAS.height, 0.01, 200);
  var MOVEMATRIX=LIBS.get_I4();
  var VIEWMATRIX=LIBS.get_I4();
    LIBS.rotateY(MOVEMATRIX,-Math.PI*1.8/4);
    LIBS.translate(MOVEMATRIX,10.5,-4,-8);


  
/*========================= THE LIGHTS========================= */

var bulb_vertex=[-1,-1,-1,0,0,1,-1,-1,1,0,1,1,-1,1,1,-1,1,-1,0,1,-1,-1,1,0,0,1,-1,1,1,0,1,1,1,1,1,-1,1,1,0,1,-1,-1,-1,0,0,-1,1,-1,1,0,-1,1,1,1,1,-1,-1,1,0,1,1,-1,-1,0,0,1,1,-1,1,0,1,1,1,1,1,1,-1,1,0,1,-1,-1,-1,0,0,-1,-1, 1,1,0,1,-1,1,1,1,1,-1,-1,0,1,-1, 1,-1,0,0,-1,1,1,1,0,1,1,1,1,1,1, 1,-1,0,1]; 
var bulb_faces = [0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23];
var bulbSize=0.045;
 LIBS.set_scale(bulb_vertex,bulbSize); 
 var BULB_VERTEX= GL.createBuffer (); 
                   GL.bindBuffer(GL.ARRAY_BUFFER, BULB_VERTEX);
                   GL.bufferData(GL.ARRAY_BUFFER,new Float32Array(bulb_vertex),GL.STATIC_DRAW);
  
 var BULB_FACES= GL.createBuffer (); 
                 GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, BULB_FACES);
                 GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(bulb_faces),GL.STATIC_DRAW);
 
 var BULB_NPOINTS=bulb_faces.length;

  var light1 = {PX: 0, PY: 0, PZ: 0, CR:0.0, CG:0.0 ,CB:1.0};
  var light2 = {PX: 0, PY: 0, PZ: 0, CR:0.0, CG:1.0 ,CB:0.0};
  var light3 = {PX: 0, PY: 0, PZ: 0, CR:0.0, CG:0.0 ,CB:0.0};

    
    var PLight1=LIBS.get_I4();LIBS.set_scale(PLight1,bulbSize); LIBS.Set_Pos(PLight1,0.13722057098841137, 0.1543999999999995,-0.387300892676392);
    var PLight2=LIBS.get_I4();LIBS.set_scale(PLight2,bulbSize); LIBS.Set_Pos(PLight2,-0.17920000000000005, 0.1391999999999996, -0.33599999999999974);
    var PLight3=LIBS.get_I4();LIBS.set_scale(PLight3,bulbSize); LIBS.Set_Pos(PLight3,light3.PX,light3.PY,light3.PZ);


  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight1.position"),[light1.PX,light1.PY,light1.PZ]);
  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight1.ambient"), [light1.CR,light1.CG,light1.CB]);
  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight1.diffuse"), [light1.CR,light1.CG,light1.CB]);
  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight1.specular"),[light1.CR,light1.CG,light1.CB]);
  GL.uniform1fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight1.constant"), [0.01]);
  GL.uniform1fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight1.linear"),   [0.09]);
  GL.uniform1fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight1.quadratic"),[0.032]);

  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight2.position"),[ 0.00017920000000000005, -0.00013919999999999962, 0.00033599999999999976]);
  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight2.ambient"), [-0.00013722057098841138,-0.00015439999999999952, 0.000387300892676392] );
  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight2.diffuse"), [light2.CR,light2.CG,light2.CB]);
  GL.uniform3fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight2.specular"),[light2.CR,light2.CG,light2.CB]);
  GL.uniform1fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight2.constant"), [0.01]);
  GL.uniform1fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight2.linear"),   [0.09]);
  GL.uniform1fv(GL.getUniformLocation(SHADER_PROGRAM, "pointLight2.quadratic"),[0.032]);

  /*========================= LIMITS ========================= */

  var obj=[
  {x0: 2.3935528717451726 ,x1: 8.07235744489626  ,y0: 0.13785260122760135 ,y1: 1.2311177655795584},// front wall left
  {x0: -6.700389041057436 ,x1:-1.04              ,y0: 0.13785260122760135 ,y1: 1.2311177655795584},// front wall right
  {x0: 7.703577838857385  ,x1: 8.614151155645398, y0: 0.13785260122760135 ,y1: 15.316302829928587},// left wall
  {x0:-6.700389041057436  ,x1:-6.326856886259385 ,y0: 0.13785260122760135 ,y1: 15.316302829928587},// rigt wall
  {x0: -6.700389041057436 ,x1: 8.005436621824176 ,y0: 12.658507995853501  ,y1: 15.316302829928587},// back wall and instruments
  
  {x0:  4.347809649159619 ,x1: 8.07235744489626,  y0: 0.13785260122760135 ,y1: 3.183280929579806 },// round table
  {x0:  -6.700389041057436,x1:-1.6026681236505975,y0: 0.13785260122760135 ,y1: 2.265825906399787 },// square front  table 
  {x0: 6.840023231687122  ,x1: 8.07235744489626  ,y0: 4.320034125346316   ,y1: 9.302494977778155 },// chairs

  {x0: -1.2773219420699413,x1: 1.0400000000000003,y0: 6.0400000000000045  ,y1: 8.400686786853692 },// talia
  {x0: -11.064663218361401,x1:-9.519999999999973 ,y0: 6.640000000000005   ,y1: 9.132867676577224 } // bruce wayne atlas
  ];
    function obj_lim(ox,oy){
      var bool=true;

      for(var l=0; l<obj.length; l++){
          if(ox>obj[l].x0 && ox<obj[l].x1){
             if(oy>obj[l].y0 && oy<obj[l].y1){
                bool=false;
                return false;
             }      
          }      
      }
      return bool;
    }
  /*========================= DRAWING ========================= */
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.clearColor(0.0, 0.0, 0.0, 0.0);
  GL.clearDepth(1.0);


  var rot_int=0.01, T=0.001,TT=0.08;
  
 
  var animate=function() {

      THETA=dX*rot_int;
      PHI=dY*rot_int;
      R-=_int;  

    if(obj_lim(cx+tx,cz+tz)){
      cx+=tx;  cz+=tz;
      LIBS.translate(MOVEMATRIX,tx,ty,tz);
      LIBS.translate(PLight1,tx*TT,ty*TT,tz*TT);
      LIBS.translate(PLight2,tx*TT,ty*TT,tz*TT);
    }   
     if(at-dY>-75&& at<75+dY){
        at-=dY*0.5;
        ap+=dX*0.5;
      RHO=-THETA*Math.sin(LIBS.degToRad(at)); 
      LIBS.rotateY(VIEWMATRIX, THETA);
      LIBS.rotateX(VIEWMATRIX, PHI  );
      LIBS.rotateZ(VIEWMATRIX, RHO  ); 
     } 
       
    GL.viewport(0.0, 0.0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
    
     GL.uniformMatrix4fv(_Mmatrix, false, PLight1);
    if (light_texture.webglTexture) {GL.activeTexture(GL.TEXTURE0);GL.bindTexture(GL.TEXTURE_2D, light_texture.webglTexture);} 
    GL.bindBuffer(GL.ARRAY_BUFFER, BULB_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false,4*(3+2),0) ;
    GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false,4*(3+2),0) ;
    GL.vertexAttribPointer(_uv, 2, GL.FLOAT, false,4*(3+2),(3)*4) ;
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, BULB_FACES);
    GL.drawElements(GL.TRIANGLES, BULB_NPOINTS, GL.UNSIGNED_SHORT, 0)
  
    GL.uniformMatrix4fv(_Mmatrix, false, PLight2);
    if (light_texture.webglTexture) {GL.activeTexture(GL.TEXTURE0);GL.bindTexture(GL.TEXTURE_2D, light_texture.webglTexture);} 
    GL.bindBuffer(GL.ARRAY_BUFFER, BULB_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false,4*(3+2),0) ;
    GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false,4*(3+2),0) ;
    GL.vertexAttribPointer(_uv, 2, GL.FLOAT, false,4*(3+2),(3)*4) ;
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, BULB_FACES);
    GL.drawElements(GL.TRIANGLES, BULB_NPOINTS, GL.UNSIGNED_SHORT, 0); 

    GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);
    if (cube_texture.webglTexture) {GL.activeTexture(GL.TEXTURE0);GL.bindTexture(GL.TEXTURE_2D, cube_texture.webglTexture);}
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false,4*(3+3+2),0) ;
    GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false,4*(3+3+2),3*4) ;
    GL.vertexAttribPointer(_uv, 2, GL.FLOAT, false,4*(3+3+2),(3+3)*4) ;

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.drawElements(GL.TRIANGLES, CUBE_NPOINTS, GL.UNSIGNED_INT, 0);

    GL.flush();
    window.requestAnimationFrame(animate);
  };

  var CUBE_VERTEX=false, CUBE_FACES=false, CUBE_NPOINTS=0;
 
var STAGE = function(){
  //vertices
   CUBE_VERTEX= GL.createBuffer ();
  GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
  GL.bufferData(GL.ARRAY_BUFFER,
                new Float32Array(stage.vertices),
               GL.STATIC_DRAW);
  //faces
   CUBE_FACES=GL.createBuffer ();
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
  GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
                new Uint32Array(stage.indices),
    GL.STATIC_DRAW);
   CUBE_NPOINTS=stage.indices.length;
  animate();
}

STAGE();

};

/*========================= THE STAGE ========================= */


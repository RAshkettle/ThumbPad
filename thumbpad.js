//Idea Glommed from Seb Lee-Delisle...give credit where it's due
//most of this was simply reverse-engineered from his example, as I wanted to see how to do it myself
//I did however, use quite a bit directly from his event handler logic.  His was a lot better than my 
//implementation.

ig.module(
    'plugins.thumbpad'
)
.requires(
   
)
.defines(function(){

//Main interfece to the thumbpad control
 Control = function() {
    //force the user to use new, if not, do it for them
    if(false === (this instanceof Control))
        return new Control();
    
    var _thumbPad = new Joypad();
    var _screenWidth = 1000;
    var isTouchEnabled = false;
    var touches = [];

    function setScreenWidth(width) {
        _screenWidth = width;
    }

    function determineSideOfScreen(pointX) {
        var halfPoint = _screenWidth / 2;
        if(pointX <= halfPoint){
            return 0;
        }
        else{
           return 1; 
        }
            
    }

    function shouldDisplayControl(xPos, ctrl){
        
        var side = determineSideOfScreen(xPos);
        if(side == ctrl.location)
            return true;
        else
            return false;

    }
    //Call this to enable touch testing...
    //I still don't know whether or not this will work with DirectCanvas
    //It does not work with IOSImpact
    function setUpControls(){
    
        //Check to see if Touch is Enabled...
        isTouchEnabled = 'createTouch' in document;
        //
        //If the touch events are enabled, listen for the events.
        //The controls will only draw on touch enabled browsers
        //In all other cases, you can revert to whatever control mechanism (like keyboard) that you wish to utilize
        if(isTouchEnabled) {
            var canvas = document.getElementById('canvas');
            canvas.addEventListener( 'touchstart', onTouchStart, false );
            canvas.addEventListener( 'touchmove', onTouchMove, false );
            canvas.addEventListener( 'touchend', onTouchEnd, false );
        }
    }


    //If you are using an engine for your game, you can call these functions from the game's detection engine.
    //In that case, simply don't call the seUpControls function.
    function onTouchStart(e) {
        var vector;  
        //Find out if we should be turning on a control for drawing (set shouldBeDrawn to true and set initial position)
        if(_thumbPad.touchId<0){
            for(var i = 0; i<e.changedTouches.length; i++){
                var touch = e.changedTouches[i];
                        var traslatedPos = new TraslatePos(touch);
                        if(shouldDisplayControl(traslatedPos.getX(), _thumbPad)){
                    _thumbPad.touchId = touch.identifier; 
                    _thumbPad.activate();
                    vector = new Vector();
                            vector.initializeVector(traslatedPos.getX(), traslatedPos.getY());
                    _thumbPad.updateVector(vector);
                    break;
                } 
            }  
        }
        touches = e.touches; 
    }
     
    function onTouchMove(e) {
         // Prevent the browser from doing its default thing (scroll, zoom)
        e.preventDefault();
        for(var i = 0; i<e.changedTouches.length; i++){
                var touch = e.touches[i]; 
                    if(_thumbPad.touchId == touch.identifier){
                        var vector = _thumbPad.getVector();
                        var traslatedPos = new TraslatePos(touch);
                        vector.endPoint.init(traslatedPos.getX(), traslatedPos.getY());
                        _thumbPad.updateVector(vector);
                        break;
                    }
        } 
    } 
 
    function onTouchEnd(e) { 
        touches = e.touches; 
        for(var i = 0; i<e.changedTouches.length; i++){
            var touch =e.changedTouches[i]; 
            if(_thumbPad.touchId == touch.identifier)
            {
                 _thumbPad.touchId = -1; 
                 _thumbPad.clearAll();
                break;      
            }       
        }  
    }

    function update(){
        _thumbPad.update();
    }
    return {
        setUpControls: setUpControls,
        onTouchStart: onTouchStart,
        onTouchMove: onTouchMove,
        onTouchEnd: onTouchEnd,
        setScreenWidth: setScreenWidth,
        update: update,
        thumbPad: _thumbPad
    }
}





//Simple point object to hold an x and y
Point = function(){
    //force the user to use new, if not, do it for them
    if(false === (this instanceof Point)) 
        return new Point();
    
    var _x = 0;
    var _y = 0;

    function setPoint(setX,setY) {
            _x = setX || 0;
            _y = setY || 0;
    }

    function getX(){
        return _x;
    }
    function getY() {
        return _y;
    }

    return {
        init: setPoint,
        getX: getX,
        getY: getY
    }
};

//Property bag to determining direction of the virtual stick on the thumbpad
MOVE_DIRECTIONS = function(){
    //force the user to use new, if not, do it for them
    if(false === (this instanceof MOVE_DIRECTIONS)) 
        return new MOVE_DIRECTIONS();
    
        this.LEFT = false;
        this.RIGHT = false;
        this.UP = false;
        this.DOWN = false;

    return this;

};

//information on the stick's current state
Vector = function(){
    //force the user to use new, if not, do it for them
    if(false === (this instanceof Vector))
        return new Vector();
    
        var _startPoint = new Point();
        var _endPoint = new Point;
        
        function initializeVector(initialX, initialY){
            _startPoint.init(initialX, initialY);
            _endPoint.init(initialX, initialY);
        }
        function intensityOfXDelta(){
            return Math.abs(_startPoint.getX() - _endPoint.getX());
        }

        function intensityOfYDelta(){
            return Math.abs(_startPoint.getY() - _endPoint.getY());
        }

        function getMoveDirections(){
            var movement = new MOVE_DIRECTIONS();
            var xMovement = _endPoint.getX() - _startPoint.getX();
            var yMovement = _endPoint.getY() - _startPoint.getY();

                //we subtract 13 pixels here for making the pad
                // less sensitive
                if(xMovement > 13)
                movement.RIGHT = true;
                if(xMovement < -13)
                movement.LEFT = true;
                if(yMovement < -13)
                movement.UP = true;
                if(yMovement > 13)
                movement.DOWN = true;

            return movement;
        }

    return {
        startPoint: _startPoint,
        endPoint: _endPoint,
        initializeVector: initializeVector,
        intensityOfXDelta: intensityOfXDelta,
        intensityOfYDelta: intensityOfYDelta,
        getMoveDirections: getMoveDirections
        }
};


Joypad = function(){
    //force the user to use new, if not, do it for them
    if(false === (this instanceof Joypad))
        return new Joypad();
    
        var vector = new Vector();

        this.location = 0;  //0 - LEFT SIDE  1- RIGHT SIDE
        var color = 'blue';
        var shouldBeDrawn = false;
        var context = undefined;
        this.touchId = -1;
    
        
        this.init = function(screenLocation){
            location = screenLocation || 0;
        }

        this.updateVector = function(newVector){
            vector = newVector; 
        }

        this.getVector = function(){
            return vector;
        }

        this.clearAll = function() {
                shouldBeDrawn = false;
                var reset_vector = new Vector();
                this.updateVector(reset_vector);
        }

        this.update = function() {
            if(!shouldBeDrawn)
                return;
            drawCircle(vector.startPoint.getX(),vector.startPoint.getY(),35,4);
            drawCircle(vector.startPoint.getX(),vector.startPoint.getY(),25,2);
            drawCircle(vector.endPoint.getX(),vector.endPoint.getY(),25,2);

        }

        this.setContext = function(ctx){
            context = ctx;
        }

        this.setColor = function(colorToSet){
            color = colorToSet;
        }

        this.activate = function(){
            shouldBeDrawn = true;
        }

        function drawCircle(x,y,d, thickness){
            //get a reference to the canvas
            
            if(context === undefined)
                return;

            var lineWidth = context.lineWidth;
            //draw a circle
            context.lineWidth = thickness;
            context.strokeStyle = color;
            context.beginPath();
            context.arc(x, y, d, 0, Math.PI*2, true); 
            context.closePath();
            context.stroke();   

            context.lineWidth = lineWidth;
        }

    return this;
};

//Simple position translator for when canvas has an offset
var _getX = function() {
    return this.touch.clientX - this.touch.target.offsetLeft;
};

var _getY = function() {
    return this.touch.clientY - this.touch.target.offsetTop;
};

var TraslatePos = function(touch) {
    return {
        touch: touch,
        getX : _getX,
        getY : _getY
    };
};

});
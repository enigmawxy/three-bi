// THREEx.KeyboardState.js keep the current state of the keyboard.
// It is possible to query it at any time. No need of an event.
// This is particularly convenient in loop driven case, like in
// 3D demos or games.
//
// # Usage
//
// **Step 1**: Create the object
//
// ```var keyboard	= new THREEx.KeyboardState();```
//
// **Step 2**: Query the keyboard state
//
// This will return true if shift and A are pressed, false otherwise
//
// ```keyboard.pressed("shift+A")```
//
// **Step 3**: Stop listening to the keyboard
//
// ```keyboard.destroy()```
//
// NOTE: this library may be nice as standaline. independant from three.js
// - rename it keyboardForGame
//
// # Code
//
export default class KeyboardState {
	constructor() {
		// to store the current state
		this.keyCodes	= {};
		this.modifiers	= {};
		this.MODIFIERS	= ['shift', 'ctrl', 'alt', 'meta'];
		this.ALIAS	= {
			'left'		: 37,
			'up'		: 38,
			'right'		: 39,
			'down'		: 40,
			'space'		: 32,
			'pageup'	: 33,
			'pagedown'	: 34,
			'tab'		: 9
		};
		// create callback to bind/unbind keyboard events
		var self	= this;
		this._onKeyDown	= function(event){ self._onKeyChange(event, true); };
		this._onKeyUp	= function(event){ self._onKeyChange(event, false);};

		// bind keyEvents
		document.addEventListener("keydown", this._onKeyDown, false);
		document.addEventListener("keyup", this._onKeyUp, false);
	}

	destroy() {
		// unbind keyEvents
		document.removeEventListener("keydown", this._onKeyDown, false);
		document.removeEventListener("keyup", this._onKeyUp, false);
	};
	_onKeyChange(event, pressed)
	{
		// log to debug
		//console.log("onKeyChange", event, pressed, event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey)

		// update this.keyCodes
		var keyCode		= event.keyCode;
		this.keyCodes[keyCode]	= pressed;

		// update this.modifiers
		this.modifiers['shift']= event.shiftKey;
		this.modifiers['ctrl']	= event.ctrlKey;
		this.modifiers['alt']	= event.altKey;
		this.modifiers['meta']	= event.metaKey;
	};
	pressed(keyDesc)
	{
		var keys	= keyDesc.split("+");
		for(var i = 0; i < keys.length; i++){
			var key		= keys[i];
			var pressed;
			if( this.MODIFIERS.indexOf( key ) !== -1 ){
				pressed	= this.modifiers[key];
			}else if( Object.keys(this.ALIAS).indexOf( key ) !== -1 ){
				pressed	= this.keyCodes[ this.ALIAS[key] ];
			}else {
				pressed	= this.keyCodes[key.toUpperCase().charCodeAt(0)]
			}
			if( !pressed)	return false;
		}
		return true;
	};

}
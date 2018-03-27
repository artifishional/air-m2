/**
 *
 * @param name
 * @param {Array} Array of keys range from 2 of infinity
 * every key it's object, where the current property values ​​are set
 */

/**
 * keys: [ {x: 10}, {x: 20}, {x: 30] ]
 */
function onaction({ action: [ name, { duration }, ... keys ] }) {

}

const json = {

    builder: { version: "1.0.0" },
    screen: { width: 1920, height: 1080 }, //for every nodes in this scene

    content: [ "some", //node name

        {
            screen: { width: 1920, height: 1080 }, //default is the same as that of the container
            type: "/PIXI.Sprite", //PIXI.Container as default
            model: "./rel/route",
            animations: [ // as optional
                [  "action-name", // it's identical as action name
                    { duration: "1s" },
                    //keys
                    //[ "0%" //it's default prev ]
                    [ "50%", { x: 456, y: 10, ease: "cubic"/*0-50*/ } ],
                    [ "100%", { x: 456, y: 50, ease: "linear"/*50-100*/ } ]
                ],
                [  "fade-out" /* fade-in */ , // as optional
                    { duration: "3s" },
                    //keys
                    [ "0%", { alpha: 0 } ],
                    [ "100%", { alpha: 1 } ] /* ease: "linear"  also as default  */
                ],
            ],
            interactive: {
                poinertap: { action: [ "action-name" ], static: true } //static existing in view also
            }

        },

        [ "child", { source: { path: "./some/path.json" } } ], //lazy loader

        [ "loader" ], // optional loader for this layer

        // extensible state view
        [ {state: 1}, { source: { path: "./states/1.json" } } ],
        [ {state: 2}, { source: { path: "./states/2.json" } } ],

    ]


};
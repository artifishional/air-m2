/**
 *
 * @param name
 * @param {Array} Array of keys range from 2 of infinity
 * every key it's object, where the current property values ​​are set
 */

/**
 * keys: [ {x: 10}, {x: 20}, {x: 30] ]
 */
function onaction({ action: { name, keys } }) {

}

const json = {


    content: [ "some", //name

        {
            type: "/PIXI.Sprite",
            model: "./rel/route",
            animations: [
                [  "animation-name", // it's identical as action name
                    //keys
                    { duration: "3s" },
                    //[ "0%" //it's default prev ]
                    [ "50%", { "x": { ease: "cubic", value: "",  } } ]
                ]
            ],
            onpoinertap: "actionname"

        },

        [ "child", { source: { path: "./some/path.json" } } ],

        [ {state: 1},
            {
                source: { path: "./states/1.json" },
                model: "./some/switch/"
            }
        ],
        [ {state: 2}, { source: { path: "./states/2.json" } } ]

    ]


};
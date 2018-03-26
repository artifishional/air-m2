const schema = [

    "prop-name?", { //for optional
        type: "boolean", /* default is object */
        //string
        //number
        //bool
        //regexp for string
        //array
        //array[5,10] - Range
        //array[1,] - Range
        //array[,10] - Range
        //array[10] - Range
        //[0,10] Range for int number or (0-10) for real
        //enum: like array for every properties - enum: [ array[5,10], [0,10], regexp1, regexp2 ]
        optional: true /*false*/ //as substitution ?
        //test()
    },

    ["array-prop", {type: "array"},

        //for 1 item
        ["array-prop", {type: "array"} ],
        //for 2 item
        ["array-prop", {type: "array"} ],
        //for last item
        ["array-prop", {type: "array"} ],

    ]

];
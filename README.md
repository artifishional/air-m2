# air-m2

## Plugging

the simplest plug-in has the form:

```js
import { stream } from "m2"

export default () => stream((emt, { hook }) => {

    const target = document.createElement("div");
    target.textContent = "this is a plugin";

    //when the component is fully loaded and ready to work
    emt( { action: "complete", node: { target } } );

    //controller
    hook.add( ({action}) => {
        emt( { action: `${action}-complete`,  } );
    } );

});
```

## Template engine

the simplest template component has the form:

```html

<div m2 = '["component-name", { frames: [ [ "update-action-name" ] ] }]'>

    <!-- ...other static content ...-->
    
    <span>${argv}</span>
    <span>static text ${argv.name}</span>

</div>

```

#### Reactions definition

```js
/*<div m2 = '["name", */
{ handlers: {
    onclick: "action({ key, event, options })" 
}}
/*]'></div>*/
```

where
- action - stream fallback method
- key - view-component name
- options - current view-component options
- event - system event data

###### List of supported events

- ``` "onclick" ```
- ``` "onpointermove" ```
- ``` "onpointerenter" ```
- ``` "onpointerleave" ```

## Model unit

each model is a function that returns a stream:

it is a new stream

```js
import { stream } from "m2"

export default ( { /*...args*/ } ) => 
    stream(emt => {
        emt( "something" );
    })
```
, where 
- stream - ["air-stream"](https://github.com/artifishional/air-stream) object "stream"

or an existing converted stream

```js
import { stream } from "m2"

export default ( { obtain, /*...args*/ } ) => 
    obtain("../some/existing-stream/path")
    .map( count => count + 1 )
    .controller( 
        obtain("../some/existing-stream-controller/path"),
        ({action}) => ({ action, data: "ok" })
    )
```

, where 
- obtain - method of accessing an existing model from the schema
- args - init options that were specified when accessing the stream

can be specified in the "obtain" method

```js
obtain("./path", { argv: 10 })
```

or right on the path 
```js
obtain("./path[argv=10]")
```
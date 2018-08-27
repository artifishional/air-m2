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

## View engine

#### Templates definition

```html
<div m2 = '["name"]'>

    <!-- ...other static content ...-->
    
    <span>${argv}</span>
    <span>static text ${argv.name}</span>

</div>
```

#### Actions definition

```js
/*<div m2 = '["name", */
{ frames: [
    [ "action-name", { duration: 1/*sec*/ }, 
       //key-frames 
       [0/*%*/, { rotate: 10/*deg*/ }],
       [50, { rotate: 20 }],
       [100, { rotate: 360 }]
     ],
    /*...*/
]}
/*]'></div>*/
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

#### Coupling with model

you can link your view to the model to get actions and process reactions

```js
/*<div m2 = '["aurora", */
{ model: "./path/to/model[key=aurora]" }
/*]'></div>*/
```
any relative path will be calculated relative to the parent view, which is related to the model.

you can use the constant ``` $name ``` as a parameter to pass the current name of the view to the model

```js
/*<div m2 = '["aurora", */
{ model: "./path/to/model[key=$name]" }
/*]'></div>*/
```

#### Submodules

you can use the included submodules

```html
<div m2 = '[ "submodule", { source: { path: "./m2unit/submodule_path" } } ]' > </div>
```

,where 
 - ``` path ``` - path to the module defined in m2units

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

## Paths

the simplest path has the form:

``` "./cat-a/cat-b/cat-c" ```

###### Supported options
- ``` "./cat-a" ``` - entry to the directory
- ``` "./" ``` - current directory
- ``` "../" ``` - parent directory
- ``` "./{name: abc, kind: 10}" ``` - directories with a complex name
- ``` "./cat-a[kind=10]" ``` - passing arguments
- ``` "./#component-id" ``` - search by id
